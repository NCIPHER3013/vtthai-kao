import pg from 'pg';
import schema from '../convex/schema';

export type Exec = (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;

const tableDefs: Record<string, any> = (schema as any).tables;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_COLS: Record<string, string> = {
  imageStorageId: 'image_storage_path',
  coverImageStorageId: 'cover_image_storage_path',
  slipStorageId: 'slip_storage_path',
};
const STORAGE_FIELDS = Object.fromEntries(Object.entries(STORAGE_COLS).map(([k, v]) => [v, k]));

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const pgTable = (t: string) => (t === 'orders' ? 'web_orders' : snake(t));
const colOf = (f: string) => (f === '_id' ? 'id' : f === '_creationTime' ? 'created_at' : STORAGE_COLS[f] ?? snake(f));
const fieldOf = (c: string) => (c === 'id' ? '_id' : c === 'created_at' ? '_creationTime' : STORAGE_FIELDS[c] ?? camel(c));
const q = (c: string) => `"${c.replace(/"/g, '""')}"`;

export const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const parseTs = (s: string) => Date.parse(s.replace(' ', 'T').replace(/\+00(:00)?$/, 'Z'));
pg.types.setTypeParser(1700, (s) => parseFloat(s));
pg.types.setTypeParser(20, (s) => Number(s));
pg.types.setTypeParser(1184, parseTs);
pg.types.setTypeParser(1114, (s) => parseTs(`${s}+00`));

type Col = { json: boolean; ts: boolean; generated: boolean };
const colCache = new Map<string, Map<string, Col>>();

export async function loadColumns(ex: Exec) {
  const { rows } = await ex(
    `select table_name, column_name, data_type, udt_name, is_generated from information_schema.columns where table_schema = 'public'`,
  );
  colCache.clear();
  for (const r of rows) {
    if (!colCache.has(r.table_name)) colCache.set(r.table_name, new Map());
    colCache.get(r.table_name)!.set(r.column_name, {
      json: r.udt_name === 'jsonb' || r.udt_name === 'json',
      ts: r.udt_name === 'timestamptz' || r.udt_name === 'timestamp',
      generated: r.is_generated === 'ALWAYS',
    });
  }
}

const colsOf = (table: string) => {
  const c = colCache.get(pgTable(table));
  if (!c) throw new Error(`Unknown table ${table}`);
  return c;
};

function toDoc(table: string, row: Record<string, any>) {
  const meta = colsOf(table);
  const doc: Record<string, any> = {};
  for (const [c, val] of Object.entries(row)) {
    if (val === null || val === undefined || c === 'legacy_convex_id' || meta.get(c)?.generated) continue;
    doc[fieldOf(c)] = val;
  }
  return doc;
}

function toParam(table: string, col: string, val: unknown) {
  const m = colsOf(table).get(col);
  if (val === undefined || val === null) return null;
  if (!m) throw new Error(`Unknown column ${col} on ${table}`);
  if (m.json) return JSON.stringify(val);
  if (m.ts && typeof val === 'number') return new Date(val).toISOString();
  return val;
}

type Cond = { col: string; op: string; val: unknown };
type Expr = (doc: Record<string, any>) => any;

const operand = (x: any, doc: Record<string, any>) => (typeof x === 'function' ? x(doc) : x);
const cmp = (op: (a: any, b: any) => boolean): ((a: any, b: any) => Expr) => (a, b) => (doc) => op(operand(a, doc), operand(b, doc));
const filterBuilder = {
  field: (f: string): Expr => (doc) => doc[f],
  eq: cmp((a, b) => a === b),
  neq: cmp((a, b) => a !== b),
  lt: cmp((a, b) => a < b),
  lte: cmp((a, b) => a <= b),
  gt: cmp((a, b) => a > b),
  gte: cmp((a, b) => a >= b),
  and: (...xs: Expr[]): Expr => (doc) => xs.every((x) => operand(x, doc)),
  or: (...xs: Expr[]): Expr => (doc) => xs.some((x) => operand(x, doc)),
  not: (x: Expr): Expr => (doc) => !operand(x, doc),
};

class Query {
  private conds: Cond[] = [];
  private filters: Expr[] = [];
  private orderFields: string[] = ['_creationTime'];
  private dir: 'asc' | 'desc' = 'asc';
  private words: { col: string; text: string } | null = null;

  constructor(private ex: Exec, private table: string) {}

  withIndex(name: string, fn?: (b: any) => any) {
    const def = tableDefs[this.table];
    const idx = def?.indexes?.find((i: any) => i.indexDescriptor === name);
    this.orderFields = [...(idx ? idx.fields : []), '_creationTime'];
    if (fn) {
      const t = this.table;
      const b: any = {};
      for (const [m, op] of [['eq', '='], ['gt', '>'], ['gte', '>='], ['lt', '<'], ['lte', '<=']] as const) {
        b[m] = (f: string, val: unknown) => {
          this.conds.push({ col: colOf(f), op, val: toParam(t, colOf(f), val) });
          return b;
        };
      }
      fn(b);
    }
    return this;
  }

  withSearchIndex(name: string, fn: (b: any) => any) {
    const t = this.table;
    const b: any = {
      search: (f: string, text: string) => {
        this.words = { col: colOf(f), text };
        return b;
      },
      eq: (f: string, val: unknown) => {
        this.conds.push({ col: colOf(f), op: '=', val: toParam(t, colOf(f), val) });
        return b;
      },
    };
    fn(b);
    return this;
  }

  filter(fn: (b: typeof filterBuilder) => Expr) {
    this.filters.push(fn(filterBuilder));
    return this;
  }

  order(d: 'asc' | 'desc') {
    this.dir = d;
    return this;
  }

  private async run(limit?: number) {
    const params: unknown[] = [];
    const where: string[] = [];
    for (const c of this.conds) {
      if (c.val === null || c.val === undefined) {
        where.push(c.op === '=' ? `${q(c.col)} is null` : 'false');
      } else {
        params.push(c.val);
        where.push(`${q(c.col)} ${c.op} $${params.length}`);
      }
    }
    if (this.words) {
      for (const w of this.words.text.split(/\s+/).filter(Boolean)) {
        params.push(`%${w.replace(/[\\%_]/g, '\\$&')}%`);
        where.push(`${q(this.words.col)} ilike $${params.length}`);
      }
    }
    const asc = this.dir === 'asc';
    const order = [...new Set(this.orderFields)]
      .map((f) => `${q(colOf(f))} ${asc ? 'asc nulls first' : 'desc nulls last'}`)
      .join(', ');
    const lim = limit !== undefined && this.filters.length === 0 ? ` limit ${Math.floor(limit)}` : '';
    const sql = `select * from ${q(pgTable(this.table))}${where.length ? ` where ${where.join(' and ')}` : ''} order by ${order}${lim}`;
    const { rows } = await this.ex(sql, params);
    let docs = rows.map((r) => toDoc(this.table, r));
    for (const f of this.filters) docs = docs.filter((d) => f(d));
    return limit !== undefined ? docs.slice(0, limit) : docs;
  }

  collect() {
    return this.run();
  }
  take(n: number) {
    return this.run(n);
  }
  async first() {
    return (await this.run(1))[0] ?? null;
  }
  async unique() {
    const r = await this.run(2);
    if (r.length > 1) throw new Error(`unique() query returned more than one result from table ${this.table}`);
    return r[0] ?? null;
  }
  async *[Symbol.asyncIterator]() {
    for (const d of await this.run()) yield d;
  }
}

export type StorageLister = () => Promise<Array<{ _id: string; _creationTime: number; size?: number; contentType?: string }>>;

export class Db {
  system: { query: (name: string) => { collect: () => Promise<any[]>; [Symbol.asyncIterator]: () => AsyncGenerator<any> } };

  constructor(private ex: Exec, listStorage: StorageLister) {
    this.system = {
      query: (name: string) => {
        if (name !== '_storage') throw new Error(`Unsupported system table ${name}`);
        return {
          collect: listStorage,
          async *[Symbol.asyncIterator]() {
            for (const d of await listStorage()) yield d;
          },
        };
      },
    };
  }

  query(table: string) {
    colsOf(table);
    return new Query(this.ex, table);
  }

  normalizeId(table: string, id: string) {
    colsOf(table);
    return isId(id) ? id : null;
  }

  async get(table: string, id: string) {
    if (!isId(id)) return null;
    const { rows } = await this.ex(`select * from ${q(pgTable(table))} where id = $1`, [id]);
    return rows[0] ? toDoc(table, rows[0]) : null;
  }

  async insert(table: string, doc: Record<string, any>) {
    const cols: string[] = [];
    const params: unknown[] = [];
    for (const [f, val] of Object.entries(doc)) {
      if (val === undefined || f === '_id' || f === '_creationTime') continue;
      cols.push(q(colOf(f)));
      params.push(toParam(table, colOf(f), val));
    }
    const sql = cols.length
      ? `insert into ${q(pgTable(table))} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`
      : `insert into ${q(pgTable(table))} default values returning id`;
    const { rows } = await this.ex(sql, params);
    return rows[0].id as string;
  }

  private async update(table: string, id: string, doc: Record<string, any>, replace: boolean) {
    if (!isId(id)) throw new Error(`Document not found: ${id}`);
    const sets: string[] = [];
    const params: unknown[] = [];
    const seen = new Set<string>();
    for (const [f, val] of Object.entries(doc)) {
      if (f === '_id' || f === '_creationTime') continue;
      const c = colOf(f);
      seen.add(c);
      params.push(toParam(table, c, val));
      sets.push(`${q(c)} = $${params.length}`);
    }
    if (replace) {
      for (const [c, m] of colsOf(table)) {
        if (!seen.has(c) && !m.generated && c !== 'id' && c !== 'created_at' && c !== 'legacy_convex_id') sets.push(`${q(c)} = null`);
      }
    }
    if (!sets.length) return;
    params.push(id);
    const res = await this.ex(`update ${q(pgTable(table))} set ${sets.join(', ')} where id = $${params.length}`, params);
    if (!res.rowCount) throw new Error(`Document not found: ${id}`);
  }

  patch(table: string, id: string, doc: Record<string, any>) {
    return this.update(table, id, doc, false);
  }

  replace(table: string, id: string, doc: Record<string, any>) {
    return this.update(table, id, doc, true);
  }

  async delete(table: string, id: string) {
    if (!isId(id)) return;
    await this.ex(`delete from ${q(pgTable(table))} where id = $1`, [id]);
  }
}

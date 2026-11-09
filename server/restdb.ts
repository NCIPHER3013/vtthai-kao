import { colOf, colsOf, fieldOf, filterBuilder, isId, pgTable, tableDefs, type Expr, type StorageLister } from './db';

const PAGE = 1000;

const origin = () => {
  const raw = process.env.SUPABASE_URL || '';
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
};
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const headers = (extra: Record<string, string> = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...extra });

export class RestError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${origin()}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers as any) } });
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    throw new RestError(res.status, String(body.code || ''), String(body.message || `HTTP ${res.status}`));
  }
  return res;
}

const toMs = (v: unknown) => (typeof v === 'string' ? Date.parse(v) : v);

function rowToDoc(table: string, row: Record<string, any>) {
  const meta = colsOf(table);
  const doc: Record<string, any> = {};
  for (const [c, val] of Object.entries(row)) {
    const m = meta.get(c);
    if (val === null || val === undefined || c === 'legacy_convex_id' || m?.generated) continue;
    doc[fieldOf(c)] = m?.ts ? toMs(val) : val === 'NaN' ? NaN : val;
  }
  return doc;
}

function restVal(table: string, col: string, val: unknown) {
  if (val === undefined || val === null) return null;
  const m = colsOf(table).get(col);
  if (!m) throw new Error(`Unknown column ${col} on ${table}`);
  return m.ts && typeof val === 'number' ? new Date(val).toISOString() : val;
}

type Cond = { field: string; op: '=' | '>' | '>=' | '<' | '<='; val: unknown };
const OPS: Record<Cond['op'], string> = { '=': 'eq', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' };

const nul = (v: unknown) => v === undefined || v === null;
const compare = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);

function matches(doc: Record<string, any>, conds: Cond[], words: { field: string; text: string } | null) {
  for (const c of conds) {
    const dv = doc[c.field];
    if (c.op === '=') {
      if (nul(c.val) ? !nul(dv) : dv !== c.val) return false;
      continue;
    }
    if (nul(dv) || nul(c.val)) return false;
    const r = compare(dv, c.val);
    if (c.op === '>' && !(r > 0)) return false;
    if (c.op === '>=' && !(r >= 0)) return false;
    if (c.op === '<' && !(r < 0)) return false;
    if (c.op === '<=' && !(r <= 0)) return false;
  }
  if (words) {
    const hay = String(doc[words.field] ?? '').toLowerCase();
    for (const w of words.text.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(w)) return false;
  }
  return true;
}

type Op =
  | { op: 'insert'; table: string; row: Record<string, any>; key: string }
  | { op: 'patch'; table: string; id: string; set: Record<string, any>; expect: Record<string, any>; key: string }
  | { op: 'delete'; table: string; id: string; key: string };

class RQuery {
  private conds: Cond[] = [];
  private filters: Expr[] = [];
  private orderFields: string[] = ['_creationTime'];
  private dir: 'asc' | 'desc' = 'asc';
  private words: { field: string; text: string } | null = null;

  constructor(private db: RestDb, private table: string) {}

  withIndex(name: string, fn?: (b: any) => any) {
    const idx = tableDefs[this.table]?.indexes?.find((i: any) => i.indexDescriptor === name);
    this.orderFields = [...(idx ? idx.fields : []), '_creationTime'];
    if (fn) {
      const b: any = {};
      for (const op of ['=', '>', '>=', '<', '<='] as const) {
        const name = op === '=' ? 'eq' : op === '>' ? 'gt' : op === '>=' ? 'gte' : op === '<' ? 'lt' : 'lte';
        b[name] = (f: string, val: unknown) => {
          this.conds.push({ field: f, op, val });
          return b;
        };
      }
      fn(b);
    }
    return this;
  }

  withSearchIndex(_name: string, fn: (b: any) => any) {
    const b: any = {
      search: (f: string, text: string) => {
        this.words = { field: f, text };
        return b;
      },
      eq: (f: string, val: unknown) => {
        this.conds.push({ field: f, op: '=', val });
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

  private async fetchRows(limit: number | undefined) {
    const params = new URLSearchParams();
    params.set('select', '*');
    for (const c of this.conds) {
      const col = colOf(c.field);
      const v = restVal(this.table, col, c.val);
      if (v === null) {
        if (c.op === '=') params.append(col, 'is.null');
        else return [];
      } else {
        params.append(col, `${OPS[c.op]}.${String(v)}`);
      }
    }
    if (this.words) {
      const col = colOf(this.words.field);
      for (const w of this.words.text.split(/\s+/).filter(Boolean)) params.append(col, `ilike.*${w.replace(/[*,()%]/g, '')}*`);
    }
    const asc = this.dir === 'asc';
    params.set(
      'order',
      [...new Set(this.orderFields)].map((f) => `${colOf(f)}.${asc ? 'asc.nullsfirst' : 'desc.nullslast'}`).join(','),
    );
    const rows: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const want = limit !== undefined ? Math.min(PAGE, limit - rows.length) : PAGE;
      if (want <= 0) break;
      const res = await rest(`${pgTable(this.table)}?${params.toString()}`, {
        headers: { 'Range-Unit': 'items', Range: `${from}-${from + want - 1}` },
      });
      const page = (await res.json()) as any[];
      rows.push(...page);
      if (page.length < want) break;
    }
    return rows;
  }

  private async run(limit?: number) {
    const touched = this.db.touchedKeys(this.table);
    const needAll = touched.size > 0 || this.filters.length > 0;
    const rows = await this.fetchRows(needAll ? undefined : limit);
    let docs: Array<Record<string, any>> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const d = rowToDoc(this.table, row);
      const k = this.db.keyOf(this.table, d._id);
      this.db.remember(k, d);
      seen.add(k);
      if (this.db.pending.has(k)) {
        const p = this.db.pending.get(k);
        if (p && matches(p, this.conds, this.words)) docs.push(p);
      } else {
        docs.push(d);
      }
    }
    for (const k of touched) {
      if (seen.has(k)) continue;
      const p = this.db.pending.get(k);
      if (p && matches(p, this.conds, this.words)) docs.push(p);
    }
    if (touched.size > 0) {
      const sign = this.dir === 'asc' ? 1 : -1;
      docs.sort((a, b) => {
        for (const f of this.orderFields) {
          const x = a[f];
          const y = b[f];
          const r = nul(x) && nul(y) ? 0 : nul(x) ? -1 : nul(y) ? 1 : compare(x, y);
          if (r) return r * sign;
        }
        return 0;
      });
    }
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

/**
 * ctx.db over Supabase REST (HTTPS). Reads go straight to PostgREST. In a mutation, writes are buffered with
 * read-your-writes and sent at commit as ONE transaction (apply_ops) that also verifies the values we read for every
 * patched field are unchanged; otherwise the mutation is re-run (optimistic concurrency, like Convex itself).
 */
export class RestDb {
  pending = new Map<string, Record<string, any> | null>();
  private originDocs = new Map<string, Record<string, any>>();
  private ops: Op[] = [];
  private inserted = new Set<string>();
  private touched = new Map<string, Set<string>>();
  system: { query: (name: string) => { collect: () => Promise<any[]>; [Symbol.asyncIterator]: () => AsyncGenerator<any> } };

  constructor(private buffered: boolean, listStorage: StorageLister) {
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

  keyOf(table: string, id: string) {
    return `${table}:${id}`;
  }
  remember(k: string, doc: Record<string, any>) {
    if (!this.originDocs.has(k)) this.originDocs.set(k, doc);
  }
  touchedKeys(table: string) {
    return this.touched.get(table) ?? new Set<string>();
  }
  private touch(table: string, k: string) {
    if (!this.touched.has(table)) this.touched.set(table, new Set());
    this.touched.get(table)!.add(k);
  }
  private needWrite() {
    if (!this.buffered) throw new Error('Cannot write inside a query');
  }

  query(table: string) {
    colsOf(table);
    return new RQuery(this, table);
  }

  normalizeId(table: string, id: string) {
    colsOf(table);
    return isId(id) ? id : null;
  }

  private async fetchOne(table: string, id: string) {
    const res = await rest(`${pgTable(table)}?select=*&id=eq.${id}&limit=1`);
    const rows = (await res.json()) as any[];
    if (!rows[0]) return null;
    const doc = rowToDoc(table, rows[0]);
    this.remember(this.keyOf(table, id), doc);
    return doc;
  }

  async get(table: string, id: string) {
    if (!isId(id)) return null;
    const k = this.keyOf(table, id);
    if (this.pending.has(k)) return this.pending.get(k) ?? null;
    return this.fetchOne(table, id);
  }

  async insert(table: string, doc: Record<string, any>) {
    this.needWrite();
    const meta = colsOf(table);
    const id = crypto.randomUUID();
    const created = Date.now();
    const row: Record<string, any> = { id, created_at: new Date(created).toISOString() };
    const stored: Record<string, any> = { _id: id, _creationTime: created };
    for (const [f, val] of Object.entries(doc)) {
      if (val === undefined || f === '_id' || f === '_creationTime') continue;
      const col = colOf(f);
      if (!meta.has(col)) throw new Error(`Unknown column ${col} on ${table}`);
      row[col] = restVal(table, col, val);
      stored[f] = val;
    }
    const k = this.keyOf(table, id);
    this.pending.set(k, stored);
    this.touch(table, k);
    this.inserted.add(k);
    this.ops.push({ op: 'insert', table: pgTable(table), row, key: k });
    return id;
  }

  private async update(table: string, id: string, partial: Record<string, any>) {
    this.needWrite();
    if (!isId(id)) throw new Error(`Document not found: ${id}`);
    const meta = colsOf(table);
    const k = this.keyOf(table, id);
    const base = this.pending.has(k) ? this.pending.get(k) : await this.fetchOne(table, id);
    if (!base) throw new Error(`Document not found: ${id}`);
    const originDoc = this.originDocs.get(k);
    const fresh = this.inserted.has(k);
    const set: Record<string, any> = {};
    const expect: Record<string, any> = {};
    const next = { ...base };
    for (const [f, val] of Object.entries(partial)) {
      if (f === '_id' || f === '_creationTime') continue;
      const col = colOf(f);
      const m = meta.get(col);
      if (!m) throw new Error(`Unknown column ${col} on ${table}`);
      if (val === undefined) {
        delete next[f];
        set[col] = null;
      } else {
        next[f] = val;
        set[col] = restVal(table, col, val);
      }
      if (!fresh && !m.ts) expect[col] = originDoc ? restVal(table, col, originDoc[f] ?? null) : null;
    }
    this.pending.set(k, next);
    this.touch(table, k);
    const existing = this.ops.find((o) => o.key === k && (o.op === 'insert' || o.op === 'patch'));
    if (existing && existing.op === 'insert') {
      Object.assign(existing.row, set);
    } else if (existing && existing.op === 'patch') {
      Object.assign(existing.set, set);
      for (const [c, v] of Object.entries(expect)) if (!(c in existing.expect)) existing.expect[c] = v;
    } else {
      this.ops.push({ op: 'patch', table: pgTable(table), id, set, expect, key: k });
    }
  }

  patch(table: string, id: string, partial: Record<string, any>) {
    return this.update(table, id, partial);
  }

  async replace(table: string, id: string, doc: Record<string, any>) {
    const base = await this.get(table, id);
    if (!base) throw new Error(`Document not found: ${id}`);
    const partial: Record<string, any> = {};
    for (const f of Object.keys(base)) if (f !== '_id' && f !== '_creationTime' && !(f in doc)) partial[f] = undefined;
    await this.update(table, id, { ...partial, ...doc });
  }

  async delete(table: string, id: string) {
    this.needWrite();
    if (!isId(id)) return;
    const k = this.keyOf(table, id);
    const wasInserted = this.inserted.has(k);
    this.ops = this.ops.filter((o) => o.key !== k);
    this.pending.set(k, null);
    this.touch(table, k);
    if (wasInserted) {
      this.inserted.delete(k);
      return;
    }
    this.ops.push({ op: 'delete', table: pgTable(table), id, key: k });
  }

  async commit() {
    if (!this.ops.length) return;
    const ops = this.ops.map(({ key: _k, ...rest }) => rest);
    await rest('rpc/apply_ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    });
  }
}

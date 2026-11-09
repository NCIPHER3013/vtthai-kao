import { getFunctionName } from 'convex/server';
import pg from 'pg';
import { COLUMNS } from './columns';
import { Db, loadColumns, setColumns, type Exec } from './db';
import { registry } from './registry';
import { RestDb, RestError } from './restdb';
import { listObjects, storage } from './storage';

export type Conn = { query: Exec; release: () => void | Promise<void> };
type Connector = () => Promise<Conn>;

let pool: pg.Pool | null = null;
let columnsReady: Promise<void> | null = null;

const dbUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL (Supabase Postgres connection string)');
  return url;
};
const sslFor = (url: string) =>
  process.env.DATABASE_SSL === 'false' || /@(localhost|127\.0\.0\.1)/.test(url) ? undefined : { rejectUnauthorized: false };

const poolConnector: Connector = async () => {
  if (!pool) {
    const url = dbUrl();
    pool = new pg.Pool({ connectionString: url, ssl: sslFor(url), max: Number(process.env.DATABASE_POOL_MAX || 10), options: '-c timezone=UTC' });
  }
  const client = await pool.connect();
  return { query: (sql, params) => client.query(sql, params as any[]) as any, release: () => client.release() };
};

/** One short-lived connection per call: required on Cloudflare Workers, where sockets cannot outlive a request. */
export const perRequestConnector: Connector = async () => {
  const url = dbUrl();
  const client = new pg.Client({ connectionString: url, ssl: sslFor(url), options: '-c timezone=UTC' });
  await client.connect();
  return { query: (sql, params) => client.query(sql, params as any[]) as any, release: () => client.end() };
};

let driver: 'pg' | 'rest' = process.env.DB_DRIVER === 'rest' ? 'rest' : 'pg';
export function setDriver(d: 'pg' | 'rest') {
  driver = d;
}

let connect: Connector = poolConnector;
export function setConnector(c: Connector) {
  connect = c;
  columnsReady = null;
}

async function ready() {
  if (driver === 'rest') {
    setColumns(COLUMNS);
    return;
  }
  if (!columnsReady) {
    columnsReady = (async () => {
      const c = await connect();
      try {
        await loadColumns(c.query);
      } finally {
        await c.release();
      }
    })();
    columnsReady.catch(() => {
      columnsReady = null;
    });
  }
  await columnsReady;
}

export async function init() {
  await ready();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function inTx<T>(fn: (ex: Exec) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const conn = await connect();
    try {
      await conn.query('begin isolation level serializable');
      const out = await fn(conn.query);
      await conn.query('commit');
      return out;
    } catch (e: any) {
      try {
        await conn.query('rollback');
      } catch {}
      if ((e?.code === '40001' || e?.code === '40P01') && attempt < 6) {
        await sleep(15 * 2 ** attempt + Math.random() * 20);
        continue;
      }
      throw e;
    } finally {
      await conn.release();
    }
  }
}

const nameOf = (ref: unknown) => (typeof ref === 'string' ? ref : getFunctionName(ref as any));

export async function call(name: string, args: Record<string, unknown> = {}, opts: { external?: boolean } = {}): Promise<any> {
  const fn = registry.get(name);
  if (!fn || (opts.external && fn.internal)) throw new Error(`Unknown function ${name}`);

  if (fn.kind === 'action') {
    const ctx = {
      storage,
      runQuery: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
      runMutation: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
      runAction: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
    };
    return fn.handler(ctx, args);
  }

  await ready();

  if (driver === 'rest') {
    if (fn.kind === 'query') return fn.handler({ db: new RestDb(false, listObjects), storage }, args);
    for (let attempt = 0; ; attempt++) {
      const db = new RestDb(true, listObjects);
      const ctx: any = {
        db,
        storage,
        runQuery: (ref: unknown, a: any) => {
          const target = registry.get(nameOf(ref));
          if (!target) throw new Error(`Unknown function ${nameOf(ref)}`);
          return target.handler(ctx, a ?? {});
        },
      };
      try {
        const out = await fn.handler(ctx, args);
        await db.commit();
        return out;
      } catch (e: any) {
        if (e instanceof RestError && (e.code === 'PT409' || e.code === '23505' || e.code === '40001') && attempt < 4) {
          await sleep(20 * 2 ** attempt + Math.random() * 30);
          continue;
        }
        throw e;
      }
    }
  }

  if (fn.kind === 'query') {
    const conn = await connect();
    try {
      return await fn.handler({ db: new Db(conn.query, listObjects), storage }, args);
    } finally {
      await conn.release();
    }
  }

  return inTx(async (ex) => {
    const ctx: any = {
      db: new Db(ex, listObjects),
      storage,
      runQuery: (ref: unknown, a: any) => {
        const target = registry.get(nameOf(ref));
        if (!target) throw new Error(`Unknown function ${nameOf(ref)}`);
        return target.handler(ctx, a ?? {});
      },
    };
    return fn.handler(ctx, args);
  });
}

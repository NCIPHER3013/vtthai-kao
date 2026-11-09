import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getFunctionName } from 'convex/server';
import pg from 'pg';
import { Db, loadColumns, type Exec } from './db';
import { listObjects, storage } from './storage';
import type { Registered } from './wrappers';

const SKIP = new Set(['schema', 'posSchema', 'posLib']);
const registry = new Map<string, Registered>();
let pool: pg.Pool | null = null;

export function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL (Supabase Postgres connection string)');
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  const ssl = process.env.DATABASE_SSL === 'false' || local ? undefined : { rejectUnauthorized: false };
  pool = new pg.Pool({ connectionString: url, ssl, max: Number(process.env.DATABASE_POOL_MAX || 10), options: '-c timezone=UTC' });
  return pool;
}

export function setPool(p: pg.Pool) {
  pool = p;
}

export async function init() {
  const dir = join(process.cwd(), 'convex');
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
    const mod = file.slice(0, -3);
    if (SKIP.has(mod)) continue;
    const exports = await import(pathToFileURL(join(dir, file)).href);
    for (const [name, val] of Object.entries<any>(exports)) {
      if (val && val.__fn) registry.set(`${mod}:${name}`, val);
    }
  }
  await loadColumns(poolExec);
}

const poolExec: Exec = (sql, params) => getPool().query(sql, params as any[]) as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function inTx<T>(fn: (ex: Exec) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const client = await getPool().connect();
    try {
      await client.query('begin isolation level serializable');
      const out = await fn((sql, params) => client.query(sql, params as any[]) as any);
      await client.query('commit');
      return out;
    } catch (e: any) {
      try {
        await client.query('rollback');
      } catch {}
      if ((e?.code === '40001' || e?.code === '40P01') && attempt < 6) {
        await sleep(15 * 2 ** attempt + Math.random() * 20);
        continue;
      }
      throw e;
    } finally {
      client.release();
    }
  }
}

const nameOf = (ref: unknown) => (typeof ref === 'string' ? ref : getFunctionName(ref as any));

export async function call(name: string, args: Record<string, unknown> = {}, opts: { external?: boolean } = {}): Promise<any> {
  const fn = registry.get(name);
  if (!fn || (opts.external && fn.internal)) throw new Error(`Unknown function ${name}`);

  if (fn.kind === 'query') {
    return fn.handler({ db: new Db(poolExec, listObjects), storage }, args);
  }

  if (fn.kind === 'mutation') {
    return inTx(async (ex) => {
      const db = new Db(ex, listObjects);
      const ctx: any = {
        db,
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

  const ctx = {
    storage,
    runQuery: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
    runMutation: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
    runAction: (ref: unknown, a: any) => call(nameOf(ref), a ?? {}),
  };
  return fn.handler(ctx, args);
}

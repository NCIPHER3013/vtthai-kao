import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { handle } from './index';
import { PGlite } from '@electric-sql/pglite';
import schema from '../convex/schema';
import { Db, loadColumns, pgTable } from './db';
import { call, init, setPool } from './runtime';
import { hashPin } from '../convex/posLib';

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const STORAGE: Record<string, string> = { imageStorageId: 'image_storage_path', coverImageStorageId: 'cover_image_storage_path', slipStorageId: 'slip_storage_path' };

let failed = 0;
const check = (name: string, ok: boolean, extra?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra)}`}`);
};

async function main() {
  const db = new PGlite();
  const ddl = readFileSync('supabase/schema.sql', 'utf8')
    .replace('create extension if not exists pgcrypto;', 'create schema if not exists storage; create table if not exists storage.buckets (id text primary key, name text, public boolean);');
  await db.exec(ddl);

  const parsers = { 1700: (s: string) => parseFloat(s), 20: (s: string) => Number(s), 1184: (s: string) => Date.parse(s) };
  const exec = (sql: string, params?: unknown[]) => db.query(sql, params as any[], { parsers } as any) as any;
  const client = { query: exec, release() {} };
  setPool({ query: exec, connect: async () => client } as any);
  await init();
  await loadColumns(exec);

  const cols = await db.query<{ table_name: string; column_name: string }>(`select table_name, column_name from information_schema.columns where table_schema='public'`);
  const have = new Set(cols.rows.map((r) => `${r.table_name}.${r.column_name}`));
  const missing: string[] = [];
  for (const [t, def] of Object.entries<any>((schema as any).tables)) {
    for (const f of Object.keys(def.validator.fields)) {
      const c = STORAGE[f] ?? snake(f);
      if (!have.has(`${pgTable(t)}.${c}`)) missing.push(`${t}.${f} -> ${pgTable(t)}.${c}`);
    }
  }
  check('every Convex field has a Postgres column', missing.length === 0, missing);

  const raw = new Db(exec, async () => []);
  const catId = await raw.insert('menuCategories', { name: 'Rice', sortOrder: 1 });
  const menuId = await raw.insert('menus', {
    title: 'Tom Yum Fried Rice', category: 'Rice', heat: 'Medium', available: true, sortOrder: 5,
    imageStorageId: 'abc.webp', prices: { takeaway: 20, dineIn: 21, delivery: 25 },
    tags: ['spicy'], variants: [{ label: 'Chicken', prices: { takeaway: 1, dineIn: 2, delivery: 3 } }],
  });
  const m = await raw.get('menus', menuId);
  check('doc round trip (json, array, storage id, numeric)', m?.prices?.dineIn === 21 && m.tags?.[0] === 'spicy' && m.imageStorageId === 'abc.webp' && m.sortOrder === 5 && typeof m._creationTime === 'number', m);

  await raw.patch('menus', menuId, { featured: true, description: undefined });
  const byFeatured = await raw.query('menus').withIndex('by_featured', (q: any) => q.eq('featured', true)).collect();
  check('patch + withIndex eq', byFeatured.length === 1);
  const byCat = await raw.query('menus').withIndex('by_category_and_available', (q: any) => q.eq('category', 'Rice').eq('available', true)).first();
  check('compound index', byCat?._id === menuId);
  const filtered = await raw.query('menus').filter((q: any) => q.eq(q.field('imageStorageId'), 'abc.webp')).collect();
  check('filter expression', filtered.length === 1);
  const search = await raw.query('menus').withSearchIndex('search_menu', (q: any) => q.search('title', 'tom yum').eq('available', true)).take(5);
  check('search index', search.length === 1);

  const listed = await call('menus:listAll', {}, { external: true });
  check('menus:listAll', Array.isArray(listed) && listed.length === 1 && String(listed[0].storageImageUrl).includes('abc.webp'), listed);

  await raw.insert('siteInfo', { key: 'admin_pin', value: 'secret' });
  const bad = await call('posAuth:loginAdmin', { password: 'nope' }, { external: true });
  const good = await call('posAuth:loginAdmin', { password: 'secret' }, { external: true });
  check('admin login', bad === null && good?.role === 'ADMIN' && !!good.token, good);
  const who = await call('posAuth:whoami', { token: good.token }, { external: true });
  check('session whoami', who?.role === 'ADMIN', who);

  await raw.insert('staffPins', { name: 'Kao', pinHash: await hashPin('1234'), role: 'CASHIER' });
  const staff = await call('posAuth:loginPin', { pin: '1234' }, { external: true });
  check('pin login', staff?.role === 'CASHIER' && staff.name === 'Kao', staff);
  await call('posAuth:logout', { token: staff.token }, { external: true });
  const after = await call('posAuth:whoami', { token: staff.token }, { external: true });
  check('logout deletes session', after === null, after);

  const flourId = await raw.insert('stockItems', { name: 'Rice', unit: 'g', currentStock: 1000, costPerUnit: 0.01 });
  await raw.insert('recipes', { menuId, stockItemId: flourId, quantity: 200 });
  const shiftId = await raw.insert('shifts', { startedAt: Date.now(), startingCash: 100, totalSales: 0, status: 'open' });
  const cashier = await call('posAuth:loginPin', { pin: '1234' }, { external: true });
  const orderId = crypto.randomUUID();
  const placed = await call('posOrders:processOrder', {
    token: cashier.token, orderId, subtotal: 42, tax: 4.2, total: 46.2, paymentMethod: 'cash', orderType: 'dine_in', shiftId,
    items: [{ product_id: menuId, quantity: 2 }],
  }, { external: true });
  const stockAfter = await raw.get('stockItems', flourId);
  const shiftAfter = await raw.get('shifts', shiftId);
  const items = await raw.query('posOrderItems').collect();
  check('processOrder places order', placed?.[0]?.order_id === orderId && items.length === 1 && items[0].quantity === 2, { placed, items });
  check('stock deducted atomically', stockAfter?.currentStock === 600, stockAfter);
  check('shift sales bumped', shiftAfter?.totalSales === 46.2, shiftAfter);
  const fetched = await call('posOrders:getOrder', { token: cashier.token, id: orderId }, { external: true });
  check('getOrder returns order', !!fetched, fetched);

  const server = createServer(handle);
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as any).port;
  const http = await fetch(`http://localhost:${port}/rpc`, { method: 'POST', body: JSON.stringify({ name: 'posAuth:whoami', args: { token: cashier.token } }) }).then((r) => r.json());
  check('http /rpc works', http?.value?.role === 'CASHIER', http);
  const denied = await fetch(`http://localhost:${port}/rpc`, { method: 'POST', body: JSON.stringify({ name: 'posOrders:getOrder', args: { id: orderId } }) });
  const deniedBody: any = await denied.json();
  check('http /rpc rejects missing token', denied.status === 400 && /UNAUTHORIZED/.test(deniedBody.error), deniedBody);
  const up = await fetch(`http://localhost:${port}/upload?exp=1&sig=x`, { method: 'POST', body: 'x' });
  check('upload rejects bad signature', up.status === 403);
  server.close();

  let rolled = false;
  try {
    await call('posAuth:whoami', { token: good.token }, { external: true });
    await call('nope:nothing', {}, { external: true });
  } catch {
    rolled = true;
  }
  check('unknown function rejected', rolled);

  console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

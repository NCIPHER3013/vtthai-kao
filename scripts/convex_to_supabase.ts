import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Spec = { convex: string; pg: string; fk?: Record<string, string>; ts?: string[] };

const SPECS: Spec[] = [
  { convex: 'menuCategories', pg: 'menu_categories' },
  { convex: 'menus', pg: 'menus' },
  { convex: 'promotions', pg: 'promotions', ts: ['startDate', 'endDate'] },
  { convex: 'orders', pg: 'web_orders' },
  { convex: 'reservations', pg: 'reservations' },
  { convex: 'contacts', pg: 'contacts' },
  { convex: 'siteInfo', pg: 'site_info' },
  { convex: 'blogPosts', pg: 'blog_posts', ts: ['publishedAt'] },
  { convex: 'seoSettings', pg: 'seo_settings' },
  { convex: 'trackingCodes', pg: 'tracking_codes' },
  { convex: 'locations', pg: 'locations' },
  { convex: 'posSettings', pg: 'pos_settings', fk: { locationId: 'locations' } },
  { convex: 'staffPins', pg: 'staff_pins', fk: { locationId: 'locations' } },
  { convex: 'restaurantTables', pg: 'restaurant_tables', fk: { locationId: 'locations' } },
  { convex: 'inventoryCategories', pg: 'inventory_categories' },
  { convex: 'stockItems', pg: 'stock_items', fk: { locationId: 'locations' } },
  { convex: 'suppliers', pg: 'suppliers' },
  { convex: 'itemSuppliers', pg: 'item_suppliers', fk: { itemId: 'stockItems', supplierId: 'suppliers' } },
  { convex: 'recipes', pg: 'recipes', fk: { menuId: 'menus', stockItemId: 'stockItems' } },
  { convex: 'subRecipeIngredients', pg: 'sub_recipe_ingredients', fk: { parentItemId: 'stockItems', childItemId: 'stockItems' } },
  { convex: 'inventoryLedger', pg: 'inventory_ledger', fk: { stockItemId: 'stockItems', locationId: 'locations' } },
  { convex: 'wasteLog', pg: 'waste_log', fk: { stockItemId: 'stockItems', locationId: 'locations', recordedBy: 'staffPins' }, ts: ['recordedAt'] },
  { convex: 'purchaseOrders', pg: 'purchase_orders', fk: { supplierId: 'suppliers', receivedBy: 'staffPins' }, ts: ['receivedAt'] },
  { convex: 'purchaseOrderItems', pg: 'purchase_order_items', fk: { poId: 'purchaseOrders', stockItemId: 'stockItems' } },
  { convex: 'stocktakes', pg: 'stocktakes', ts: ['startedAt', 'completedAt'] },
  { convex: 'stocktakeItems', pg: 'stocktake_items', fk: { stocktakeId: 'stocktakes', stockItemId: 'stockItems' } },
  { convex: 'shifts', pg: 'shifts', fk: { openedByStaff: 'staffPins', closedByStaff: 'staffPins', locationId: 'locations' }, ts: ['startedAt', 'endedAt'] },
  { convex: 'customers', pg: 'customers', ts: ['lastVisit'] },
  {
    convex: 'posOrders',
    pg: 'pos_orders',
    fk: { shiftId: 'shifts', customerId: 'customers', locationId: 'locations', staffId: 'staffPins', tableId: 'restaurantTables' },
    ts: ['timestamp', 'scheduledFor'],
  },
  { convex: 'posOrderItems', pg: 'pos_order_items', fk: { orderId: 'posOrders', menuId: 'menus' } },
  { convex: 'tableSessions', pg: 'table_sessions', fk: { tableId: 'restaurantTables', orderId: 'posOrders' }, ts: ['expiresAt', 'lastActivityAt'] },
  { convex: 'paymentTransactions', pg: 'payment_transactions', fk: { orderId: 'posOrders' }, ts: ['processedAt'] },
  { convex: 'loyaltyTransactions', pg: 'loyalty_transactions', fk: { customerId: 'customers', orderId: 'posOrders' } },
  { convex: 'giftCards', pg: 'gift_cards', fk: { customerId: 'customers' }, ts: ['expiresAt'] },
  { convex: 'giftCardTransactions', pg: 'gift_card_transactions', fk: { giftCardId: 'giftCards', orderId: 'posOrders' } },
  { convex: 'expenses', pg: 'expenses', fk: { locationId: 'locations' } },
];

const STORAGE_FIELDS: Record<string, string> = {
  imageStorageId: 'image_storage_path',
  coverImageStorageId: 'cover_image_storage_path',
  slipStorageId: 'slip_storage_path',
};

const SKIPPED = ['authSessions'];
const NAMESPACE = 'b3c1f0a2-6d4e-4a57-9a1b-7f2c5e8d9a10';
const BUCKET = 'media';
const BATCH = 200;
const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const srcArg = args.find((a) => a.startsWith('--src='));
const src = resolve(srcArg ? srcArg.slice(6) : 'backups/2026-10-19/extracted');
const supabaseUrl = (() => {
  const raw = process.env.SUPABASE_URL || '';
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
})();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const uuidv5 = (name: string): string => {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(ns).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const readJsonl = (file: string): any[] =>
  existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l))
    : [];

const headers = (extra: Record<string, string> = {}) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  ...extra,
});

async function main() {
  if (!existsSync(src)) throw new Error(`Source folder not found: ${src}`);
  if (apply && (!supabaseUrl || !serviceKey)) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

  const present = readdirSync(src).filter((d) => existsSync(join(src, d, 'documents.jsonl')));
  const known = new Set(SPECS.map((s) => s.convex).concat(SKIPPED, ['_storage', '_tables', 'numbers']));
  const unknown = present.filter((d) => !known.has(d));
  if (unknown.length) console.warn(`WARNING tables in backup with no mapping (NOT migrated): ${unknown.join(', ')}`);

  const idMap = new Map<string, string>();
  const docs = new Map<string, any[]>();
  for (const spec of SPECS) {
    const rows = readJsonl(join(src, spec.convex, 'documents.jsonl'));
    docs.set(spec.convex, rows);
    for (const r of rows) idMap.set(r._id, uuidv5(r._id));
  }

  const storageDocs = readJsonl(join(src, '_storage', 'documents.jsonl'));
  const storageDir = join(src, '_storage');
  const onDisk = new Map<string, string>();
  for (const f of existsSync(storageDir) ? readdirSync(storageDir) : []) {
    if (f !== 'documents.jsonl') onDisk.set(f.replace(/\.[^.]+$/, ''), f);
  }
  const storagePath = new Map<string, string>();
  const missingFiles: string[] = [];
  for (const d of storageDocs) {
    const file = onDisk.get(d._id);
    if (!file) {
      missingFiles.push(d._id);
      continue;
    }
    const ext = file.includes('.') ? file.split('.').pop()! : EXT[d.contentType] || 'bin';
    storagePath.set(d._id, `${d._id}.${ext}`);
  }

  const deep = (v: any): any => {
    if (typeof v === 'string') return idMap.get(v) ?? storagePath.get(v) ?? v;
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]));
    return v;
  };

  const problems: string[] = [];
  const out = new Map<string, any[]>();
  for (const spec of SPECS) {
    const rows: any[] = [];
    for (const doc of docs.get(spec.convex) || []) {
      const row: Record<string, any> = {
        id: idMap.get(doc._id),
        legacy_convex_id: doc._id,
        created_at: new Date(Math.floor(doc._creationTime)).toISOString(),
      };
      for (const [k, val] of Object.entries(doc)) {
        if (k === '_id' || k === '_creationTime') continue;
        if (val === null || val === undefined) continue;
        if (STORAGE_FIELDS[k]) {
          const p = storagePath.get(val as string);
          if (!p) problems.push(`${spec.convex}.${k} ${doc._id}: storage file ${val} not in backup`);
          row[STORAGE_FIELDS[k]] = p ?? null;
        } else if (spec.fk?.[k]) {
          const target = idMap.get(val as string);
          if (!target) problems.push(`${spec.convex}.${k} ${doc._id}: parent ${val} (${spec.fk[k]}) not in backup`);
          row[snake(k)] = target ?? null;
        } else if (spec.ts?.includes(k)) {
          row[snake(k)] = new Date(val as number).toISOString();
        } else {
          row[snake(k)] = deep(val);
        }
      }
      rows.push(row);
    }
    const cols = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) cols.add(k);
    for (const r of rows) for (const c of cols) if (!(c in r)) r[c] = null;
    out.set(spec.pg, rows);
  }

  console.log(`Source: ${src}`);
  console.log(`Storage files: ${storagePath.size}/${storageDocs.length} found on disk`);
  for (const spec of SPECS) {
    const n = out.get(spec.pg)!.length;
    if (n || (docs.get(spec.convex) || []).length) console.log(`  ${spec.convex.padEnd(22)} -> ${spec.pg.padEnd(24)} ${n}`);
  }
  const posKeyTables = ['stockItems', 'staffPins', 'posOrders', 'shifts', 'customers', 'recipes'];
  const empty = SPECS.filter((s) => posKeyTables.includes(s.convex) && !(docs.get(s.convex) || []).length);
  if (empty.length) console.warn(`WARNING no rows for POS tables: ${empty.map((s) => s.convex).join(', ')} (this backup may predate the POS data)`);
  if (missingFiles.length) console.warn(`WARNING ${missingFiles.length} storage ids listed but file missing on disk`);
  if (problems.length) {
    console.warn(`WARNING ${problems.length} reference problems:`);
    for (const p of problems.slice(0, 30)) console.warn(`  ${p}`);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply (and SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) to load.');
    return;
  }

  let uploaded = 0;
  for (const [sid, p] of storagePath) {
    const meta = storageDocs.find((d) => d._id === sid);
    const body = readFileSync(join(storageDir, onDisk.get(sid)!));
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${p}`, {
      method: 'POST',
      headers: headers({ 'Content-Type': meta?.contentType || 'application/octet-stream', 'x-upsert': 'true' }),
      body,
    });
    if (!res.ok) throw new Error(`Upload ${p} failed: ${res.status} ${await res.text()}`);
    uploaded++;
    if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${storagePath.size}`);
  }
  console.log(`Uploaded ${uploaded} files to bucket "${BUCKET}"`);

  for (const spec of SPECS) {
    const rows = out.get(spec.pg)!;
    for (let i = 0; i < rows.length; i += BATCH) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${spec.pg}?on_conflict=legacy_convex_id`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(rows.slice(i, i + BATCH)),
      });
      if (!res.ok) throw new Error(`Insert ${spec.pg} failed: ${res.status} ${await res.text()}`);
    }
  }

  let bad = 0;
  for (const spec of SPECS) {
    const expected = out.get(spec.pg)!.length;
    const res = await fetch(`${supabaseUrl}/rest/v1/${spec.pg}?select=id`, {
      headers: headers({ Prefer: 'count=exact', Range: '0-0' }),
    });
    const total = Number((res.headers.get('content-range') || '').split('/')[1]);
    const ok = total >= expected;
    if (!ok) bad++;
    if (expected || total) console.log(`  ${ok ? 'OK ' : 'BAD'} ${spec.pg.padEnd(24)} expected ${expected}, in DB ${total}`);
  }
  if (bad) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

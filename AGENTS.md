# Hampton Park Thai Halal Restaurant - AGENTS.md

## Commands

- `npm run dev` — dev server on port 3000 (0.0.0.0)
- `npm run build` — production build via Vite
- `npm run lint` — **typecheck only** (`tsc --noEmit`), no formatter. **Type-checks ALL `.ts`/`.tsx` in the repo** including root scripts, `src/migrate_*.ts`, `src/seed_*.ts`, and `scratch/`. Run after every code change.
- `npm run preview` / `npm run clean` — preview production build / remove dist

Standalone scripts: `npx tsx <file>` (e.g., `npx tsx src/scripts/seed_from_excel.ts`). Not part of build pipeline.

## Architecture

React 19 + TypeScript + Vite SPA. POS system for restaurants/cafes.

- **Backend**: Supabase Postgres + Supabase Storage (bucket `media`), reached only through our own API server (`server/`, `npm run server`, port 8787). The browser never talks to Supabase directly and holds no Supabase keys.
  - `convex/*.ts` is the server business logic (queries/mutations, same code as the old Convex backend). `server/runtime.ts` + `server/db.ts` run it on Postgres: `ctx.db` is a shim over `pg` (schema in `supabase/schema.sql`, camelCase field <-> snake_case column, `*StorageId` <-> `*_storage_path`). Mutations run in SERIALIZABLE transactions with retry.
  - `server/index.ts` exposes `POST /rpc {name,args}`, `POST /upload` (signed URL from `ctx.storage.generateUploadUrl`) and `/storage/*` (local-disk fallback when `SUPABASE_URL` is unset). Dev: `npm run dev` runs API + Vite, Vite proxies `/rpc`, `/upload`, `/storage`.
  - Two DB drivers behind the same `ctx.db`: `pg` (Node, `server/db.ts`, real SERIALIZABLE transactions, used by `npm run dev`/`npm run server`) and `rest` (Cloudflare Worker, `server/restdb.ts`, Supabase REST over HTTPS because Workers cannot verify Supabase's Postgres TLS cert). `rest` buffers writes and commits them in one transaction via the `apply_ops` SQL function (`supabase/apply_ops.sql`, service_role only) with optimistic concurrency (conflicts re-run the mutation). `worker.js` selects `rest`; `DB_DRIVER=rest` forces it in Node. After changing tables run `supabase/schema.sql` changes on Supabase and regenerate `server/columns.ts` (column kinds for the REST driver).
  - Worker env needs only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (set them as Secrets); `DATABASE_URL` is for Node/scripts.
  - `npm run test:server` runs `server/selftest.ts` against in-memory Postgres (PGlite): schema coverage, ctx.db semantics, login, order + stock flow, HTTP.
  - Env: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only). Migration of old Convex data: `supabase/README.md`.
- **Data Access Layer (DAL)**: `src/lib/api/` — all backend calls go through this layer via `q()` / `m()` from `src/lib/convex.ts` (name kept for import compatibility; it now calls `/rpc`). Do not call `rpc()` inline from components. Table-change subscriptions use `subscribeTables()` (polls a digest every 3s).
- **Outdated below:** sections "Data Access Layer Conventions" through "Database" still describe the pre-Convex Supabase client/RPC design; trust `convex/` + `supabase/schema.sql` instead.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. Dark theme, gold accent (`#C5A059`). Custom `@theme` tokens in `src/index.css`.
- **Routing**: react-router-dom v7, all routes in `src/App.tsx`. `/` redirects to `/login`.
  - Public: `/login`, `/pos`, `/kds`, `/store`, `/bot`
  - Admin (nested under `AdminLayout`): `/admin/` (dashboard), `orders`, `shifts`, `menu`, `recipe`, `inventory`, `purchasing`, `crm`, `reports`, `settings`, `staff`, `hardware`, `super`, `tables`, `flow`, `diagnostics`, `stocktake`, `menu-analysis`, `profit-loss`
- **No test runner. No CI.**
- **CSV export**: utility at `src/lib/exportCSV.ts` (browser-native Blob download).

## Data Access Layer Conventions

`src/lib/api/` contains domain-specific modules. **All DB queries must go through these.**

### Structure
```
src/lib/api/
  index.ts          — re-exports everything
  errors.ts         — DbError class with userMessage, isMissingTable, isDuplicate etc.
  helpers.ts        — dbQuery(), dbQueryOptional(), dbMutation() wrappers
  products.ts       — fetchProducts, createProduct, updateProduct, etc.
  orders.ts         — fetchOrders, processOrderAtomic, updateOrderStatus, etc.
  inventory.ts      — fetchInventory, receivePurchaseOrderAtomic, completeStocktakeAtomic
  customers.ts      — fetchCustomers, adjustCustomerPointsSafe (atomic via RPC)
  settings.ts       — fetchSettings, updateSettings
  shifts.ts         — fetchActiveShift, createShift, closeShift, addShiftSalesSafe
  staff.ts          — fetchStaff, fetchStaffByPin, createStaff, etc.
  tables.ts         — fetchTables, createTable, fetchActiveSession, etc.
  giftcards.ts      — fetchGiftCardByCode, updateGiftCard, createGiftCards, etc.
  stocktakes.ts     — fetchStocktakes, createStocktake, completeStocktake, etc.
```

### Rules
1. **No inline supabase queries in components** — import from `src/lib/api/`
2. **No read-modify-write patterns** — use RPC functions (e.g., `adjustCustomerPointsSafe`, `addShiftSalesSafe`, `processOrderAtomic`)
3. **Use `DbError`** for error handling in catch blocks — has `.userMessage` (Thai) and typed checks (`.isMissingTable`, `.isDuplicate`)
4. **Order IDs**: always use `crypto.randomUUID()`, never `Math.random()`
5. **Realtime subscriptions**: keep using `supabase.channel()` directly (not wrapped by DAL)
6. **Adding new queries**: add to the relevant domain file in `src/lib/api/`, use `dbQuery`/`dbMutation` helpers

### RPC Functions (Atomic Operations)

Defined in `scripts/create_rpc_functions.sql`. Run via `npx tsx scripts/create_rpc_functions.ts`.

| Function | Purpose | Used By |
|---|---|---|
| `process_order()` | Atomic: order upsert + items + customer points + shift sales | POSPage, WebstorePage |
| `adjust_customer_points()` | Atomic: increment customer points + total_spent | POSPage, CRMPage |
| `add_shift_sales()` | Atomic: increment shift total_sales | POSPage |
| `receive_purchase_order()` | Atomic: PO status + stock update + ledger | PurchaseOrderPage |
| `complete_stocktake()` | Atomic: stock update + ledger + mark complete | StocktakePage |

## Dual type definitions

Types exist in TWO places with partial overlap. **Update both when modifying DB fields.**
- `src/lib/supabase.ts` — **authoritative for schema**. Includes Product, StaffPin, StockItem, Order, OrderItem, Recipe, Customer, Supplier, PurchaseOrder, PurchaseOrderItem, RestaurantTable, TableSession, ProductCategory, Shift.
- `src/types.ts` — frontend-only types. Includes CartItem, GiftCard, GiftCardTransaction, Settings, CustomizationGroup, CustomizationOption. Also has **overlapping** Product, Order, Customer, Shift definitions (differ in casing/fields).

Key divergences:
- `Product.customizations`: `any[]` in supabase.ts vs `CustomizationGroup[]` in types.ts
- `Order`: camelCase+snake_case fields in types.ts, only snake_case in supabase.ts. `OrderItem.id` is `number` (not `string`) in supabase.ts — other tables use UUID strings.

## Environment

Env vars from `.env.local` (gitignored). Vite `loadEnv` with empty prefix loads ALL vars (not just `VITE_*`).

Required:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `GEMINI_API_KEY` — injected into client bundle via `vite.config.ts` `define` as `process.env.GEMINI_API_KEY` (the **only** `process.env.*` in client code)
- `APP_URL` — self-referential URL
- `DISABLE_HMR=true` — disables HMR (needed in AI Studio)

`src/lib/supabase.ts` throws at import time if env vars are missing.

## Database

- **No Supabase CLI migrations.** Schema changes via standalone scripts (`src/scripts/`, `scripts/`, root `.ts`) or direct SQL via `pg`.
- **Stock triggers**: `trigger_deduct_stock` (on `order_items` INSERT) and `trigger_return_stock` (on `orders` UPDATE when status→cancelled). Definitions in `scripts/create_stock_triggers_v2.ts`. Triggers read `modifiers` as `text[]` using `array_length()` / `[]` subscript — NOT jsonb operators.
- **`recipes.variant`**: variant-aware (null = base, "Chicken"/"Beef"/"Duck"/"Prawn / Seafood"/"Vegetarian / Tofu"). Protein selection stored in `order_items.modifiers`, matched to recipes by triggers.
- **`stock_items`** uses numeric `id` (SERIAL). Most other tables use UUID. **`cost_per_unit`** populated for all 323 items.
- **`inventory_ledger.item_id`** is TEXT (string of numeric stock item id).
- **`product.customizations`** JSONB: `[{name, options: [{name, priceAdjustment}], multiple, required}]`. DB stores `priceAdjustment` (camelCase) but types.ts code reads `price_adjustment`.
- **Tables created by scripts**: `stocktakes`/`stocktake_items` (via `src/scripts/create_stocktake_tables.ts`), `expenses` (via `src/scripts/create_expenses_table.ts`).
- Migration scripts hardcode DB connection strings with credentials — do not commit secrets if modifying these.

### Data import

Menu from `docs/pos_linked.xlsx` via `src/scripts/seed_from_excel.ts`. Import: `import XLSX from 'xlsx'` (default export). Recipe quantities estimated via `src/scripts/fix_recipes_step234_v2.ts` (Excel column was empty).

## Quirks

- Path alias `@/` maps to **project root** (`.`), not `src/`. Use `@/src/lib/foo` not `@/lib/foo`.
- `experimentalDecorators` and `useDefineForClassFields: false` in tsconfig — both required.
- `noEmit: true` in tsconfig — the project never emits `.js` files, only bundled via Vite.
- No formatter/linter beyond `tsc --noEmit` — follow existing code style by observation.
- No comments unless asked — repo convention.

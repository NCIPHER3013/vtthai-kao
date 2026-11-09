# Convex -> Supabase migration prep

## Files
- `supabase/schema.sql` — Postgres schema for every Convex table (website + POS) and the public `media` storage bucket. Run once in the Supabase SQL editor.
- `scripts/convex_to_supabase.ts` — converts a Convex snapshot export into Supabase rows and uploads `_storage` files to the `media` bucket.

## Steps
1. Create the Supabase project, run `supabase/schema.sql`.
2. Dry run (no network, validates mapping and references):
   `npx tsx scripts/convex_to_supabase.ts --src=backups/2026-10-19/extracted`
3. Load:
   `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/convex_to_supabase.ts --apply --src=<export dir>`
   Safe to re-run: ids are deterministic (uuid v5 of the Convex `_id`) and rows upsert on `legacy_convex_id`.
4. Run the API: set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then `npm run dev` (or `npm run server` in production, see `Dockerfile.api`). In production the site must proxy `/rpc`, `/upload` and `/storage` to the API (or set `VITE_API_URL`).
5. Sanity check before cutover: `npm run test:server`.

## Mapping rules
- Convex `_id` -> `legacy_convex_id` (kept), new uuid `id`; `_creationTime` -> `created_at`.
- Convex `orders` (website) -> `web_orders`; `posOrders` -> `pos_orders`. `siteInfo` -> `site_info`.
- `*StorageId` -> `*_storage_path` (object path inside bucket `media`, e.g. `<storageId>.webp`). Public URL = `<SUPABASE_URL>/storage/v1/object/public/media/<path>`.
- Nested objects/arrays (`prices`, `variants`, `nutrition`, `customizations`, order `items`) stay jsonb; string arrays are `text[]`.
- Timestamps in ms -> `timestamptz`. `authSessions` are not migrated (users log in again).
- Order `items[].menuId` / `imageStorageId` inside website orders are rewritten to the new uuid / storage path.

## Known gaps
- `convex/` still imports validators/types from the `convex` npm package (no Convex deployment is used). `convex/seed.ts` and `convex/migrations.ts` are old one-off mutations; they run through `/rpc` only if called by name.
- The 2026-10-19 backup has only website tables. POS tables (staffPins, stockItems, recipes, posOrders, shifts, customers, ...) are empty in it, so export a fresh snapshot from the live deployment (`npx convex export --path <file>.zip`) before cutover.
- `staff_pins.pin_hash` is SHA-256 of `vtthai-pos:<pin>` (see `convex/posLib.ts`); the new backend runs the same login code, so existing PINs keep working.
- `site_info` holds `admin_pin` in plain text; move it to a hashed value or Supabase Auth when rewriting login.
- RLS is enabled with only public-read policies. The API server connects as the database owner and enforces roles itself (session token + `requireRole`), so no extra policies are needed for it.
- Realtime is now a 3s poll of `posTouch:digest` instead of Convex push. Atomicity comes from SERIALIZABLE transactions (with retry) around every mutation.
- Not yet exercised against a real Supabase project: only PGlite tests ran. Check `DATABASE_URL` (use the pooler/direct string with SSL) and that the `media` bucket exists after running `schema.sql`.
- `SYSTEM_STRUCTURE.md` still describes the old Supabase table layout.

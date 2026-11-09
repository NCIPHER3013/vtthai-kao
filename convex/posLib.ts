// Shared helpers for the POS backend (ported from pos-lite / Supabase).
// Conventions used by every pos*.ts file:
//  - every public function takes `token: v.optional(v.string())` (login session) and checks it with requireRole()
//  - return shapes are the LEGACY pos-lite shapes (snake_case, `id`, ISO date strings) so the UI keeps working
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

declare const process: { env: Record<string, string | undefined> }

export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN'
export const ALL_STAFF: Array<Role> = ['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN']
export const MANAGERS: Array<Role> = ['ADMIN', 'MANAGER']
export const FRONT: Array<Role> = ['ADMIN', 'MANAGER', 'CASHIER']

type Ctx = QueryCtx | MutationCtx

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const hashPin = (pin: string) => sha256(`vtthai-pos:${pin}`)

export async function getSession(ctx: Ctx, token: string | undefined) {
  if (!token) return null
  const s = await ctx.db
    .query('authSessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first()
  if (!s || s.expiresAt < Date.now()) return null
  return s
}

/** Throws UNAUTHORIZED / FORBIDDEN. Returns the session. */
export async function requireRole(
  ctx: Ctx,
  token: string | undefined,
  roles: Array<Role> = ALL_STAFF,
) {
  const s = await getSession(ctx, token)
  if (!s) throw new Error('UNAUTHORIZED')
  if (!roles.includes(s.role as Role)) throw new Error('FORBIDDEN')
  return s
}

export const toIso = (ms: number | undefined | null) =>
  ms === undefined || ms === null ? null : new Date(ms).toISOString()
export const fromIso = (s: string | undefined | null) =>
  s ? new Date(s).getTime() : undefined

/** Legacy `created_at` = Convex _creationTime. */
export const createdAt = (d: { _creationTime: number }) => toIso(d._creationTime)

export const id = (d: { _id: string }) => d._id as string

/** Remove undefined keys (Convex rejects undefined in objects only for some paths; patch treats undefined as "unset"). */
export function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(o)) if (val !== undefined) out[k] = val
  return out as T
}

// ---------- menus <-> legacy `products` ----------
type Menu = Doc<'menus'>

/** Legacy Product shape for a menu row. Variants become a "Package" customization group. */
export async function menuToProduct(ctx: Ctx, m: Menu) {
  const dine = m.prices?.dineIn ?? m.variants?.[0]?.prices.dineIn ?? 0
  const take = m.prices?.takeaway ?? m.variants?.[0]?.prices.takeaway ?? dine
  const deliv = m.prices?.delivery ?? m.variants?.[0]?.prices.delivery ?? dine
  // Stored groups (e.g. Protein) are combined with the "Package" group derived from the Lunch/Combo variants.
  const stored = Array.isArray(m.customizations) ? (m.customizations as Array<any>) : []
  const hasPackage = stored.some((g) => g?.name === 'Package')
  let customizations: Array<unknown> = stored
  if (!hasPackage && m.variants && m.variants.length > 0) {
    const base = m.variants[0].prices
    customizations = [
      {
        name: 'Package',
        required: true,
        multiple: false,
        options: m.variants.map((v) => ({
          name: v.label,
          priceAdjustment: Math.round((v.prices.dineIn - base.dineIn) * 100) / 100,
          price_takeaway: Math.round((v.prices.takeaway - base.takeaway) * 100) / 100,
          price_delivery: Math.round((v.prices.delivery - base.delivery) * 100) / 100,
        })),
      },
      ...stored,
    ]
  }
  let imageUrl: string | null = m.imageUrl ?? null
  if (m.imageStorageId) imageUrl = (await storageUrl(ctx, m.imageStorageId)) ?? imageUrl
  return {
    id: m._id as string,
    plu: m.plu ?? null,
    name: m.title,
    middle_name: m.thai ?? null,
    description: m.description ?? null,
    price: dine,
    price_takeaway: take,
    price_delivery: deliv,
    category: m.category,
    color_label: m.colorLabel ?? 'slate',
    created_at: createdAt(m),
    is_active: m.available,
    image_url: imageUrl,
    calories: m.nutrition?.calories ?? null,
    protein: m.nutrition?.protein ?? null,
    carbs: m.nutrition?.carbs ?? null,
    fat: m.nutrition?.fat ?? null,
    is_healthy: (m.tags ?? []).includes('healthy'),
    is_gluten_free: (m.tags ?? []).includes('gluten-free'),
    is_vegan: (m.tags ?? []).includes('vegan'),
    is_lunch_special: m.isLunchSpecial ?? false,
    customizations,
  }
}

// ---------- stock ----------
export const PROTEINS = ['Chicken', 'Beef', 'Duck', 'Prawn / Seafood', 'Vegetarian / Tofu']

/** Same parsing as pos-lite triggers: "Group: Option (+$1.00)" -> chosen protein variant or null. */
export function chosenVariant(modifiers: Array<string> | undefined): string | null {
  for (const mod of modifiers ?? []) {
    let opt = mod.includes(': ') ? mod.slice(mod.indexOf(': ') + 2) : mod
    opt = opt.replace(/\s*\(\+\$[0-9.]+\)\s*$/, '')
    if (PROTEINS.includes(opt)) return opt
  }
  return null
}

/**
 * Ingredient usage for order lines: Map<stockItemId, quantity>. Expands sub-recipes exactly like
 * deduct_stock_on_order (a recipe row whose ingredient has sub_recipe_ingredients consumes the children instead).
 */
export async function computeUsage(
  ctx: Ctx,
  lines: Array<{ menuId: Id<'menus'> | undefined; quantity: number; modifiers?: Array<string> }>,
) {
  const usage = new Map<Id<'stockItems'>, number>()
  for (const line of lines) {
    if (!line.menuId) continue
    const variant = chosenVariant(line.modifiers)
    const recipes = await ctx.db
      .query('recipes')
      .withIndex('by_menu', (q) => q.eq('menuId', line.menuId!))
      .collect()
    for (const r of recipes) {
      if (r.variant && r.variant !== variant) continue
      const subs = await ctx.db
        .query('subRecipeIngredients')
        .withIndex('by_parent', (q) => q.eq('parentItemId', r.stockItemId))
        .collect()
      if (subs.length > 0) {
        for (const s of subs)
          usage.set(s.childItemId, (usage.get(s.childItemId) ?? 0) + r.quantity * line.quantity * s.quantity)
      } else {
        usage.set(r.stockItemId, (usage.get(r.stockItemId) ?? 0) + r.quantity * line.quantity)
      }
    }
  }
  return usage
}

/** Whether insufficient stock must block orders (posSettings.enforceStock, default false). */
export async function stockEnforced(ctx: Ctx) {
  const s = await ctx.db.query('posSettings').first()
  return s?.enforceStock === true
}

/** Apply (sign=-1 deduct, +1 return) a usage map to stock + write ledger rows. Never goes through enforcement. */
export async function applyUsage(
  ctx: MutationCtx,
  usage: Map<Id<'stockItems'>, number>,
  sign: 1 | -1,
  changeType: string,
  referenceId: string,
) {
  for (const [stockItemId, qty] of usage) {
    const item = await ctx.db.get('stockItems', stockItemId)
    if (!item) continue
    const next = Math.round((item.currentStock + sign * qty) * 10000) / 10000
    await ctx.db.patch('stockItems', stockItemId, { currentStock: next })
    await ctx.db.insert('inventoryLedger', {
      stockItemId,
      type: sign < 0 ? 'out' : 'in',
      changeType,
      quantity: Math.round(sign * qty * 10000) / 10000,
      previousStock: item.currentStock,
      newStock: next,
      referenceId,
    })
  }
}

/** Throws `INSUFFICIENT_STOCK: <name>` for the first ingredient that cannot cover the usage. */
export async function assertStock(ctx: Ctx, usage: Map<Id<'stockItems'>, number>) {
  for (const [stockItemId, qty] of usage) {
    const item = await ctx.db.get('stockItems', stockItemId)
    if (item && item.currentStock < qty) throw new Error(`INSUFFICIENT_STOCK: ${item.name}`)
  }
}

/** Storage URL with the public origin (self-hosted Convex reports its internal http://127.0.0.1:3210 origin). */
export async function storageUrl(ctx: Ctx, storageId: Id<'_storage'>): Promise<string | null> {
  const url = await ctx.storage.getUrl(storageId)
  const pub = process.env.PUBLIC_STORAGE_ORIGIN
  if (!url || !pub) return url
  try {
    const u = new URL(url)
    return pub.replace(/\/$/, '') + u.pathname + u.search
  } catch {
    return url
  }
}

/** Upload URL with the public origin (same internal-origin problem as storageUrl: the browser cannot reach 127.0.0.1:3210). */
export async function uploadUrl(ctx: MutationCtx): Promise<string> {
  const url = await ctx.storage.generateUploadUrl()
  const pub = process.env.PUBLIC_STORAGE_ORIGIN
  if (!pub) return url
  try {
    const u = new URL(url)
    return pub.replace(/\/$/, '') + u.pathname + u.search
  } catch {
    return url
  }
}

// POS catalog: legacy `products` / `product_categories` backed by the existing `menus` / `menuCategories` tables,
// plus the public storefront bootstrap and image upload helpers.
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import {
  FRONT,
  MANAGERS,
  ALL_STAFF,
  clean,
  createdAt,
  menuToProduct,
  requireRole,
  toIso, storageUrl, uploadUrl } from './posLib'

// ---------- legacy category shape ----------
const toCategory = (c: Doc<'menuCategories'>) => ({
  id: c._id as string,
  name: c.name,
  master_plu: null as string | null,
  created_at: createdAt(c),
})

/** Legacy product patch -> menus patch (undefined values UNSET the field on db.patch). */
function productPatch(d: Record<string, any>, existing?: Doc<'menus'>) {
  const p: Record<string, unknown> = {}
  if ('name' in d) p.title = d.name
  if ('middle_name' in d) p.thai = d.middle_name || undefined
  if ('description' in d) p.description = d.description || undefined
  if ('category' in d) p.category = d.category
  if ('plu' in d) p.plu = d.plu || undefined
  if ('color_label' in d) p.colorLabel = d.color_label || undefined
  if ('is_active' in d) p.available = !!d.is_active
  if ('is_lunch_special' in d) p.isLunchSpecial = !!d.is_lunch_special
  if ('customizations' in d) p.customizations = d.customizations ?? undefined
  if ('price' in d || 'price_takeaway' in d || 'price_delivery' in d) {
    const baseDine = existing?.prices?.dineIn ?? existing?.variants?.[0]?.prices.dineIn ?? 0
    const dine = d.price != null ? Number(d.price) : baseDine
    const take = d.price_takeaway != null ? Number(d.price_takeaway) : (existing?.prices?.takeaway ?? dine)
    const del = d.price_delivery != null ? Number(d.price_delivery) : (existing?.prices?.delivery ?? dine)
    p.prices = { dineIn: dine, takeaway: take, delivery: del }
  }
  if (['calories', 'protein', 'carbs', 'fat'].some((k) => k in d)) {
    const n = (k: string, cur: number | undefined) => (k in d ? (d[k] == null || d[k] === '' ? undefined : Number(d[k])) : cur)
    const cur = existing?.nutrition
    p.nutrition = clean({
      calories: n('calories', cur?.calories),
      protein: n('protein', cur?.protein),
      carbs: n('carbs', cur?.carbs),
      fat: n('fat', cur?.fat),
    })
  }
  if (['is_healthy', 'is_gluten_free', 'is_vegan'].some((k) => k in d)) {
    const tags = new Set(existing?.tags ?? [])
    const flip = (k: string, tag: string) => {
      if (!(k in d)) return
      d[k] ? tags.add(tag) : tags.delete(tag)
    }
    flip('is_healthy', 'healthy')
    flip('is_gluten_free', 'gluten-free')
    flip('is_vegan', 'vegan')
    p.tags = [...tags]
  }
  return p
}

// ---------- products ----------
export const listProducts = query({
  args: { token: v.optional(v.string()), activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { token, activeOnly }) => {
    if (!activeOnly) await requireRole(ctx, token, ALL_STAFF)
    const menus = activeOnly
      ? await ctx.db
          .query('menus')
          .withIndex('by_available', (q) => q.eq('available', true))
          .collect()
      : await ctx.db.query('menus').collect()
    const out = await Promise.all(menus.map((m) => menuToProduct(ctx, m)))
    return out.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const getProduct = query({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { id }) => {
    const mid = ctx.db.normalizeId('menus', id)
    const m = mid ? await ctx.db.get('menus', mid) : null
    return m ? await menuToProduct(ctx, m) : null
  },
})

export const getProductsByIds = query({
  args: { token: v.optional(v.string()), ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const out = []
    for (const id of ids) {
      const mid = ctx.db.normalizeId('menus', id)
      const m = mid ? await ctx.db.get('menus', mid) : null
      if (m) out.push(await menuToProduct(ctx, m))
    }
    return out
  },
})

export const createProduct = mutation({
  args: { token: v.optional(v.string()), data: v.any() },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    if (!data?.name || data.price == null || !data.category) throw new Error('name, price and category are required')
    const count = (await ctx.db.query('menus').collect()).length
    const patch = productPatch(data)
    const doc = {
      title: String(data.name),
      category: String(data.category),
      heat: 'Mild',
      available: data.is_active !== false,
      featured: false,
      gallery: false,
      sortOrder: count,
      ...patch,
    } as Omit<Doc<'menus'>, '_id' | '_creationTime'>
    const id = await ctx.db.insert('menus', clean(doc as Record<string, unknown>) as typeof doc)
    // image_url on create
    if (data.image_url) await ctx.db.patch('menus', id, { imageUrl: String(data.image_url) })
    const m = await ctx.db.get('menus', id)
    return await menuToProduct(ctx, m!)
  },
})

export const updateProduct = mutation({
  args: { token: v.optional(v.string()), id: v.string(), data: v.any() },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const mid = ctx.db.normalizeId('menus', id)
    const existing = mid ? await ctx.db.get('menus', mid) : null
    if (!mid || !existing) throw new Error('Product not found')
    const patch = productPatch(data, existing)
    if ('image_url' in data) {
      const current = existing.imageStorageId ? await storageUrl(ctx, existing.imageStorageId) : (existing.imageUrl ?? null)
      const next = data.image_url || null
      if (next !== current) {
        patch.imageUrl = next ?? undefined
        patch.imageStorageId = undefined
      }
    }
    await ctx.db.patch('menus', mid, patch)
    const m = await ctx.db.get('menus', mid)
    return await menuToProduct(ctx, m!)
  },
})

/** Deletes the product, or soft-deletes (available=false) when order items reference it. */
export const deleteProduct = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    const mid = ctx.db.normalizeId('menus', id)
    const existing = mid ? await ctx.db.get('menus', mid) : null
    if (!mid || !existing) return null
    const used = await ctx.db
      .query('posOrderItems')
      .withIndex('by_menu', (q) => q.eq('menuId', mid))
      .first()
    if (used) {
      await ctx.db.patch('menus', mid, { available: false })
      return await menuToProduct(ctx, (await ctx.db.get('menus', mid))!)
    }
    for (const r of await ctx.db.query('recipes').withIndex('by_menu', (q) => q.eq('menuId', mid)).collect())
      await ctx.db.delete('recipes', r._id)
    await ctx.db.delete('menus', mid)
    return null
  },
})

export const popularProductIds = query({
  args: { token: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireRole(ctx, token, ALL_STAFF)
    const items = await ctx.db.query('posOrderItems').order('desc').take(1000)
    const counts = new Map<string, number>()
    for (const it of items) if (it.menuId) counts.set(it.menuId, (counts.get(it.menuId) ?? 0) + (it.quantity || 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit ?? 6)
      .map((e) => e[0])
  },
})

// ---------- categories ----------
export const listCategories = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx) => {
    const cats = await ctx.db.query('menuCategories').collect()
    return cats.map(toCategory).sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const createCategory = mutation({
  args: { token: v.optional(v.string()), data: v.any() },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    if (!data?.name) throw new Error('name is required')
    const count = (await ctx.db.query('menuCategories').collect()).length
    const id = await ctx.db.insert('menuCategories', { name: String(data.name), sortOrder: count + 1 })
    return toCategory((await ctx.db.get('menuCategories', id))!)
  },
})

export const updateCategory = mutation({
  args: { token: v.optional(v.string()), id: v.string(), data: v.any() },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const cid = ctx.db.normalizeId('menuCategories', id)
    const existing = cid ? await ctx.db.get('menuCategories', cid) : null
    if (!cid || !existing) throw new Error('Category not found')
    if (data?.name && data.name !== existing.name) {
      // products reference their category by name: keep them attached
      const menus = await ctx.db
        .query('menus')
        .withIndex('by_category', (q) => q.eq('category', existing.name))
        .collect()
      for (const m of menus) await ctx.db.patch('menus', m._id, { category: String(data.name) })
      await ctx.db.patch('menuCategories', cid, { name: String(data.name) })
    }
    return toCategory((await ctx.db.get('menuCategories', cid))!)
  },
})

export const deleteCategory = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    const cid = ctx.db.normalizeId('menuCategories', id)
    if (cid) await ctx.db.delete('menuCategories', cid)
    return null
  },
})

// ---------- uploads (product images, bank slips) ----------
export const generateUploadUrl = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireRole(ctx, token, FRONT)
    return await uploadUrl(ctx)
  },
})

export const storageFileUrl = query({
  args: { token: v.optional(v.string()), storageId: v.id('_storage') },
  handler: async (ctx, { token, storageId }) => {
    await requireRole(ctx, token, FRONT)
    return await storageUrl(ctx, storageId)
  },
})

// ---------- public storefront bootstrap (replaces 6 anonymous selects) ----------
export const webstoreBootstrap = query({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db
      .query('menus')
      .withIndex('by_available', (q) => q.eq('available', true))
      .collect()
    const products = (await Promise.all(menus.map((m) => menuToProduct(ctx, m)))).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    const categories = (await ctx.db.query('menuCategories').collect())
      .map(toCategory)
      .sort((a, b) => a.name.localeCompare(b.name))
    const s = await ctx.db.query('posSettings').first()
    const settings = {
      id: 1,
      store_name: s?.storeName ?? 'Vermont Thai',
      store_address: s?.storeAddress ?? '',
      store_phone: s?.storePhone ?? '',
      tax_id: s?.taxId ?? null,
      tax_rate: s?.taxRate ?? 0.1,
      holiday_surcharge: s?.holidaySurcharge ?? 0,
      eftpos_surcharge: s?.eftposSurcharge ?? 0,
      online_ordering: s?.onlineOrdering ?? null,
      currency: s?.currency ?? 'AUD',
      currency_locale: s?.currencyLocale ?? 'en-AU',
    }
    const recipes = (await ctx.db.query('recipes').collect()).map((r) => ({
      id: r._id as string,
      product_id: r.menuId as string,
      inventory_item_id: r.stockItemId as string,
      quantity: r.quantity,
      variant: r.variant ?? null,
      created_at: createdAt(r),
    }))
    const stock_items = (await ctx.db.query('stockItems').collect()).map((s) => ({
      id: s._id as string,
      item_id: s.itemCode ?? null,
      plu: s.plu ?? null,
      name: s.name,
      category: s.category ?? '',
      unit: s.unit ?? '',
      reorder_level: s.reorderLevel ?? 0,
      cost_per_unit: s.costPerUnit ?? 0,
      current_stock: s.currentStock,
      status: s.status ?? 'OK',
      notes: s.notes ?? null,
      selected_supplier: s.selectedSupplier ?? null,
      source_type: s.sourceType ?? null,
      created_at: createdAt(s),
      updated_at: toIso(s._creationTime),
    }))
    const sub_recipe_ingredients = (await ctx.db.query('subRecipeIngredients').collect()).map((r) => ({
      id: r._id as string,
      parent_item_id: r.parentItemId as string,
      child_item_id: r.childItemId as string,
      quantity: r.quantity,
      created_at: createdAt(r),
    }))
    return { products, categories, settings, recipes, stock_items, sub_recipe_ingredients }
  },
})

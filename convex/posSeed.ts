// DRAFT: goes to convex/posSeed.ts of the real project AFTER schema.draft.ts is merged into convex/schema.ts.
// Inserts in dependency order and maps legacy ids -> new Convex ids. Idempotent per table (skips if table not empty).
// stockItems / suppliers carry an optional `legacyId` (number | string) used only for seeding; may be dropped afterwards.
import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const seedCategories = internalMutation({
  args: { rows: v.array(v.object({ name: v.string() })) },
  handler: async (ctx, { rows }) => {
    if (await ctx.db.query('inventoryCategories').first())
      return 'skipped (not empty)'
    for (const r of rows) await ctx.db.insert('inventoryCategories', r)
    return rows.length
  },
})

export const seedStockItems = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, { rows }) => {
    let n = 0
    for (const r of rows) {
      const exists = await ctx.db
        .query('stockItems')
        .withIndex('by_legacy_id', (q) => q.eq('legacyId', r.legacyId))
        .first()
      if (!exists) {
        await ctx.db.insert('stockItems', r)
        n++
      }
    }
    return n
  },
})

export const seedSuppliers = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, { rows }) => {
    let n = 0
    for (const r of rows) {
      const exists = await ctx.db
        .query('suppliers')
        .withIndex('by_legacy_id', (q) => q.eq('legacyId', r.legacyId))
        .first()
      if (!exists) {
        await ctx.db.insert('suppliers', r)
        n++
      }
    }
    return n
  },
})

export const seedLinks = internalMutation({
  args: {
    subRecipes: v.array(v.any()),
    itemSuppliers: v.array(v.any()),
    recipes: v.array(v.any()),
  },
  handler: async (ctx, a) => {
    const stock = new Map<unknown, any>()
    for (const s of await ctx.db.query('stockItems').collect())
      stock.set(s.legacyId, s._id)
    const sup = new Map<unknown, any>()
    for (const s of await ctx.db.query('suppliers').collect())
      sup.set(s.legacyId, s._id)
    const menus = new Map<string, any>()
    for (const m of await ctx.db.query('menus').collect())
      menus.set(m.title, m._id)

    const out = {
      subRecipes: 0,
      itemSuppliers: 0,
      recipes: 0,
      missingMenus: [] as Array<string>,
    }
    if (!(await ctx.db.query('subRecipeIngredients').first()))
      for (const r of a.subRecipes) {
        await ctx.db.insert('subRecipeIngredients', {
          parentItemId: stock.get(r.parentLegacyId),
          childItemId: stock.get(r.childLegacyId),
          quantity: r.quantity,
        })
        out.subRecipes++
      }
    if (!(await ctx.db.query('itemSuppliers').first()))
      for (const r of a.itemSuppliers) {
        await ctx.db.insert('itemSuppliers', {
          itemId: stock.get(r.itemLegacyId),
          supplierId: sup.get(r.supplierLegacyId),
          price: r.price,
          isPreferred: r.isPreferred,
        })
        out.itemSuppliers++
      }
    if (!(await ctx.db.query('recipes').first()))
      for (const r of a.recipes) {
        const menuId = menus.get(r.menuTitle)
        if (!menuId) {
          if (!out.missingMenus.includes(r.menuTitle))
            out.missingMenus.push(r.menuTitle)
          continue
        }
        await ctx.db.insert('recipes', {
          menuId,
          stockItemId: stock.get(r.stockItemLegacyId),
          quantity: r.quantity,
          variant: r.variant,
        })
        out.recipes++
      }
    return out
  },
})

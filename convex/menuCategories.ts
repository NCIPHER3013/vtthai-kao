import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('menuCategories')
      .withIndex('by_sort_order')
      .order('asc')
      .take(100)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('menuCategories', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('menuCategories'),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const existing = await ctx.db.get('menuCategories', id)
    if (!existing) throw new Error('Category not found')
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest) as Array<[string, any]>) {
      if (value !== undefined) {
        updates[key] = value
      }
    }
    await ctx.db.patch('menuCategories', id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('menuCategories') },
  handler: async (ctx, args) => {
    await ctx.db.delete('menuCategories', args.id)
  },
})

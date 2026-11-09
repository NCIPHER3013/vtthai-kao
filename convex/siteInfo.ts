import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique()
    return doc?.value ?? null
  },
})

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query('siteInfo').take(50)
    const map: Record<string, string> = {}
    for (const doc of docs) {
      map[doc.key] = doc.value
    }
    return map
  },
})

export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique()
    if (existing) {
      await ctx.db.patch('siteInfo', existing._id, { value: args.value })
    } else {
      await ctx.db.insert('siteInfo', args)
    }
  },
})

export const setMany = mutation({
  args: {
    entries: v.array(v.object({ key: v.string(), value: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query('siteInfo')
        .withIndex('by_key', (q) => q.eq('key', entry.key))
        .unique()
      if (existing) {
        await ctx.db.patch('siteInfo', existing._id, { value: entry.value })
      } else {
        await ctx.db.insert('siteInfo', entry)
      }
    }
  },
})

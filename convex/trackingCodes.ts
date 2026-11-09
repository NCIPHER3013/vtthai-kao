import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('trackingCodes').order('asc').take(50)
  },
})

export const getAllPublic = query({
  args: {},
  handler: async (ctx) => {
    const codes = await ctx.db
      .query('trackingCodes')
      .withIndex('by_active', (q) => q.eq('active', true))
      .order('asc')
      .take(50)
    return codes
  },
})

export const getByPosition = query({
  args: { position: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('trackingCodes')
      .withIndex('by_active_and_position', (q) =>
        q.eq('active', true).eq('position', args.position),
      )
      .order('asc')
      .take(50)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    position: v.string(),
    pageTarget: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('trackingCodes', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('trackingCodes'),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    position: v.optional(v.string()),
    pageTarget: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      updates[key] = value
    }
    await ctx.db.patch('trackingCodes', id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('trackingCodes') },
  handler: async (ctx, args) => {
    await ctx.db.delete('trackingCodes', args.id)
  },
})

export const toggleActive = mutation({
  args: { id: v.id('trackingCodes') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get('trackingCodes', args.id)
    if (!item) return
    await ctx.db.patch('trackingCodes', args.id, { active: !item.active })
  },
})

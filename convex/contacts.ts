import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    topic: v.optional(v.string()),
    message: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('contacts', args)
  },
})

export const listByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contacts')
      .withIndex('by_type', (q) => q.eq('type', args.type))
      .order('desc')
      .take(50)
  },
})

export const listAllAdmin = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db.query('contacts').order('desc').take(100)
    if (!args.startDate && !args.endDate) return results
    return results.filter((doc) => {
      const t = doc._creationTime
      if (args.startDate && t < args.startDate) return false
      if (args.endDate && t > args.endDate) return false
      return true
    })
  },
})

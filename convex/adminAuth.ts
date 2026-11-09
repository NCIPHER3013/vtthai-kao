import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const verifyPin = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', 'admin_pin'))
      .unique()
    if (!doc) return false
    return doc.value === args.pin
  },
})

export const setPin = mutation({
  args: {
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', 'admin_pin'))
      .unique()

    if (doc) {
      if (doc.value !== args.currentPin) {
        throw new Error('Current password is incorrect')
      }
      await ctx.db.patch('siteInfo', doc._id, { value: args.newPin })
    } else {
      await ctx.db.insert('siteInfo', { key: 'admin_pin', value: args.newPin })
    }
  },
})

export const hasPin = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', 'admin_pin'))
      .unique()
    return doc !== null
  },
})

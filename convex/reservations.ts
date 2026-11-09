import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    numberOfGuests: v.number(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('reservations', {
      ...args,
      status: 'confirmed',
    })
  },
})

export const listByStatus = query({
  args: {
    status: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('reservations')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .take(50)
    if (!args.startDate && !args.endDate) return results
    return results.filter((doc) => {
      const t = doc._creationTime
      if (args.startDate && t < args.startDate) return false
      if (args.endDate && t > args.endDate) return false
      return true
    })
  },
})

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('reservations')
      .withIndex('by_date', (q) => q.eq('date', args.date))
      .order('desc')
      .take(50)
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('reservations'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get('reservations', args.id)
    if (!existing) throw new Error('Reservation not found')
    await ctx.db.patch('reservations', args.id, { status: args.status })
  },
})

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('reservations')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .take(50)
  },
})

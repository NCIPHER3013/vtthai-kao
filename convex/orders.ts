import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const TAX_RATE = 0.1

export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    orderType: v.string(),
    items: v.array(
      v.object({
        menuId: v.string(),
        title: v.string(),
        priceAud: v.number(),
        quantity: v.number(),
        notes: v.optional(v.string()),
        imageStorageId: v.optional(v.string()),
      }),
    ),
    subtotalAud: v.number(),
    notes: v.optional(v.string()),
    deliveryAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const taxAud = Math.round(args.subtotalAud * TAX_RATE * 100) / 100
    const totalAud = Math.round((args.subtotalAud + taxAud) * 100) / 100
    return await ctx.db.insert('orders', {
      ...args,
      taxAud,
      totalAud,
      status: 'pending',
    })
  },
})

export const getById = query({
  args: { id: v.id('orders') },
  handler: async (ctx, args) => {
    return await ctx.db.get('orders', args.id)
  },
})

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .take(50)
  },
})

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('orders').order('desc').take(100)
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('orders'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get('orders', args.id)
    if (!existing) throw new Error('Order not found')
    await ctx.db.patch('orders', args.id, { status: args.status })
  },
})

export const listRecent = query({
  args: {
    limit: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db.query('orders').order('desc').take(args.limit)
    if (!args.startDate && !args.endDate) return results
    return results.filter((doc) => {
      const t = doc._creationTime
      if (args.startDate && t < args.startDate) return false
      if (args.endDate && t > args.endDate) return false
      return true
    })
  },
})

export const listByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_phone', (q) => q.eq('customerPhone', args.phone))
      .order('desc')
      .take(20)
  },
})

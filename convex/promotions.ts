import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

function fixStorageUrl(url: string | null): string | null {
  if (!url) return null
  return url.replace(
    /^https?:\/\/127\.0\.0\.1:\d+/,
    'https://vtthai-convex-3210.vtthai.com.au'
  )
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('promotions')
      .withIndex('by_active', (q) => q.eq('active', true))
      .order('asc')
      .take(20)
    return await Promise.all(
      items.map(async (item) => {
        let storageImageUrl: string | null = null
        if (item.imageStorageId) {
          storageImageUrl = fixStorageUrl(
            await ctx.storage.getUrl(item.imageStorageId),
          )
        }
        return { ...item, storageImageUrl }
      }),
    )
  },
})

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('promotions').order('asc').take(50)
    return await Promise.all(
      items.map(async (item) => {
        let storageImageUrl: string | null = null
        if (item.imageStorageId) {
          storageImageUrl = fixStorageUrl(
            await ctx.storage.getUrl(item.imageStorageId),
          )
        }
        return { ...item, storageImageUrl }
      }),
    )
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priceAud: v.optional(v.number()),
    badge: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    active: v.boolean(),
    startDate: v.number(),
    endDate: v.number(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('promotions', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('promotions'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priceAud: v.optional(v.number()),
    badge: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    active: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const existing = await ctx.db.get('promotions', id)
    if (!existing) throw new Error('Promotion not found')
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest) as Array<[string, any]>) {
      if (value !== undefined) {
        updates[key] = value
      }
    }
    await ctx.db.patch('promotions', id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('promotions') },
  handler: async (ctx, args) => {
    await ctx.db.delete('promotions', args.id)
  },
})

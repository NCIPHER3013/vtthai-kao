import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('menus')
      .withIndex('by_available', (q) => q.eq('available', true))
      .order('asc')
      .take(100)
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

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('menus')
      .withIndex('by_featured', (q) => q.eq('featured', true))
      .order('asc')
      .take(12)
  },
})

export const listGallery = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('menus')
      .withIndex('by_gallery', (q) => q.eq('gallery', true))
      .order('asc')
      .take(24)
  },
})

function fixStorageUrl(url: string | null): string | null {
  if (!url) return null
  // The self-hosted Convex container thinks it's on 127.0.0.1:3210
  // So we replace it with the public URL
  return url.replace(
    /^https?:\/\/127\.0\.0\.1:\d+/,
    'https://vtthai-convex-3210.vtthai.com.au'
  )
}

export const listFeaturedWithUrls = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('menus')
      .withIndex('by_featured', (q) => q.eq('featured', true))
      .order('asc')
      .take(12)

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

export const listGalleryWithUrls = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('menus')
      .withIndex('by_gallery', (q) => q.eq('gallery', true))
      .order('asc')
      .take(24)

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

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('menus')
      .withIndex('by_category_and_available', (q) =>
        q.eq('category', args.category).eq('available', true),
      )
      .order('asc')
      .take(100)
  },
})

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return await ctx.db
        .query('menus')
        .withIndex('by_available', (q) => q.eq('available', true))
        .order('asc')
        .take(100)
    }
    return await ctx.db
      .query('menus')
      .withSearchIndex('search_menu', (q) =>
        q.search('title', args.query).eq('available', true),
      )
      .take(50)
  },
})

export const getById = query({
  args: { id: v.id('menus') },
  handler: async (ctx, args) => {
    return await ctx.db.get('menus', args.id)
  },
})

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query('menus')
      .withIndex('by_available', (q) => q.eq('available', true))
      .take(100)
    const categories = [...new Set(all.map((m) => m.category))]
    return categories.sort()
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    prices: v.optional(
      v.object({
        takeaway: v.number(),
        dineIn: v.number(),
        delivery: v.number(),
      }),
    ),
    heat: v.string(),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    available: v.boolean(),
    featured: v.boolean(),
    gallery: v.boolean(),
    sortOrder: v.number(),
    variants: v.optional(
      v.array(
        v.object({
          label: v.string(),
          prices: v.object({
            takeaway: v.number(),
            dineIn: v.number(),
            delivery: v.number(),
          }),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('menus', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('menus'),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    prices: v.optional(
      v.object({
        takeaway: v.number(),
        dineIn: v.number(),
        delivery: v.number(),
      }),
    ),
    heat: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    available: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    gallery: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    variants: v.optional(
      v.array(
        v.object({
          label: v.string(),
          prices: v.object({
            takeaway: v.number(),
            dineIn: v.number(),
            delivery: v.number(),
          }),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const existing = await ctx.db.get('menus', id)
    if (!existing) throw new Error('Menu item not found')
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest) as Array<[string, any]>) {
      if (value !== undefined) {
        updates[key] = value
      }
    }
    await ctx.db.patch('menus', id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('menus') },
  handler: async (ctx, args) => {
    await ctx.db.delete('menus', args.id)
  },
})

export const clearImage = mutation({
  args: { id: v.id('menus') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get('menus', args.id)
    if (!existing) throw new Error('Menu item not found')
    await ctx.db.patch('menus', args.id, {
      imageStorageId: undefined,
      imageUrl: undefined,
    })
  },
})

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('menus').order('asc').take(200)
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

export const listAllWithUrls = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('menus')
      .withIndex('by_available', (q) => q.eq('available', true))
      .order('asc')
      .take(100)

    const withUrls = await Promise.all(
      items.map(async (item) => {
        let imageUrl: string | null = null
        if (item.imageStorageId) {
          imageUrl = fixStorageUrl(
            await ctx.storage.getUrl(item.imageStorageId),
          )
        }
        return { ...item, storageImageUrl: imageUrl }
      }),
    )

    return withUrls
  },
})

export const getImageUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return fixStorageUrl(await ctx.storage.getUrl(args.storageId))
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const seedFeaturedAndGallery = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('menus').order('asc').take(200)
    const withImages = all.filter((m) => m.imageStorageId && m.available)

    const categories = [...new Set(withImages.map((m) => m.category))]
    const featuredIds: Array<string> = []
    const galleryIds: Array<string> = []

    for (const cat of categories) {
      const catItems = withImages
        .filter((m) => m.category === cat)
        .sort((a, b) => a.sortOrder - b.sortOrder)

      for (const item of catItems) {
        if (featuredIds.length < 6 && !featuredIds.includes(item._id)) {
          featuredIds.push(item._id)
        }
        if (galleryIds.length < 8 && !galleryIds.includes(item._id)) {
          galleryIds.push(item._id)
        }
      }
    }

    for (const id of featuredIds) {
      await ctx.db.patch('menus', id as any, { featured: true })
    }
    for (const id of galleryIds) {
      await ctx.db.patch('menus', id as any, { gallery: true })
    }

    return { featured: featuredIds.length, gallery: galleryIds.length }
  },
})

export const fixUppercaseTitles = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('menus').collect()
    let updated = 0

    function toTitleCase(str: string): string {
      return str
        .split(' ')
        .map((word) => {
          if (word.toLowerCase() === '(g)') return '(G)'
          if (word.toLowerCase() === 'g') return 'G'
          if (word.toLowerCase() === 'hsp') return 'HSP'

          const cleanWord = word.toLowerCase()
          if (cleanWord.startsWith('(')) {
            return '(' + cleanWord.charAt(1).toUpperCase() + cleanWord.slice(2)
          }
          return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1)
        })
        .join(' ')
    }

    for (const item of items) {
      const title = item.title
      const newTitle = toTitleCase(title)
      if (title !== newTitle) {
        await ctx.db.patch('menus', item._id, { title: newTitle })
        updated++
      }
    }
    return `Updated ${updated} menu titles to Title Case`
  },
})

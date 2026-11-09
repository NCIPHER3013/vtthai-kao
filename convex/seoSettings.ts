import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const get = query({
  args: { pagePath: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('seoSettings')
      .withIndex('by_page_path', (q) => q.eq('pagePath', args.pagePath))
      .first()
  },
})

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('seoSettings').order('asc').take(50)
  },
})

export const getAllPublic = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('seoSettings').order('asc').take(50)
    const result: Record<string, Record<string, unknown>> = {}
    for (const s of settings) {
      result[s.pagePath] = {
        title: s.title,
        description: s.description,
        canonicalUrl: s.canonicalUrl,
        ogTitle: s.ogTitle,
        ogDescription: s.ogDescription,
        ogImage: s.ogImage,
        noindex: s.noindex,
      }
    }
    return result
  },
})

export const upsert = mutation({
  args: {
    pagePath: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    noindex: v.optional(v.boolean()),
    customJsonLd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { pagePath, ...rest } = args
    const existing = await ctx.db
      .query('seoSettings')
      .withIndex('by_page_path', (q) => q.eq('pagePath', pagePath))
      .first()

    if (existing) {
      const entries = Object.entries(rest) as Array<[string, unknown]>
      const updates: Record<string, unknown> = Object.fromEntries(
        entries.filter(([, value]) => value !== undefined),
      )
      await ctx.db.patch('seoSettings', existing._id, updates)
    } else {
      await ctx.db.insert('seoSettings', args)
    }
  },
})

export const remove = mutation({
  args: { id: v.id('seoSettings') },
  handler: async (ctx, args) => {
    await ctx.db.delete('seoSettings', args.id)
  },
})

export const getSitemapData = query({
  args: {},
  handler: async (ctx) => {
    const blogPosts = await ctx.db
      .query('blogPosts')
      .withIndex('by_published_and_date', (q) => q.eq('published', true))
      .order('desc')
      .take(50)

    return blogPosts.map((post) => ({
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post._creationTime,
    }))
  },
})

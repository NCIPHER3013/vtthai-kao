import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('blogPosts')
      .withIndex('by_published_and_date', (q) => q.eq('published', true))
      .order('desc')
      .take(20)
  },
})

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('blogPosts')
      .withIndex('by_featured', (q) => q.eq('featured', true))
      .take(5)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('blogPosts')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
  },
})

export const getById = query({
  args: { id: v.id('blogPosts') },
  handler: async (ctx, args) => {
    return await ctx.db.get('blogPosts', args.id)
  },
})

export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('blogPosts').order('desc').take(50)
  },
})

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return []
    return await ctx.db
      .query('blogPosts')
      .withSearchIndex('search_blog', (q) =>
        q.search('title', args.query).eq('published', true),
      )
      .take(10)
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id('_storage')),
    author: v.string(),
    tags: v.optional(v.array(v.string())),
    published: v.boolean(),
    publishedAt: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    sortOrder: v.number(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoCanonicalUrl: v.optional(v.string()),
    seoOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('blogPosts', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('blogPosts'),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id('_storage')),
    author: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoCanonicalUrl: v.optional(v.string()),
    seoOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    const existing = await ctx.db.get('blogPosts', id)
    if (!existing) throw new Error('Blog post not found')
    const entries = Object.entries(rest) as Array<[string, unknown]>
    const updates: Record<string, unknown> = Object.fromEntries(
      entries.filter(([, value]) => value !== undefined),
    )
    await ctx.db.patch('blogPosts', id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('blogPosts') },
  handler: async (ctx, args) => {
    const post = await ctx.db.get('blogPosts', args.id)
    if (post?.coverImageStorageId) {
      await ctx.storage.delete(post.coverImageStorageId)
    }
    await ctx.db.delete('blogPosts', args.id)
  },
})

export const clearCoverImage = mutation({
  args: { id: v.id('blogPosts') },
  handler: async (ctx, args) => {
    const post = await ctx.db.get('blogPosts', args.id)
    if (!post) throw new Error('Blog post not found')
    if (post.coverImageStorageId) {
      await ctx.storage.delete(post.coverImageStorageId)
    }
    await ctx.db.patch('blogPosts', args.id, {
      coverImageStorageId: undefined,
      coverImageUrl: undefined,
    })
  },
})

export const getCoverImageUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

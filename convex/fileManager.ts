import { v } from 'convex/values'
import { action, query } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

type StorageFile = {
  _id: Id<'_storage'>
  _creationTime: number
  contentType?: string
  sha256: string
  size: number
}

type FileEntry = StorageFile & {
  url: string | null
  sources: Array<string>
}

export const listFiles = query({
  args: {},
  handler: async (ctx): Promise<Array<FileEntry>> => {
    const files: Array<StorageFile> = []
    for await (const doc of ctx.db.system.query('_storage')) {
      files.push(doc)
    }

    const entries: Array<FileEntry> = await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f._id)

        const sources: Array<string> = []
        const menu = await ctx.db
          .query('menus')
          .filter((q) => q.eq(q.field('imageStorageId'), f._id))
          .first()
        if (menu) sources.push(`menu:${menu.title}`)

        const promo = await ctx.db
          .query('promotions')
          .filter((q) => q.eq(q.field('imageStorageId'), f._id))
          .first()
        if (promo) sources.push(`promo:${promo.title}`)

        const blog = await ctx.db
          .query('blogPosts')
          .filter((q) => q.eq(q.field('coverImageStorageId'), f._id))
          .first()
        if (blog) sources.push(`blog:${blog.title}`)

        return { ...f, url, sources }
      }),
    )

    return entries.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const deleteFile = action({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId)

    const menus = await ctx.runQuery(api.menus.listAllAdmin, {})
    for (const menu of menus as Array<any>) {
      if (menu.imageStorageId === storageId) {
        await ctx.runMutation(api.menus.update, {
          id: menu._id,
          imageStorageId: undefined,
          imageUrl: undefined,
        })
      }
    }

    const promos = await ctx.runQuery(api.promotions.listAllAdmin, {})
    for (const promo of promos as Array<any>) {
      if (promo.imageStorageId === storageId) {
        await ctx.runMutation(api.promotions.update, {
          id: promo._id,
          imageStorageId: undefined,
          imageUrl: undefined,
        })
      }
    }

    const blogs = await ctx.runQuery(api.blogPosts.listAllAdmin, {})
    for (const blog of blogs as Array<any>) {
      if (blog.coverImageStorageId === storageId) {
        await ctx.runMutation(api.blogPosts.update, {
          id: blog._id,
          coverImageStorageId: undefined,
          coverImageUrl: undefined,
        })
      }
    }

    return { success: true }
  },
})

export const uploadAndReplace = action({
  args: { storageId: v.id('_storage'), fileData: v.bytes() },
  handler: async (ctx, { storageId, fileData }) => {
    const blob = new Blob([fileData], { type: 'image/png' })
    const newStorageId = await ctx.storage.store(blob)

    const menus = await ctx.runQuery(api.menus.listAllAdmin, {})
    for (const menu of menus as Array<any>) {
      if (menu.imageStorageId === storageId) {
        await ctx.runMutation(api.menus.update, {
          id: menu._id,
          imageStorageId: newStorageId,
        })
      }
    }

    const promos = await ctx.runQuery(api.promotions.listAllAdmin, {})
    for (const promo of promos as Array<any>) {
      if (promo.imageStorageId === storageId) {
        await ctx.runMutation(api.promotions.update, {
          id: promo._id,
          imageStorageId: newStorageId,
        })
      }
    }

    const blogs = await ctx.runQuery(api.blogPosts.listAllAdmin, {})
    for (const blog of blogs as Array<any>) {
      if (blog.coverImageStorageId === storageId) {
        await ctx.runMutation(api.blogPosts.update, {
          id: blog._id,
          coverImageStorageId: newStorageId,
        })
      }
    }

    try {
      await ctx.storage.delete(storageId)
    } catch {
      // old file may already be gone
    }

    return { newStorageId }
  },
})

export const getStorageUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId)
  },
})

'use node'

import { v } from 'convex/values'
import { action } from './_generated/server'
import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'

const SDXL_BASE = 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image'

function sdxlUrl(prompt: string, imageSize: string) {
  const encoded = encodeURIComponent(prompt)
  return `${SDXL_BASE}?prompt=${encoded}&image_size=${imageSize}`
}

function foodPrompt(menu: {
  title: string
  category?: string | null
  description?: string | null
  heat?: string | null
}) {
  const base = [
    'ultra realistic Thai food photography',
    'high-end restaurant plating',
    'macro lens, shallow depth of field',
    'warm cinematic lighting',
    'dark charcoal background',
    'high detail',
    'no people, no hands',
    'not illustration, not cartoon, not painting',
    'no text, no watermark, no logo',
  ].join(', ')

  const name = menu.title

  if (menu.title === 'Larb Gai') {
    return [
      base,
      name,
      'Thai minced chicken larb salad',
      'toasted rice powder',
      'fresh mint leaves, cilantro',
      'sliced shallots, red chili flakes',
      'lime wedges',
      'served in a ceramic bowl',
    ].join(', ')
  }

  return [base, name, menu.category].filter(Boolean).join(', ')
}

export const regeneratePlaceholderImages = action({
  args: {},
  handler: async (ctx) => {
    const menus: Array<Doc<'menus'>> = await ctx.runQuery(
      api.menus.listAllAdmin,
      {},
    )
    const results = []

    for (const menu of menus) {
      if (!menu.imageStorageId) continue

      try {
        const url = await ctx.storage.getUrl(menu.imageStorageId)
        if (!url) continue

        const resp = await fetch(url, { method: 'HEAD' })
        const size = parseInt(resp.headers.get('content-length') || '0', 10)

        if (size === 176626 || size < 50000) {
          await ctx.runMutation(api.menus.clearImage, { id: menu._id })
          results.push({
            title: menu.title,
            status: 'cleared-placeholder',
            sizeBytes: size,
          })
        } else {
          results.push({ title: menu.title, status: 'ok', sizeBytes: size })
        }
      } catch (e) {
        results.push({ title: menu.title, error: String(e) })
      }
    }

    return results
  },
})

export const generateAndStoreAllMenuImages = action({
  args: {},
  handler: async (ctx) => {
    const menus: Array<Doc<'menus'>> = await ctx.runQuery(
      api.menus.listAllAdmin,
      {},
    )

    const results: Array<{ title: string; status: string }> = []

    for (const menu of menus) {
      if (menu.imageStorageId) {
        results.push({ title: menu.title, status: 'skipped-already-stored' })
        continue
      }

      const imageUrl = sdxlUrl(foodPrompt(menu), 'square_hd')

      try {
        const resp = await fetch(imageUrl)
        if (!resp.ok) {
          results.push({
            title: menu.title,
            status: `fetch-failed-${resp.status}`,
          })
          continue
        }

        const blob = await resp.blob()

        if (blob.size === 176626 || blob.size < 50000) {
          results.push({
            title: menu.title,
            status: 'skipped-placeholder-received',
          })
          continue
        }

        const arrayBuffer = await blob.arrayBuffer()

        const storageId = await ctx.storage.store(
          new Blob([arrayBuffer], { type: blob.type || 'image/png' }),
        )

        await ctx.runMutation(api.menus.update, {
          id: menu._id,
          imageStorageId: storageId,
          imageUrl: undefined,
        })

        results.push({ title: menu.title, status: 'stored' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ title: menu.title, status: `error-${msg}` })
      }
    }

    return results
  },
})

export const regenerateSingleMenuImage = action({
  args: { id: v.id('menus') },
  handler: async (
    ctx,
    { id },
  ): Promise<{ title: string; status: string; newStorageId?: string }> => {
    try {
      const item: Doc<'menus'> | null = await ctx.runQuery(api.menus.getById, {
        id,
      })
      if (!item) return { title: '', status: 'not-found' }

      const imageUrl = sdxlUrl(foodPrompt(item), 'portrait_4_3')

      const resp = await fetch(imageUrl)
      if (!resp.ok) {
        return { title: item.title, status: `fetch-failed-${resp.status}` }
      }

      const blob = await resp.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const storageId = await ctx.storage.store(
        new Blob([arrayBuffer], { type: blob.type || 'image/png' }),
      )

      await ctx.runMutation(api.menus.update, {
        id,
        imageStorageId: storageId,
        imageUrl: undefined,
      })

      return {
        title: item.title,
        status: 'regenerated',
        newStorageId: String(storageId),
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { title: '', status: `error-${msg}` }
    }
  },
})

export const generateAndStoreAllPromoImages = action({
  args: {},
  handler: async (ctx) => {
    const promotions: Array<any> = await ctx.runQuery(
      api.promotions.listAllAdmin,
      {},
    )

    const results: Array<{ title: string; status: string }> = []

    for (const promo of promotions) {
      if (promo.imageStorageId) {
        results.push({ title: promo.title, status: 'skipped-already-stored' })
        continue
      }

      const imageUrl = sdxlUrl(
        `ultra realistic Thai food promo photography, ${promo.title}, ${promo.description || ''}, premium restaurant plating, warm cinematic lighting, dark charcoal background, high detail, no text, no watermark`,
        'square_hd',
      )

      try {
        const resp = await fetch(imageUrl)
        if (!resp.ok) {
          results.push({
            title: promo.title,
            status: `fetch-failed-${resp.status}`,
          })
          continue
        }

        const blob = await resp.blob()
        const arrayBuffer = await blob.arrayBuffer()

        const storageId = await ctx.storage.store(
          new Blob([arrayBuffer], { type: blob.type || 'image/png' }),
        )

        await ctx.runMutation(api.promotions.update, {
          id: promo._id,
          imageStorageId: storageId,
          imageUrl: undefined,
        })

        results.push({ title: promo.title, status: 'stored' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ title: promo.title, status: `error-${msg}` })
      }
    }

    return results
  },
})

import { mutation } from './_generated/server'

export const removeThaiFieldFromMenus = mutation({
  args: {},
  handler: async (ctx) => {
    const allMenus = await ctx.db.query('menus').collect()
    let patched = 0
    for (const menu of allMenus) {
      const doc = menu as Record<string, unknown>
      if ('thai' in doc) {
        const { thai, ...rest } = doc
        await ctx.db.patch('menus', menu._id, { ...rest })
        patched++
      }
    }
    return patched
  },
})

const ENGLISH_DESCRIPTIONS: Record<string, string> = {
  'Chicken Satay': 'Served with peanut dipping sauce and cucumber relish',
  'Crispy Spring Rolls':
    'Crispy on the outside, soft on the inside. Served with sweet chili sauce',
}

function containsThai(str: string): boolean {
  return /[\u0E00-\u0E7F]/.test(str)
}

export const fixThaiDescriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const allMenus = await ctx.db.query('menus').collect()
    const patched: Array<string> = []
    for (const menu of allMenus) {
      const fieldsToCheck = ['description', 'title'] as const
      for (const field of fieldsToCheck) {
        const val = menu[field]
        if (val && typeof val === 'string' && containsThai(val)) {
          const expected = ENGLISH_DESCRIPTIONS[menu.title]
          if (field === 'description' && expected) {
            await ctx.db.patch('menus', menu._id, { description: expected })
            patched.push(`${menu.title}: description`)
          } else if (field === 'title' && containsThai(val)) {
            await ctx.db.patch('menus', menu._id, { title: menu.title })
            patched.push(`${menu.title}: title (Thai detected)`)
          } else {
            await ctx.db.patch('menus', menu._id, { [field]: undefined })
            patched.push(`${menu.title}: ${field} cleared`)
          }
        }
      }
    }
    return patched
  },
})

// Migration: convert priceAud (single price) → prices (takeaway/dineIn/delivery)
// Also cleans up leftover priceAud fields
export const migratePriceAudToPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const allMenus = await ctx.db.query('menus').collect()
    let patched = 0
    for (const menu of allMenus) {
      const doc = menu as Record<string, unknown>
      const patchData: Record<string, unknown> = {}

      // Convert priceAud → prices if missing
      if ('priceAud' in doc && !('prices' in doc)) {
        const price = doc.priceAud as number
        patchData.prices = {
          takeaway: price,
          dineIn: Math.round(price * 1.05 * 100) / 100,
          delivery: Math.round(price * 1.15 * 100) / 100,
        }
      }

      // Remove leftover priceAud from any doc that has it
      if ('priceAud' in doc) {
        // Use replace to remove priceAud field entirely
        const { priceAud, ...rest } = doc
        const merged = { ...rest, ...patchData }
        // Only keep fields that are in the schema
        const clean: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(merged)) {
          if (key !== '_id' && key !== '_creationTime' && value !== undefined) {
            clean[key] = value
          }
        }
        await ctx.db.replace('menus', menu._id, clean as any)
        patched++
      } else if (Object.keys(patchData).length > 0) {
        await ctx.db.patch('menus', menu._id, patchData)
        patched++
      }

      // Migrate variants with old priceAud → prices
      if ('variants' in doc && Array.isArray(doc.variants)) {
        const oldVariants = doc.variants as Array<{
          label: string
          priceAud?: number
          prices?: { takeaway: number; dineIn: number; delivery: number }
        }>
        const needsMigration = oldVariants.some((v) => v.priceAud && !v.prices)
        if (needsMigration) {
          const newVariants = oldVariants.map((v) => ({
            label: v.label,
            ...(v.prices
              ? { prices: v.prices }
              : {
                  prices: {
                    takeaway: v.priceAud!,
                    dineIn: Math.round(v.priceAud! * 1.05 * 100) / 100,
                    delivery: Math.round(v.priceAud! * 1.15 * 100) / 100,
                  },
                }),
          }))
          await ctx.db.patch('menus', menu._id, { variants: newVariants })
          patched++
        }
      }
    }
    return patched
  },
})

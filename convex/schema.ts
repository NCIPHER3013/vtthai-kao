import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { posTables } from './posSchema'

export default defineSchema({
  ...posTables,

  menuCategories: defineTable({
    name: v.string(),
    sortOrder: v.number(),
  }).index('by_sort_order', ['sortOrder']),

  menus: defineTable({
    title: v.string(),
    thai: v.optional(v.string()),
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
    plu: v.optional(v.string()),
    colorLabel: v.optional(v.string()),
    isLunchSpecial: v.optional(v.boolean()),
    nutrition: v.optional(
      v.object({
        calories: v.optional(v.number()),
        protein: v.optional(v.number()),
        carbs: v.optional(v.number()),
        fat: v.optional(v.number()),
      }),
    ),
    customizations: v.optional(v.any()),
    available: v.boolean(),
    featured: v.optional(v.boolean()),
    gallery: v.optional(v.boolean()),
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
  })
    .index('by_category', ['category'])
    .index('by_available', ['available'])
    .index('by_featured', ['featured'])
    .index('by_gallery', ['gallery'])
    .index('by_category_and_available', ['category', 'available'])
    .searchIndex('search_menu', {
      searchField: 'title',
      filterFields: ['category', 'available'],
    }),

  promotions: defineTable({
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
  })
    .index('by_active', ['active'])
    .index('by_active_and_dates', ['active', 'startDate', 'endDate']),

  orders: defineTable({
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
    taxAud: v.number(),
    totalAud: v.number(),
    notes: v.optional(v.string()),
    status: v.string(),
    deliveryAddress: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_phone', ['customerPhone']),

  reservations: defineTable({
    customerName: v.string(),
    customerPhone: v.string(),
    numberOfGuests: v.number(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    status: v.string(),
  })
    .index('by_status', ['status'])
    .index('by_date', ['date']),

  contacts: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    topic: v.optional(v.string()),
    message: v.string(),
    type: v.string(),
  }).index('by_type', ['type']),

  siteInfo: defineTable({
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),

  blogPosts: defineTable({
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
  })
    .index('by_slug', ['slug'])
    .index('by_published', ['published'])
    .index('by_published_and_date', ['published', 'publishedAt'])
    .index('by_featured', ['featured'])
    .searchIndex('search_blog', {
      searchField: 'title',
      filterFields: ['published'],
    }),

  seoSettings: defineTable({
    pagePath: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    noindex: v.optional(v.boolean()),
    customJsonLd: v.optional(v.string()),
  }).index('by_page_path', ['pagePath']),

  trackingCodes: defineTable({
    name: v.string(),
    code: v.string(),
    position: v.string(),
    pageTarget: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  })
    .index('by_active', ['active'])
    .index('by_active_and_position', ['active', 'position']),
})

import { v } from 'convex/values'
import { query } from './_generated/server'
import { getSession } from './posLib'

// legacy (Supabase) table name -> Convex table. Used by the client `subscribeTables()` helper (replaces supabase.channel).
const TABLES = {
  orders: 'posOrders',
  order_items: 'posOrderItems',
  settings: 'posSettings',
  shifts: 'shifts',
  reservations: 'reservations',
  customers: 'customers',
  products: 'menus',
  restaurant_tables: 'restaurantTables',
  table_sessions: 'tableSessions',
  stock_items: 'stockItems',
  contacts: 'contacts',
  blog_posts: 'blogPosts',
  staff_pins: 'staffPins',
} as const
type Legacy = keyof typeof TABLES
const PUBLIC: Array<Legacy> = ['settings', 'products']

function hash(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return h
}

/** Small reactive digest of the tables: changes whenever any row of those tables changes. */
export const digest = query({
  args: { token: v.optional(v.string()), tables: v.array(v.string()) },
  handler: async (ctx, { token, tables }) => {
    const session = await getSession(ctx, token)
    let out = ''
    for (const t of tables) {
      if (!(t in TABLES)) continue
      const legacy = t as Legacy
      if (!session && !PUBLIC.includes(legacy)) continue
      const docs = await ctx.db.query(TABLES[legacy]).take(3000)
      let h = docs.length
      for (const d of docs) h = (h * 31 + hash(JSON.stringify(d))) | 0
      out += `${t}:${h};`
    }
    return out
  },
})

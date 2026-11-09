import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getSession, hashPin, type Role } from './posLib'

const SESSION_MS = 12 * 60 * 60 * 1000

function newToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Staff PIN login (replaces rpc verify_staff_pin). */
export const loginPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const h = await hashPin(pin)
    const staff = (await ctx.db.query('staffPins').collect()).find((s) => s.pinHash === h)
    if (!staff) return null
    const token = newToken()
    await ctx.db.insert('authSessions', {
      token,
      role: staff.role,
      name: staff.name,
      staffId: staff._id,
      expiresAt: Date.now() + SESSION_MS,
    })
    return { token, id: staff._id as string, name: staff.name, role: staff.role as Role }
  },
})

/** Admin login with the existing admin password (siteInfo key `admin_pin`, same as the old site). */
export const loginAdmin = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const doc = await ctx.db
      .query('siteInfo')
      .withIndex('by_key', (q) => q.eq('key', 'admin_pin'))
      .first()
    if (!doc || doc.value !== password) return null
    const token = newToken()
    await ctx.db.insert('authSessions', {
      token,
      role: 'ADMIN',
      name: 'Admin',
      expiresAt: Date.now() + SESSION_MS,
    })
    return { token, id: 'admin', name: 'Admin', role: 'ADMIN' as Role }
  },
})

export const whoami = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const s = await getSession(ctx, token)
    return s ? { id: (s.staffId as string | undefined) ?? 'admin', name: s.name, role: s.role as Role } : null
  },
})

export const logout = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const s = await getSession(ctx, token)
    if (s) await ctx.db.delete('authSessions', s._id)
    return null
  },
})

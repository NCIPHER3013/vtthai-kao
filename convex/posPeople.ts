// POS backend, domain A: staff, customers, gift cards, shifts, tables, expenses, settings,
// reservations, contacts, blog, uploads. Ported from pos-lite (Supabase RPCs / tables).
// Return shapes are the LEGACY pos-lite shapes (snake_case, id = Convex _id, ISO dates).
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  ALL_STAFF,
  FRONT,
  MANAGERS,
  clean,
  createdAt,
  fromIso,
  getSession,
  hashPin,
  requireRole,
  toIso, storageUrl, uploadUrl } from './posLib'

const token = v.optional(v.string())
type Ctx = QueryCtx | MutationCtx

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN'] as const
const roleValidator = v.string() // validated manually (UI sends upper-case strings)

function randomToken(bytes = 18) {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// =====================================================================================
// Staff (pos-lite rpc list_staff / create_staff / update_staff / delete_staff)
// =====================================================================================
export const listStaff = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const rows = await ctx.db.query('staffPins').collect()
    return rows
      .map((s) => ({ id: s._id as string, name: s.name, role: s.role, created_at: createdAt(s) as string }))
      .sort((x, y) => x.name.localeCompare(y.name))
  },
})

function checkRole(role: string): (typeof ROLES)[number] {
  const r = role.toUpperCase()
  if (!(ROLES as ReadonlyArray<string>).includes(r)) throw new Error('INVALID_ROLE')
  return r as (typeof ROLES)[number]
}

export const createStaff = mutation({
  args: { token, name: v.string(), role: roleValidator, pin: v.string() },
  handler: async (ctx, a) => {
    const s = await requireRole(ctx, a.token, MANAGERS)
    const role = checkRole(a.role)
    if (role === 'ADMIN' && s.role !== 'ADMIN') throw new Error('FORBIDDEN')
    if (!a.name.trim()) throw new Error('INVALID_NAME')
    if (!/^[0-9]{4}$/.test(a.pin)) throw new Error('PIN must be exactly 4 digits')
    const pinHash = await hashPin(a.pin)
    const dup = (await ctx.db.query('staffPins').collect()).some((x) => x.pinHash === pinHash)
    if (dup) throw new Error('DUPLICATE_PIN')
    const id = await ctx.db.insert('staffPins', { name: a.name.trim(), role, pinHash })
    return { id: id as string, name: a.name.trim(), role }
  },
})

export const updateStaff = mutation({
  args: {
    token,
    id: v.id('staffPins'),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    pin: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const s = await requireRole(ctx, a.token, MANAGERS)
    const target = await ctx.db.get('staffPins', a.id)
    if (!target) throw new Error('NOT_FOUND')
    if (target.role === 'ADMIN' && s.role !== 'ADMIN') throw new Error('FORBIDDEN')
    const patch: Partial<Doc<'staffPins'>> = {}
    if (a.name && a.name.trim()) patch.name = a.name.trim()
    if (a.role) {
      const role = checkRole(a.role)
      if (role === 'ADMIN' && s.role !== 'ADMIN') throw new Error('FORBIDDEN')
      patch.role = role
    }
    if (a.pin) {
      if (!/^[0-9]{4}$/.test(a.pin)) throw new Error('PIN must be exactly 4 digits')
      const h = await hashPin(a.pin)
      const dup = (await ctx.db.query('staffPins').collect()).some((x) => x.pinHash === h && x._id !== a.id)
      if (dup) throw new Error('DUPLICATE_PIN')
      patch.pinHash = h
    }
    await ctx.db.patch('staffPins', a.id, patch)
    return null
  },
})

export const deleteStaff = mutation({
  args: { token, id: v.id('staffPins') },
  handler: async (ctx, a) => {
    const s = await requireRole(ctx, a.token, MANAGERS)
    const target = await ctx.db.get('staffPins', a.id)
    if (!target) return null
    if (target.role === 'ADMIN' && s.role !== 'ADMIN') throw new Error('FORBIDDEN')
    await ctx.db.delete('staffPins', a.id)
    // drop that person's login sessions
    for (const sess of await ctx.db.query('authSessions').collect())
      if (sess.staffId === a.id) await ctx.db.delete('authSessions', sess._id)
    return null
  },
})

// =====================================================================================
// Customers
// =====================================================================================
function customerOut(c: Doc<'customers'>) {
  return {
    id: c._id as string,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    points: c.points,
    total_spent: c.totalSpent,
    last_visit: toIso(c.lastVisit),
    visit_count: c.visitCount,
    created_at: createdAt(c),
  }
}

export const listCustomers = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const rows = await ctx.db.query('customers').take(5000)
    return rows.map(customerOut).sort((x, y) => x.name.localeCompare(y.name))
  },
})

export const getCustomerById = query({
  args: { token, id: v.id('customers') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const c = await ctx.db.get('customers', a.id)
    return c ? customerOut(c) : null
  },
})

// Public on purpose (QR webstore / chatbot identify returning customers by phone or email), exact match only.
export const getCustomerByPhone = query({
  args: { token, phone: v.string() },
  handler: async (ctx, a) => {
    const phone = a.phone.trim()
    if (phone.length < 6) return null
    const c = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .first()
    return c ? customerOut(c) : null
  },
})

export const getCustomerByEmail = query({
  args: { token, email: v.string() },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase()
    if (!email.includes('@') && email.length < 4) return null
    const c = (await ctx.db.query('customers').take(5000)).find((x) => (x.email ?? '').toLowerCase() === email)
    return c ? customerOut(c) : null
  },
})

export const createCustomer = mutation({
  args: {
    token,
    name: v.string(),
    phone: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    points: v.optional(v.number()),
    total_spent: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const session = await getSession(ctx, a.token) // anonymous allowed (webstore sign-up) but cannot set balances
    const name = a.name.trim()
    if (name.length < 1 || name.length > 100) throw new Error('INVALID_NAME')
    const doc = {
      name,
      phone: a.phone?.trim() || undefined,
      email: a.email?.trim().toLowerCase() || undefined,
      points: session ? (a.points ?? 0) : 0,
      totalSpent: session ? (a.total_spent ?? 0) : 0,
      visitCount: 0,
    }
    const id = await ctx.db.insert('customers', clean(doc))
    return customerOut((await ctx.db.get('customers', id))!)
  },
})

export const updateCustomer = mutation({
  args: {
    token,
    id: v.id('customers'),
    name: v.optional(v.string()),
    phone: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    points: v.optional(v.number()),
    total_spent: v.optional(v.number()),
    last_visit: v.optional(v.union(v.string(), v.null())),
    visit_count: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    if (!(await ctx.db.get('customers', a.id))) throw new Error('NOT_FOUND')
    const patch: Record<string, unknown> = {}
    if (a.name !== undefined) patch.name = a.name.trim()
    if (a.phone !== undefined) patch.phone = a.phone?.trim() || undefined
    if (a.email !== undefined) patch.email = a.email?.trim().toLowerCase() || undefined
    if (a.points !== undefined) patch.points = a.points
    if (a.total_spent !== undefined) patch.totalSpent = a.total_spent
    if (a.last_visit !== undefined) patch.lastVisit = fromIso(a.last_visit)
    if (a.visit_count !== undefined) patch.visitCount = a.visit_count
    await ctx.db.patch('customers', a.id, patch)
    return customerOut((await ctx.db.get('customers', a.id))!)
  },
})

/** Atomic (single transaction) replacement of rpc adjust_customer_points. */
export const adjustCustomerPoints = mutation({
  args: { token, id: v.id('customers'), pointsDelta: v.number(), spentDelta: v.number(), reason: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const c = await ctx.db.get('customers', a.id)
    if (!c) throw new Error('NOT_FOUND')
    const points = (c.points || 0) + a.pointsDelta
    const totalSpent = (c.totalSpent || 0) + a.spentDelta
    await ctx.db.patch('customers', a.id, { points, totalSpent })
    if (a.pointsDelta !== 0)
      await ctx.db.insert('loyaltyTransactions', {
        customerId: a.id,
        pointsDelta: a.pointsDelta,
        reason: a.reason ?? 'adjust',
      })
    return [{ id: a.id as string, points, total_spent: totalSpent }]
  },
})

// =====================================================================================
// Gift cards
// =====================================================================================
function giftCardOut(g: Doc<'giftCards'>) {
  return {
    id: g._id as string,
    code: g.code,
    initial_value: g.initialValue,
    current_balance: g.currentBalance,
    purchase_price: g.purchasePrice,
    customer_id: (g.customerId as string | undefined) ?? undefined,
    status: g.status,
    created_at: createdAt(g) as string,
    expires_at: toIso(g.expiresAt) ?? undefined,
    notes: g.notes ?? undefined,
  }
}

export const getGiftCardByCode = query({
  args: { token, code: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const g = await ctx.db
      .query('giftCards')
      .withIndex('by_code', (q) => q.eq('code', a.code))
      .first()
    return g ? giftCardOut(g) : null
  },
})

export const getGiftCardById = query({
  args: { token, id: v.id('giftCards') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const g = await ctx.db.get('giftCards', a.id)
    return g ? giftCardOut(g) : null
  },
})

export const updateGiftCard = mutation({
  args: {
    token,
    id: v.id('giftCards'),
    current_balance: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.union(v.string(), v.null())),
    customer_id: v.optional(v.union(v.id('customers'), v.null())),
    expires_at: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    if (!(await ctx.db.get('giftCards', a.id))) throw new Error('NOT_FOUND')
    const patch: Record<string, unknown> = {}
    if (a.current_balance !== undefined) {
      if (a.current_balance < 0) throw new Error('INVALID_AMOUNT')
      patch.currentBalance = a.current_balance
    }
    if (a.status !== undefined) patch.status = a.status
    if (a.notes !== undefined) patch.notes = a.notes ?? undefined
    if (a.customer_id !== undefined) patch.customerId = a.customer_id ?? undefined
    if (a.expires_at !== undefined) patch.expiresAt = fromIso(a.expires_at)
    await ctx.db.patch('giftCards', a.id, patch)
    return giftCardOut((await ctx.db.get('giftCards', a.id))!)
  },
})

export const createGiftCards = mutation({
  args: {
    token,
    cards: v.array(
      v.object({
        code: v.string(),
        initial_value: v.number(),
        current_balance: v.number(),
        purchase_price: v.number(),
        customer_id: v.optional(v.union(v.id('customers'), v.null())),
        status: v.string(),
        expires_at: v.optional(v.union(v.string(), v.null())),
        notes: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const out = []
    for (const c of a.cards) {
      const dup = await ctx.db
        .query('giftCards')
        .withIndex('by_code', (q) => q.eq('code', c.code))
        .first()
      if (dup) throw new Error('DUPLICATE_CODE')
      const id = await ctx.db.insert(
        'giftCards',
        clean({
          code: c.code,
          initialValue: c.initial_value,
          currentBalance: c.current_balance,
          purchasePrice: c.purchase_price,
          customerId: c.customer_id ?? undefined,
          status: c.status,
          expiresAt: fromIso(c.expires_at),
          notes: c.notes ?? undefined,
        }),
      )
      out.push(giftCardOut((await ctx.db.get('giftCards', id))!))
    }
    return out
  },
})

export const createGiftCardTransaction = mutation({
  args: {
    token,
    gift_card_id: v.id('giftCards'),
    order_id: v.optional(v.union(v.string(), v.null())),
    amount: v.number(),
    transaction_type: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    let orderId: Id<'posOrders'> | undefined
    let notes = a.notes ?? ''
    if (a.order_id) {
      const o = await ctx.db
        .query('posOrders')
        .withIndex('by_client_id', (q) => q.eq('clientId', a.order_id!))
        .first()
      if (o) orderId = o._id
      else notes = `${notes} [order ${a.order_id}]`.trim()
    }
    const id = await ctx.db.insert(
      'giftCardTransactions',
      clean({
        giftCardId: a.gift_card_id,
        orderId,
        amount: a.amount,
        transactionType: a.transaction_type,
        notes: notes || undefined,
      }),
    )
    const t = (await ctx.db.get('giftCardTransactions', id))!
    return {
      id: t._id as string,
      gift_card_id: t.giftCardId as string,
      order_id: a.order_id ?? undefined,
      amount: t.amount,
      transaction_type: t.transactionType,
      created_at: createdAt(t) as string,
      notes: t.notes ?? undefined,
    }
  },
})

// =====================================================================================
// Shifts
// =====================================================================================
async function staffName(ctx: Ctx, id: Id<'staffPins'> | undefined) {
  if (!id) return null
  const s = await ctx.db.get('staffPins', id)
  return s?.name ?? null
}

async function shiftOut(ctx: Ctx, s: Doc<'shifts'>) {
  return {
    id: s._id as string,
    started_at: toIso(s.startedAt) as string,
    ended_at: toIso(s.endedAt),
    starting_cash: s.startingCash,
    expected_cash: s.expectedCash ?? null,
    actual_cash: s.actualCash ?? null,
    total_sales: s.totalSales,
    status: s.status as 'open' | 'closed',
    notes: s.notes ?? null,
    opened_by: (await staffName(ctx, s.openedByStaff)) ?? 'Admin',
    closed_by: s.endedAt ? ((await staffName(ctx, s.closedByStaff)) ?? 'Admin') : null,
  }
}

export const getActiveShift = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const rows = await ctx.db
      .query('shifts')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect()
    rows.sort((x, y) => y.startedAt - x.startedAt)
    return Promise.all(rows.slice(0, 1).map((s) => shiftOut(ctx, s)))
  },
})

export const listShifts = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const rows = await ctx.db.query('shifts').take(2000)
    rows.sort((x, y) => y.startedAt - x.startedAt)
    return Promise.all(rows.map((s) => shiftOut(ctx, s)))
  },
})

export const getShiftById = query({
  args: { token, id: v.id('shifts') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const s = await ctx.db.get('shifts', a.id)
    return s ? shiftOut(ctx, s) : null
  },
})

export const createShift = mutation({
  args: { token, starting_cash: v.number(), opened_by: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, a) => {
    const session = await requireRole(ctx, a.token, FRONT)
    const id = await ctx.db.insert(
      'shifts',
      clean({
        startedAt: Date.now(),
        startingCash: a.starting_cash,
        totalSales: 0,
        status: 'open',
        openedByStaff: session.staffId,
      }),
    )
    return shiftOut(ctx, (await ctx.db.get('shifts', id))!)
  },
})

export const closeShift = mutation({
  args: {
    token,
    id: v.id('shifts'),
    ended_at: v.string(),
    expected_cash: v.optional(v.number()),
    actual_cash: v.optional(v.number()),
    total_sales: v.number(),
    notes: v.optional(v.union(v.string(), v.null())),
    closed_by: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const session = await requireRole(ctx, a.token, FRONT)
    const s = await ctx.db.get('shifts', a.id)
    if (!s) throw new Error('NOT_FOUND')
    await ctx.db.patch(
      'shifts',
      a.id,
      clean({
        endedAt: fromIso(a.ended_at) ?? Date.now(),
        expectedCash: a.expected_cash,
        actualCash: a.actual_cash,
        totalSales: a.total_sales,
        notes: a.notes ?? undefined,
        status: 'closed',
        closedByStaff: session.staffId,
      }),
    )
    return shiftOut(ctx, (await ctx.db.get('shifts', a.id))!)
  },
})

/** Atomic replacement of rpc add_shift_sales. */
export const addShiftSales = mutation({
  args: { token, id: v.id('shifts'), amount: v.number() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const s = await ctx.db.get('shifts', a.id)
    if (!s) throw new Error('NOT_FOUND')
    const total = (s.totalSales || 0) + a.amount
    await ctx.db.patch('shifts', a.id, { totalSales: total })
    return [{ id: a.id as string, total_sales: total }]
  },
})

// =====================================================================================
// Restaurant tables + table sessions
// =====================================================================================
function tableOut(t: Doc<'restaurantTables'>) {
  return {
    id: t._id as string,
    table_number: t.tableNumber,
    zone: t.zone ?? 'Main Area',
    capacity: t.capacity ?? 4,
    is_active: t.isActive,
    qr_token: t.qrToken,
    created_at: createdAt(t) as string,
  }
}

function natCompare(x: string, y: string) {
  return x.localeCompare(y, undefined, { numeric: true })
}

// Public: the QR webstore lists nothing but a single table by its token; the full list is for staff.
export const listTables = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, ALL_STAFF)
    const rows = await ctx.db.query('restaurantTables').take(500)
    return rows.map(tableOut).sort((x, y) => natCompare(x.table_number, y.table_number))
  },
})

export const getTableByToken = query({
  args: { token, qr_token: v.string() },
  handler: async (ctx, a) => {
    if (a.qr_token.length < 6) return null
    const t = await ctx.db
      .query('restaurantTables')
      .withIndex('by_qr_token', (q) => q.eq('qrToken', a.qr_token))
      .first()
    return t ? tableOut(t) : null
  },
})

export const createTable = mutation({
  args: {
    token,
    table_number: v.string(),
    zone: v.optional(v.string()),
    capacity: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    qr_token: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const id = await ctx.db.insert(
      'restaurantTables',
      clean({
        tableNumber: a.table_number.trim(),
        zone: a.zone,
        capacity: a.capacity,
        isActive: a.is_active ?? true,
        qrToken: a.qr_token ?? randomToken(12),
      }),
    )
    return tableOut((await ctx.db.get('restaurantTables', id))!)
  },
})

export const updateTable = mutation({
  args: {
    token,
    id: v.id('restaurantTables'),
    table_number: v.optional(v.string()),
    zone: v.optional(v.string()),
    capacity: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    qr_token: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    if (!(await ctx.db.get('restaurantTables', a.id))) throw new Error('NOT_FOUND')
    const patch = clean({
      tableNumber: a.table_number?.trim(),
      zone: a.zone,
      capacity: a.capacity,
      isActive: a.is_active,
      qrToken: a.qr_token,
    })
    await ctx.db.patch('restaurantTables', a.id, patch)
    return tableOut((await ctx.db.get('restaurantTables', a.id))!)
  },
})

export const deleteTable = mutation({
  args: { token, id: v.id('restaurantTables') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const sessions = await ctx.db
      .query('tableSessions')
      .withIndex('by_table_and_status', (q) => q.eq('tableId', a.id))
      .collect()
    for (const s of sessions) await ctx.db.delete('tableSessions', s._id)
    await ctx.db.delete('restaurantTables', a.id)
    return null
  },
})

async function sessionOut(ctx: Ctx, s: Doc<'tableSessions'>) {
  let orderRef: string | undefined
  if (s.orderId) orderRef = (await ctx.db.get('posOrders', s.orderId))?.clientId
  return {
    id: s._id as string,
    table_id: s.tableId as string,
    session_token: s.sessionToken,
    status: s.status as 'active' | 'expired' | 'completed',
    order_id: orderRef,
    created_at: createdAt(s) as string,
    expires_at: (toIso(s.expiresAt) ?? createdAt(s)) as string,
    last_activity_at: (toIso(s.lastActivityAt) ?? createdAt(s)) as string,
  }
}

async function resolveOrderId(ctx: Ctx, clientId: string | null | undefined) {
  if (!clientId) return undefined
  const o = await ctx.db
    .query('posOrders')
    .withIndex('by_client_id', (q) => q.eq('clientId', clientId))
    .first()
  return o?._id
}

// Public (QR webstore): find the active session of a table.
export const getActiveSession = query({
  args: { token, table_id: v.id('restaurantTables') },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query('tableSessions')
      .withIndex('by_table_and_status', (q) => q.eq('tableId', a.table_id).eq('status', 'active'))
      .collect()
    const live = rows.filter((s) => !s.expiresAt || s.expiresAt > Date.now())
    return live[0] ? sessionOut(ctx, live[0]) : null
  },
})

export const listActiveSessions = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, ALL_STAFF)
    const all = await ctx.db.query('tableSessions').take(2000)
    return all
      .filter((s) => s.status === 'active' && (!s.expiresAt || s.expiresAt > Date.now()))
      .map((s) => ({ table_id: s.tableId as string }))
  },
})

// Public (QR webstore opens a session after scanning a table QR).
export const createTableSession = mutation({
  args: {
    token,
    table_id: v.id('restaurantTables'),
    session_token: v.string(),
    expires_at: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const t = await ctx.db.get('restaurantTables', a.table_id)
    if (!t || !t.isActive) throw new Error('INVALID_TABLE')
    if (a.session_token.length < 16) throw new Error('INVALID_SESSION_TOKEN')
    const now = Date.now()
    const id = await ctx.db.insert('tableSessions', {
      tableId: a.table_id,
      sessionToken: a.session_token,
      status: 'active',
      expiresAt: fromIso(a.expires_at) ?? now + 4 * 60 * 60 * 1000,
      lastActivityAt: now,
    })
    return sessionOut(ctx, (await ctx.db.get('tableSessions', id))!)
  },
})

// Anonymous callers may only attach an order / bump activity on a session they already know the id of.
export const updateTableSession = mutation({
  args: {
    token,
    id: v.id('tableSessions'),
    order_id: v.optional(v.union(v.string(), v.null())),
    last_activity_at: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const session = await getSession(ctx, a.token)
    if (a.status !== undefined && !session) throw new Error('UNAUTHORIZED')
    const s = await ctx.db.get('tableSessions', a.id)
    if (!s) throw new Error('NOT_FOUND')
    const patch: Record<string, unknown> = {}
    if (a.order_id !== undefined) {
      const oid = await resolveOrderId(ctx, a.order_id)
      if (oid) patch.orderId = oid
    }
    patch.lastActivityAt = fromIso(a.last_activity_at) ?? Date.now()
    if (a.status !== undefined) patch.status = a.status
    await ctx.db.patch('tableSessions', a.id, patch)
    return sessionOut(ctx, (await ctx.db.get('tableSessions', a.id))!)
  },
})

/** Staff: mark every active session of a table (by its number, e.g. "5") completed. Used by POS after paying a table. */
export const completeSessionsByTableNumber = mutation({
  args: { token, table_number: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const t = (await ctx.db.query('restaurantTables').take(500)).find((x) => x.tableNumber === a.table_number)
    if (!t) return 0
    const rows = await ctx.db
      .query('tableSessions')
      .withIndex('by_table_and_status', (q) => q.eq('tableId', t._id).eq('status', 'active'))
      .collect()
    for (const s of rows) await ctx.db.patch('tableSessions', s._id, { status: 'completed' })
    return rows.length
  },
})

/** Open (pending/preparing) orders of a table: legacy `orders(... order_items(quantity, products(name)))`. */
export const listTableOrders = query({
  args: { token, table_number: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, ALL_STAFF)
    const prefix = `table ${a.table_number}`.toLowerCase()
    const out = []
    for (const status of ['pending', 'preparing']) {
      const orders = await ctx.db
        .query('posOrders')
        .withIndex('by_status', (q) => q.eq('status', status))
        .take(500)
      for (const o of orders) {
        if (!(o.customerName ?? '').toLowerCase().startsWith(prefix)) continue
        const items = await ctx.db
          .query('posOrderItems')
          .withIndex('by_order', (q) => q.eq('orderId', o._id))
          .collect()
        out.push({
          id: o.clientId,
          status: o.status,
          total: o.total,
          order_type: o.orderType ?? null,
          order_items: items.map((i) => ({ quantity: i.quantity, products: { name: i.title } })),
        })
      }
    }
    return out
  },
})

// =====================================================================================
// Expenses
// =====================================================================================
function expenseOut(e: Doc<'expenses'>) {
  return {
    id: e._id as string,
    date: e.date,
    category: e.category ?? null,
    amount: e.amount,
    description: e.description ?? null,
    recurring: e.recurring,
    created_at: createdAt(e) as string,
  }
}

export const listExpenses = query({
  args: { token, from: v.optional(v.string()), to: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const rows = await ctx.db
      .query('expenses')
      .withIndex('by_date', (q) => {
        if (a.from && a.to) return q.gte('date', a.from).lte('date', a.to)
        if (a.from) return q.gte('date', a.from)
        if (a.to) return q.lte('date', a.to)
        return q
      })
      .take(5000)
    return rows.map(expenseOut)
  },
})

export const createExpense = mutation({
  args: {
    token,
    date: v.string(),
    category: v.optional(v.string()),
    amount: v.number(),
    description: v.optional(v.string()),
    recurring: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const id = await ctx.db.insert(
      'expenses',
      clean({
        date: a.date,
        category: a.category,
        amount: a.amount,
        description: a.description,
        recurring: a.recurring ?? false,
      }),
    )
    return expenseOut((await ctx.db.get('expenses', id))!)
  },
})

export const deleteExpense = mutation({
  args: { token, id: v.id('expenses') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    await ctx.db.delete('expenses', a.id)
    return null
  },
})

// =====================================================================================
// Settings (pos-lite `settings` singleton -> posSettings; id is always 1)
// =====================================================================================
const SETTINGS_MAP: Array<[string, string]> = [
  ['store_name', 'storeName'],
  ['store_address', 'storeAddress'],
  ['store_phone', 'storePhone'],
  ['tax_id', 'taxId'],
  ['tax_rate', 'taxRate'],
  ['holiday_surcharge', 'holidaySurcharge'],
  ['eftpos_surcharge', 'eftposSurcharge'],
  ['receipt_header', 'receiptHeader'],
  ['receipt_footer', 'receiptFooter'],
  ['default_starting_cash', 'defaultStartingCash'],
  ['hardware_config', 'hardwareConfig'],
  ['hardware_auto_print', 'hardwareAutoPrint'],
  ['hardware_cash_drawer_auto_open', 'hardwareCashDrawerAutoOpen'],
  ['currency', 'currency'],
  ['currency_locale', 'currencyLocale'],
  ['payment_ratio_target', 'paymentRatioTarget'],
  ['cogs_target', 'cogsTarget'],
  ['labor_target', 'laborTarget'],
  ['online_ordering', 'onlineOrdering'],
  ['enforce_stock', 'enforceStock'],
]

const SETTINGS_DEFAULT = {
  store_name: 'Vermont Thai',
  store_address: '',
  store_phone: '',
  tax_rate: 0.1,
  receipt_header: '',
  receipt_footer: '',
  default_starting_cash: 1000,
}

function settingsOut(row: Doc<'posSettings'> | null, includePrivate: boolean) {
  const out: Record<string, unknown> = { id: 1, ...SETTINGS_DEFAULT }
  if (row) {
    const r = row as unknown as Record<string, unknown>
    for (const [snake, camel] of SETTINGS_MAP) if (r[camel] !== undefined) out[snake] = r[camel]
  }
  // The admin Online Ordering page treats a missing key as "database not migrated": always expose it (null = use defaults).
  if (!('online_ordering' in out)) out.online_ordering = null
  if (!includePrivate) {
    delete out.hardware_config
    delete out.cogs_target
    delete out.labor_target
  }
  return out
}

// Public: the storefront / login page need store name, tax rate, hours.
export const getSettings = query({
  args: { token },
  handler: async (ctx, a) => {
    const session = await getSession(ctx, a.token)
    const row = await ctx.db.query('posSettings').first()
    return settingsOut(row, !!session)
  },
})

export const updateSettings = mutation({
  args: { token, data: v.any() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const src = (a.data ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    for (const [snake, camel] of SETTINGS_MAP) if (src[snake] !== undefined) patch[camel] = src[snake]
    if (patch.taxRate !== undefined && (typeof patch.taxRate !== 'number' || patch.taxRate < 0 || patch.taxRate > 1))
      throw new Error('INVALID_TAX_RATE')
    const row = await ctx.db.query('posSettings').first()
    if (row) await ctx.db.patch('posSettings', row._id, patch)
    else
      await ctx.db.insert('posSettings', {
        storeName: SETTINGS_DEFAULT.store_name,
        taxRate: SETTINGS_DEFAULT.tax_rate,
        defaultStartingCash: SETTINGS_DEFAULT.default_starting_cash,
        isGlobal: true,
        ...patch,
      } as never)
    return settingsOut(await ctx.db.query('posSettings').first(), true)
  },
})

// =====================================================================================
// Reservations (existing table: customerName, customerPhone, numberOfGuests, ...)
// =====================================================================================
function reservationOut(r: Doc<'reservations'>) {
  return {
    id: r._id as string,
    name: r.customerName,
    phone: r.customerPhone,
    guests: r.numberOfGuests,
    date: r.date,
    time: r.time,
    notes: r.notes ?? null,
    status: r.status,
    created_at: createdAt(r) as string,
  }
}

export const listReservations = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const rows = await ctx.db.query('reservations').order('desc').take(1000)
    return rows.map(reservationOut)
  },
})

export const setReservationStatus = mutation({
  args: { token, id: v.id('reservations'), status: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(a.status)) throw new Error('INVALID_STATUS')
    if (!(await ctx.db.get('reservations', a.id))) throw new Error('NOT_FOUND')
    await ctx.db.patch('reservations', a.id, { status: a.status })
    return reservationOut((await ctx.db.get('reservations', a.id))!)
  },
})

// Public: website booking form.
export const createReservation = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    guests: v.number(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const name = a.name.trim()
    const phone = a.phone.trim()
    if (name.length < 1 || name.length > 100) throw new Error('INVALID_NAME')
    if (phone.replace(/[^0-9]/g, '').length < 8 || phone.length > 30) throw new Error('INVALID_PHONE')
    if (!Number.isFinite(a.guests) || a.guests < 1 || a.guests > 100) throw new Error('INVALID_GUESTS')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || a.time.length > 20) throw new Error('INVALID_DATE')
    if ((a.notes ?? '').length > 1000) throw new Error('INVALID_NOTES')
    const id = await ctx.db.insert(
      'reservations',
      clean({
        customerName: name,
        customerPhone: phone,
        numberOfGuests: Math.floor(a.guests),
        date: a.date,
        time: a.time,
        notes: a.notes?.trim() || undefined,
        status: 'pending',
      }),
    )
    return id as string
  },
})

// =====================================================================================
// Contacts (existing table)
// =====================================================================================
export const createContact = mutation({
  args: { name: v.string(), phone: v.string(), topic: v.string(), message: v.string() },
  handler: async (ctx, a) => {
    const name = a.name.trim()
    const phone = a.phone.trim()
    const message = a.message.trim()
    if (name.length < 1 || name.length > 100) throw new Error('INVALID_NAME')
    if (phone.length < 6 || phone.length > 30) throw new Error('INVALID_PHONE')
    if (message.length < 1 || message.length > 4000 || a.topic.length > 200) throw new Error('INVALID_MESSAGE')
    const id = await ctx.db.insert('contacts', {
      name,
      phone,
      topic: a.topic.trim(),
      message,
      type: 'message',
    })
    return id as string
  },
})

export const listContacts = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const rows = await ctx.db.query('contacts').order('desc').take(500)
    return rows.map((c) => ({
      id: c._id as string,
      name: c.name,
      phone: c.phone,
      topic: c.topic ?? '',
      message: c.message,
      status: 'new',
      created_at: createdAt(c) as string,
    }))
  },
})

// =====================================================================================
// Blog (existing table blogPosts)
// =====================================================================================
async function blogOut(ctx: Ctx, p: Doc<'blogPosts'>, full: boolean) {
  let cover: string | null = p.coverImageUrl ?? null
  if (p.coverImageStorageId) cover = (await storageUrl(ctx, p.coverImageStorageId)) ?? cover
  const base = {
    id: p._id as string,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? undefined,
    cover_image_url: cover ?? undefined,
    author: p.author,
    tags: p.tags ?? null,
    published: p.published,
    published_at: (toIso(p.publishedAt ?? p._creationTime) ?? '') as string,
    created_at: createdAt(p) as string,
  }
  if (!full) return base
  return {
    ...base,
    content: p.content,
    seo_title: p.seoTitle ?? null,
    seo_description: p.seoDescription ?? null,
  }
}

// Public
export const listPublishedPosts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('blogPosts')
      .withIndex('by_published_and_date', (q) => q.eq('published', true))
      .order('desc')
      .take(100)
    return Promise.all(rows.map((p) => blogOut(ctx, p, false)))
  },
})

// Public
export const getPublishedPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query('blogPosts')
      .withIndex('by_slug', (q) => q.eq('slug', a.slug))
      .first()
    return p && p.published ? blogOut(ctx, p, true) : null
  },
})

export const listAllPosts = query({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const rows = await ctx.db.query('blogPosts').order('desc').take(500)
    return Promise.all(rows.map((p) => blogOut(ctx, p, false)))
  },
})

export const getPostById = query({
  args: { token, id: v.id('blogPosts') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const p = await ctx.db.get('blogPosts', a.id)
    return p ? blogOut(ctx, p, true) : null
  },
})

const blogInput = {
  slug: v.optional(v.string()),
  title: v.optional(v.string()),
  excerpt: v.optional(v.union(v.string(), v.null())),
  content: v.optional(v.string()),
  cover_image_url: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  tags: v.optional(v.union(v.array(v.string()), v.null())),
  seo_title: v.optional(v.union(v.string(), v.null())),
  seo_description: v.optional(v.union(v.string(), v.null())),
  published: v.optional(v.boolean()),
}

async function assertSlugFree(ctx: Ctx, slug: string, selfId?: Id<'blogPosts'>) {
  const dup = await ctx.db
    .query('blogPosts')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .first()
  if (dup && dup._id !== selfId) throw new Error('DUPLICATE_SLUG')
}

export const createPost = mutation({
  args: { token, ...blogInput },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    if (!a.slug || !a.title || !a.content) throw new Error('INVALID_POST')
    await assertSlugFree(ctx, a.slug)
    const published = a.published ?? false
    const id = await ctx.db.insert(
      'blogPosts',
      clean({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt ?? undefined,
        content: a.content,
        coverImageUrl: a.cover_image_url ?? undefined,
        author: a.author || 'Vermont Thai',
        tags: a.tags ?? undefined,
        published,
        publishedAt: published ? Date.now() : undefined,
        sortOrder: 0,
        seoTitle: a.seo_title ?? undefined,
        seoDescription: a.seo_description ?? undefined,
      }),
    )
    return blogOut(ctx, (await ctx.db.get('blogPosts', id))!, true)
  },
})

export const updatePost = mutation({
  args: { token, id: v.id('blogPosts'), ...blogInput },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    const p = await ctx.db.get('blogPosts', a.id)
    if (!p) throw new Error('NOT_FOUND')
    if (a.slug !== undefined) await assertSlugFree(ctx, a.slug, a.id)
    const patch: Record<string, unknown> = {}
    if (a.slug !== undefined) patch.slug = a.slug
    if (a.title !== undefined) patch.title = a.title
    if (a.excerpt !== undefined) patch.excerpt = a.excerpt ?? undefined
    if (a.content !== undefined) patch.content = a.content
    if (a.cover_image_url !== undefined) {
      patch.coverImageUrl = a.cover_image_url ?? undefined
      patch.coverImageStorageId = undefined
    }
    if (a.author !== undefined) patch.author = a.author || 'Vermont Thai'
    if (a.tags !== undefined) patch.tags = a.tags ?? undefined
    if (a.seo_title !== undefined) patch.seoTitle = a.seo_title ?? undefined
    if (a.seo_description !== undefined) patch.seoDescription = a.seo_description ?? undefined
    if (a.published !== undefined) {
      patch.published = a.published
      if (a.published && !p.publishedAt) patch.publishedAt = Date.now()
    }
    await ctx.db.patch('blogPosts', a.id, patch)
    return blogOut(ctx, (await ctx.db.get('blogPosts', a.id))!, true)
  },
})

export const deletePost = mutation({
  args: { token, id: v.id('blogPosts') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, MANAGERS)
    await ctx.db.delete('blogPosts', a.id)
    return null
  },
})

// =====================================================================================
// Uploads (replaces supabase.storage 'product-images')
// =====================================================================================
export const generateUploadUrl = mutation({
  args: { token },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    return await uploadUrl(ctx)
  },
})

export const getUploadedFileUrl = mutation({
  args: { token, storageId: v.id('_storage') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    return await storageUrl(ctx, a.storageId)
  },
})

// =====================================================================================
// Shift orders (ShiftPage): legacy order rows of one shift, oldest first
// =====================================================================================
export const listShiftOrders = query({
  args: { token, shift_id: v.id('shifts') },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const rows = await ctx.db
      .query('posOrders')
      .withIndex('by_shift', (q) => q.eq('shiftId', a.shift_id))
      .take(2000)
    rows.sort((x, y) => x.timestamp - y.timestamp)
    return rows.map((o) => ({
      id: o.clientId,
      subtotal: o.subtotal,
      tax: o.tax,
      total: o.total,
      payment_method: o.paymentMethod,
      timestamp: toIso(o.timestamp) as string,
      status: o.status,
      shift_id: o.shiftId as string | undefined,
      customer_id: o.customerId as string | undefined,
      customer_name: o.customerName,
      order_type: o.orderType ?? 'dine-in',
    }))
  },
})

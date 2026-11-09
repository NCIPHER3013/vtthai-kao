// POS orders (ported from pos-lite): posOrders + posOrderItems, stock deduction, online/webstore ordering.
// Legacy order `id` = posOrders.clientId (client-generated UUID); every other id is a Convex id string.
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  ALL_STAFF,
  FRONT,
  applyUsage,
  assertStock,
  computeUsage,
  createdAt,
  menuToProduct,
  requireRole,
  stockEnforced,
  toIso,
} from './posLib'

type Ctx = QueryCtx | MutationCtx
type Product = Awaited<ReturnType<typeof menuToProduct>>

const round2 = (n: number) => Math.round(n * 100) / 100
const token = v.optional(v.string())

// ---------------------------------------------------------------- pricing
function productCache(ctx: Ctx) {
  const cache = new Map<string, Product | null>()
  return async (menuId: string | null | undefined): Promise<Product | null> => {
    if (!menuId) return null
    if (cache.has(menuId)) return cache.get(menuId)!
    const mid = ctx.db.normalizeId('menus', menuId)
    const m = mid ? await ctx.db.get('menus', mid) : null
    const p = m ? await menuToProduct(ctx, m) : null
    cache.set(menuId, p)
    return p
  }
}

/** Price of one unit for an order type, incl. modifier adjustments ("Group: Option (+$1.00)") — same rules as place_online_order. */
export function unitPriceFor(p: Product, orderType: string | undefined, modifiers: Array<string>) {
  let unit =
    orderType === 'delivery'
      ? (p.price_delivery ?? p.price)
      : orderType === 'takeaway'
        ? (p.price_takeaway ?? p.price)
        : p.price
  const groups = (p.customizations ?? []) as Array<any>
  for (const mod of modifiers) {
    const sep = mod.indexOf(': ')
    const group = sep >= 0 ? mod.slice(0, sep).trim() : ''
    const optName = (sep >= 0 ? mod.slice(sep + 2) : mod).replace(/\s*\(\+\$[0-9.]+\)\s*$/, '').trim()
    let opt: any = null
    for (const g of groups) {
      if (group && g?.name !== group) continue
      opt = (g?.options ?? []).find((o: any) => o?.name === optName) ?? null
      if (opt) break
    }
    if (!opt) continue
    const num = (x: unknown) => typeof x === 'number'
    unit +=
      orderType === 'delivery' && num(opt.price_delivery)
        ? opt.price_delivery
        : orderType === 'takeaway' && num(opt.price_takeaway)
          ? opt.price_takeaway
          : num(opt.price)
            ? opt.price
            : num(opt.priceAdjustment)
              ? opt.priceAdjustment
              : num(opt.price_adjustment)
                ? opt.price_adjustment
                : 0
  }
  return round2(unit)
}

type InLine = { product_id: string; quantity: number; note?: string | null; modifiers?: Array<string> | null; unit_price?: number | null }
type Line = {
  menuId: Id<'menus'> | undefined
  title: string
  quantity: number
  unitPrice: number
  note?: string
  modifiers: Array<string>
  product: Product | null
}

async function priceLines(
  ctx: Ctx,
  items: Array<InLine>,
  orderType: string | undefined,
  opts: { requireActive?: boolean; requireKnown?: boolean } = {},
): Promise<Array<Line>> {
  const get = productCache(ctx)
  const out: Array<Line> = []
  for (const it of items) {
    const qty = Number(it.quantity ?? 1)
    if (!(qty >= 1 && qty <= 50)) throw new Error('INVALID_QUANTITY')
    // POS "Open Item" (custom price typed by the cashier). Staff-only: public orders (requireActive) can never use it.
    if (!opts.requireActive && it.product_id === 'open-item') {
      const price = Number(it.unit_price)
      if (!Number.isFinite(price) || price < 0 || price > 10000) throw new Error('INVALID_PRICE')
      out.push({ menuId: undefined, title: 'Open Item', quantity: qty, unitPrice: round2(price), note: it.note ? String(it.note) : undefined, modifiers: (it.modifiers ?? []).map(String), product: null })
      continue
    }
    const p = await get(it.product_id)
    if (!p) {
      if (opts.requireKnown) throw new Error(`PRODUCT_UNAVAILABLE: ${it.product_id ?? '?'}`)
      continue
    }
    if (opts.requireActive && (!p.is_active || ['sub-recipe', 'extras'].includes((p.category ?? '').toLowerCase())))
      throw new Error(`PRODUCT_UNAVAILABLE: ${it.product_id}`)
    const mods = (it.modifiers ?? []).map(String)
    const unitPrice = unitPriceFor(p, orderType, mods)
    // Public orders (webstore / online) must never sell unpriced items (e.g. entrees/drinks that are only part of the Lunch Combo).
    if (opts.requireActive && !(unitPrice > 0)) throw new Error(`PRODUCT_NOT_ORDERABLE: ${p.name}`)
    out.push({
      menuId: ctx.db.normalizeId('menus', it.product_id) ?? undefined,
      title: p.name,
      quantity: qty,
      unitPrice,
      note: it.note ? String(it.note) : undefined,
      modifiers: mods,
      product: p,
    })
  }
  return out
}

async function insertLines(ctx: MutationCtx, orderId: Id<'posOrders'>, lines: Array<Line>) {
  for (const l of lines)
    await ctx.db.insert('posOrderItems', {
      orderId,
      menuId: l.menuId,
      title: l.title,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      ...(l.note ? { note: l.note } : {}),
      modifiers: l.modifiers,
    })
}

// ---------------------------------------------------------------- legacy shapes
async function orderOut(ctx: Ctx, o: Doc<'posOrders'>, withItems = true, get = productCache(ctx)) {
  const base = {
    id: o.clientId,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    payment_method: o.paymentMethod,
    timestamp: toIso(o.timestamp)!,
    status: o.status,
    shift_id: (o.shiftId as string | undefined) ?? null,
    customer_id: (o.customerId as string | undefined) ?? null,
    customer_name: o.customerName ?? null,
    delivery_address: o.deliveryAddress ?? null,
    delivery_phone: o.deliveryPhone ?? null,
    delivery_name: o.deliveryName ?? null,
    order_type: o.orderType ?? 'takeaway',
    scheduled_for: toIso(o.scheduledFor),
    order_source: o.orderSource ?? 'pos',
    delivery_fee: o.deliveryFee ?? 0,
    staff_id: (o.staffId as string | undefined) ?? null,
    table_id: (o.tableId as string | undefined) ?? null,
    created_at: createdAt(o),
  }
  if (!withItems) return base
  const items = await ctx.db
    .query('posOrderItems')
    .withIndex('by_order', (q) => q.eq('orderId', o._id))
    .collect()
  const order_items = []
  for (const i of items) {
    const p = await get(i.menuId)
    order_items.push({
      id: i._id as string,
      order_id: o.clientId,
      product_id: (i.menuId as string | undefined) ?? null,
      quantity: i.quantity,
      note: i.note ?? null,
      modifiers: i.modifiers ?? [],
      unit_price: i.unitPrice,
      subtotal: round2(i.unitPrice * i.quantity),
      products:
        p ??
        ({
          id: 'unknown',
          name: i.title,
          price: i.unitPrice,
          category: 'Other',
          is_active: false,
        } as unknown as Product),
    })
  }
  return { ...base, order_items }
}

async function findByClientId(ctx: Ctx, clientId: string) {
  return await ctx.db
    .query('posOrders')
    .withIndex('by_client_id', (q) => q.eq('clientId', clientId))
    .first()
}

async function itemsAsLines(ctx: Ctx, orderId: Id<'posOrders'>) {
  const items = await ctx.db
    .query('posOrderItems')
    .withIndex('by_order', (q) => q.eq('orderId', orderId))
    .collect()
  return items.map((i) => ({ menuId: i.menuId, quantity: i.quantity, modifiers: i.modifiers ?? [] }))
}

// ---------------------------------------------------------------- stock / customer / shift helpers
/** Check (when enforced) and deduct stock for new lines. Throws INSUFFICIENT_STOCK and rolls the whole mutation back. */
async function reserveStock(ctx: MutationCtx, lines: Array<{ menuId: Id<'menus'> | undefined; quantity: number; modifiers?: Array<string> }>, ref: string) {
  const usage = await computeUsage(ctx, lines)
  if (usage.size === 0) return
  if (await stockEnforced(ctx)) await assertStock(ctx, usage)
  await applyUsage(ctx, usage, -1, 'sale', ref)
}

const stockReturned = (st: string | undefined) => st === 'cancelled' || st === 'refunded'

async function returnStock(ctx: MutationCtx, orderId: Id<'posOrders'>, ref: string, changeType: string) {
  const usage = await computeUsage(ctx, await itemsAsLines(ctx, orderId))
  if (usage.size > 0) await applyUsage(ctx, usage, 1, changeType, ref)
}

async function bumpCustomer(ctx: MutationCtx, customerId: Id<'customers'> | null | undefined, points: number, spent: number) {
  if (!customerId || (points === 0 && spent === 0)) return
  const c = await ctx.db.get('customers', customerId)
  if (!c) return
  await ctx.db.patch('customers', customerId, {
    points: (c.points ?? 0) + points,
    totalSpent: (c.totalSpent ?? 0) + spent,
    ...(spent > 0 ? { lastVisit: Date.now(), visitCount: (c.visitCount ?? 0) + 1 } : {}),
  })
}

async function bumpShift(ctx: MutationCtx, shiftId: Id<'shifts'> | null | undefined, amount: number) {
  if (!shiftId || amount === 0) return
  const s = await ctx.db.get('shifts', shiftId)
  if (s) await ctx.db.patch('shifts', shiftId, { totalSales: (s.totalSales ?? 0) + amount })
}

const normCustomer = (ctx: Ctx, id: string | null | undefined) => (id ? ctx.db.normalizeId('customers', id) : null)
const normShift = (ctx: Ctx, id: string | null | undefined) => (id ? ctx.db.normalizeId('shifts', id) : null)

// ---------------------------------------------------------------- queries
export const listOrders = query({
  args: {
    token,
    statuses: v.optional(v.array(v.string())),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    customerId: v.optional(v.string()),
    ascending: v.optional(v.boolean()),
    withItems: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, ALL_STAFF)
    let rows: Array<Doc<'posOrders'>> = []
    if (a.statuses && a.statuses.length > 0) {
      for (const s of a.statuses)
        rows.push(...(await ctx.db.query('posOrders').withIndex('by_status', (q) => q.eq('status', s)).take(3000)))
    } else if (a.from || a.to) {
      const from = a.from ? Date.parse(a.from) : 0
      const to = a.to ? Date.parse(a.to) : Number.MAX_SAFE_INTEGER
      rows = await ctx.db
        .query('posOrders')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', from).lte('timestamp', to))
        .take(5000)
    } else {
      rows = await ctx.db.query('posOrders').withIndex('by_timestamp').order('desc').take(3000)
    }
    if (a.from && a.statuses?.length) rows = rows.filter((o) => o.timestamp >= Date.parse(a.from!))
    if (a.to && a.statuses?.length) rows = rows.filter((o) => o.timestamp <= Date.parse(a.to!))
    if (a.customerId) {
      const cid = normCustomer(ctx, a.customerId)
      rows = rows.filter((o) => o.customerId === cid)
    }
    rows.sort((x, y) => (a.ascending ? x.timestamp - y.timestamp : y.timestamp - x.timestamp))
    const get = productCache(ctx)
    const out = []
    for (const o of rows) out.push(await orderOut(ctx, o, a.withItems !== false, get))
    return out
  },
})

export const getOrder = query({
  args: { token, id: v.string() },
  handler: async (ctx, { token: t, id }) => {
    await requireRole(ctx, t, ALL_STAFF)
    const o = await findByClientId(ctx, id)
    return o ? await orderOut(ctx, o) : null
  },
})

/** Open order (+items) of a table for the POS: via active table session, else by customer-name pattern. */
export const getTableOrder = query({
  args: { token, tableNumber: v.string() },
  handler: async (ctx, { token: t, tableNumber }) => {
    await requireRole(ctx, t, FRONT)
    const OPEN = ['pending', 'preparing', 'ready']
    let sessionCreatedAt = Date.now() - 12 * 60 * 60 * 1000
    let order: Doc<'posOrders'> | null = null
    const table = (await ctx.db.query('restaurantTables').take(500)).find((x) => x.tableNumber === tableNumber)
    if (table) {
      const sessions = (
        await ctx.db
          .query('tableSessions')
          .withIndex('by_table_and_status', (q) => q.eq('tableId', table._id).eq('status', 'active'))
          .collect()
      ).sort((x, y) => y._creationTime - x._creationTime)
      const s = sessions[0]
      if (s) {
        sessionCreatedAt = s._creationTime
        if (s.orderId) {
          const o = await ctx.db.get('posOrders', s.orderId)
          if (o && OPEN.includes(o.status)) order = o
        }
      }
    }
    if (!order) {
      const recent = []
      for (const st of OPEN)
        recent.push(...(await ctx.db.query('posOrders').withIndex('by_status', (q) => q.eq('status', st)).take(1000)))
      order =
        recent
          .filter((o) => o.timestamp >= sessionCreatedAt)
          .sort((x, y) => y.timestamp - x.timestamp)
          .find(
            (o) =>
              o.customerName === tableNumber ||
              o.customerName === `Table ${tableNumber}` ||
              o.customerName?.startsWith(`Table ${tableNumber} (`),
          ) ?? null
    }
    if (!order) return null
    const full = await orderOut(ctx, order)
    let customer: unknown = null
    if (order.customerId) {
      const c = await ctx.db.get('customers', order.customerId)
      if (c)
        customer = {
          id: c._id as string,
          name: c.name,
          phone: c.phone ?? null,
          email: c.email ?? null,
          points: c.points,
          total_spent: c.totalSpent,
          last_visit: toIso(c.lastVisit),
          created_at: createdAt(c),
        }
    }
    return { order: full, customer }
  },
})

/** Public (QR webstore): is the order a returning table session points at still open? Returns only its status. */
export const webstoreOrderStatus = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    if (orderId.length < 8) return null
    const o = await findByClientId(ctx, orderId)
    return o ? { status: o.status } : null
  },
})

// ---------------------------------------------------------------- mutations (staff)
const orderItemArg = v.object({
  product_id: v.string(),
  unit_price: v.optional(v.union(v.number(), v.null())),
  quantity: v.number(),
  note: v.optional(v.union(v.string(), v.null())),
  modifiers: v.optional(v.union(v.array(v.string()), v.null())),
})

/** Port of process_order + stock triggers: upsert by clientId, return old stock, replace items, deduct new stock. */
export const processOrder = mutation({
  args: {
    token,
    orderId: v.string(),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentMethod: v.string(),
    orderType: v.string(),
    status: v.optional(v.string()),
    customerId: v.optional(v.union(v.string(), v.null())),
    customerName: v.optional(v.union(v.string(), v.null())),
    shiftId: v.optional(v.union(v.string(), v.null())),
    deliveryAddress: v.optional(v.union(v.string(), v.null())),
    deliveryPhone: v.optional(v.union(v.string(), v.null())),
    items: v.array(orderItemArg),
  },
  handler: async (ctx, a) => {
    const session = await requireRole(ctx, a.token, FRONT)
    if (!a.orderId || a.orderId.length < 8) throw new Error('INVALID_ORDER_ID')
    if (a.items.length === 0 || a.items.length > 200) throw new Error('INVALID_ITEMS')
    const status = a.status ?? 'pending'
    const lines = await priceLines(ctx, a.items, a.orderType, { requireKnown: true })
    const customerId = normCustomer(ctx, a.customerId)
    const shiftId = normShift(ctx, a.shiftId)

    const existing = await findByClientId(ctx, a.orderId)
    let oid: Id<'posOrders'>
    if (existing) {
      oid = existing._id
      if (!stockReturned(existing.status)) await returnStock(ctx, oid, a.orderId, 'order_resend')
      for (const i of await ctx.db.query('posOrderItems').withIndex('by_order', (q) => q.eq('orderId', oid)).collect())
        await ctx.db.delete('posOrderItems', i._id)
      // undo old customer / shift contributions, then re-apply with the new numbers
      await bumpCustomer(ctx, existing.customerId, -Math.floor(existing.total), -existing.total)
      await bumpShift(ctx, existing.shiftId, -existing.total)
      await ctx.db.patch('posOrders', oid, {
        subtotal: a.subtotal,
        tax: a.tax,
        total: a.total,
        paymentMethod: a.paymentMethod,
        orderType: a.orderType,
        timestamp: Date.now(),
        status,
        customerId: customerId ?? undefined,
        customerName: a.customerName ?? undefined,
        shiftId: shiftId ?? undefined,
        deliveryAddress: a.deliveryAddress ?? undefined,
        deliveryPhone: a.deliveryPhone ?? undefined,
        staffId: session.staffId ?? undefined,
      })
    } else {
      oid = await ctx.db.insert('posOrders', {
        clientId: a.orderId,
        subtotal: a.subtotal,
        tax: a.tax,
        total: a.total,
        paymentMethod: a.paymentMethod,
        orderType: a.orderType,
        timestamp: Date.now(),
        status,
        ...(customerId ? { customerId } : {}),
        ...(a.customerName ? { customerName: a.customerName } : {}),
        ...(shiftId ? { shiftId } : {}),
        ...(a.deliveryAddress ? { deliveryAddress: a.deliveryAddress } : {}),
        ...(a.deliveryPhone ? { deliveryPhone: a.deliveryPhone } : {}),
        ...(session.staffId ? { staffId: session.staffId } : {}),
        orderSource: 'pos',
      })
    }
    await insertLines(ctx, oid, lines)
    if (!stockReturned(status)) await reserveStock(ctx, lines, a.orderId)
    await bumpCustomer(ctx, customerId, Math.floor(a.total), a.total)
    await bumpShift(ctx, shiftId, a.total)
    return [{ order_id: a.orderId, status }]
  },
})

/** Generic upsert of order header fields (legacy upsertOrder). Does not touch items or stock. */
export const upsertOrder = mutation({
  args: { token, order: v.any() },
  handler: async (ctx, { token: t, order }) => {
    await requireRole(ctx, t, FRONT)
    if (!order?.id) throw new Error('INVALID_ORDER_ID')
    const patch: Record<string, unknown> = {}
    const map: Record<string, string> = {
      subtotal: 'subtotal',
      tax: 'tax',
      total: 'total',
      payment_method: 'paymentMethod',
      order_type: 'orderType',
      status: 'status',
      customer_name: 'customerName',
      delivery_address: 'deliveryAddress',
      delivery_phone: 'deliveryPhone',
      delivery_name: 'deliveryName',
      delivery_fee: 'deliveryFee',
      order_source: 'orderSource',
    }
    for (const [k, to] of Object.entries(map)) if (order[k] !== undefined && order[k] !== null) patch[to] = order[k]
    if (order.timestamp) patch.timestamp = Date.parse(order.timestamp)
    if (order.scheduled_for) patch.scheduledFor = Date.parse(order.scheduled_for)
    const cid = normCustomer(ctx, order.customer_id)
    if (cid) patch.customerId = cid
    const sid = normShift(ctx, order.shift_id)
    if (sid) patch.shiftId = sid
    const existing = await findByClientId(ctx, order.id)
    let oid: Id<'posOrders'>
    if (existing) {
      if (stockReturned(patch.status as string) && !stockReturned(existing.status))
        await returnStock(ctx, existing._id, order.id, 'order_void')
      await ctx.db.patch('posOrders', existing._id, patch)
      oid = existing._id
    } else {
      oid = await ctx.db.insert('posOrders', {
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentMethod: 'CASH',
        status: 'pending',
        timestamp: Date.now(),
        ...(patch as object),
        clientId: order.id,
      })
    }
    return await orderOut(ctx, (await ctx.db.get('posOrders', oid))!, false)
  },
})

/** Cancelling or refunding returns stock exactly once, like trigger_return_stock_on_void. */
export const updateOrderStatus = mutation({
  args: { token, id: v.string(), status: v.string() },
  handler: async (ctx, { token: t, id, status }) => {
    await requireRole(ctx, t, ALL_STAFF)
    const o = await findByClientId(ctx, id)
    if (!o) throw new Error('NOT_FOUND: order')
    if (stockReturned(status) && !stockReturned(o.status)) await returnStock(ctx, o._id, id, status === 'refunded' ? 'order_refund' : 'order_void')
    await ctx.db.patch('posOrders', o._id, { status })
    return await orderOut(ctx, (await ctx.db.get('posOrders', o._id))!, false)
  },
})

/** Legacy insertOrderItems: add lines to an existing order (deducts stock like the INSERT trigger). */
export const insertOrderItems = mutation({
  args: {
    token,
    items: v.array(
      v.object({
        order_id: v.string(),
        product_id: v.string(),
        quantity: v.number(),
        note: v.optional(v.union(v.string(), v.null())),
        modifiers: v.optional(v.union(v.array(v.string()), v.null())),
        unit_price: v.optional(v.union(v.number(), v.null())),
      }),
    ),
  },
  handler: async (ctx, { token: t, items }) => {
    await requireRole(ctx, t, FRONT)
    const out = []
    for (const it of items) {
      const o = await findByClientId(ctx, it.order_id)
      if (!o) throw new Error('NOT_FOUND: order')
      const [line] = await priceLines(ctx, [it], o.orderType, { requireKnown: true })
      if (it.unit_price != null) line.unitPrice = it.unit_price
      await insertLines(ctx, o._id, [line])
      if (!stockReturned(o.status)) await reserveStock(ctx, [line], it.order_id)
      out.push({ order_id: it.order_id, product_id: it.product_id, quantity: line.quantity })
    }
    return out
  },
})

/** clear_order_items: removes the lines (returning their stock if the order is still live). */
export const deleteOrderItems = mutation({
  args: { token, orderId: v.string() },
  handler: async (ctx, { token: t, orderId }) => {
    await requireRole(ctx, t, FRONT)
    const o = await findByClientId(ctx, orderId)
    if (!o) return null
    if (!stockReturned(o.status)) await returnStock(ctx, o._id, orderId, 'order_clear')
    for (const i of await ctx.db.query('posOrderItems').withIndex('by_order', (q) => q.eq('orderId', o._id)).collect())
      await ctx.db.delete('posOrderItems', i._id)
    return null
  },
})

/** POS "Clear Table": complete active sessions of a table and cancel its still-open orders (stock is returned). */
export const closeTable = mutation({
  args: { token, tableNumber: v.string(), cancelOpenOrders: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, FRONT)
    const table = (await ctx.db.query('restaurantTables').take(500)).find((x) => x.tableNumber === a.tableNumber)
    if (table) {
      const sessions = await ctx.db
        .query('tableSessions')
        .withIndex('by_table_and_status', (q) => q.eq('tableId', table._id).eq('status', 'active'))
        .collect()
      for (const s of sessions) await ctx.db.patch('tableSessions', s._id, { status: 'completed' })
    }
    let cancelled = 0
    if (a.cancelOpenOrders) {
      for (const st of ['pending', 'preparing', 'ready']) {
        const open = await ctx.db.query('posOrders').withIndex('by_status', (q) => q.eq('status', st)).take(1000)
        for (const o of open) {
          if (o.customerName !== a.tableNumber && o.customerName !== `Table ${a.tableNumber}`) continue
          await returnStock(ctx, o._id, o.clientId, 'order_void')
          await ctx.db.patch('posOrders', o._id, { status: 'cancelled' })
          cancelled++
        }
      }
    }
    return { cancelled }
  },
})

// ---------------------------------------------------------------- public: QR table / guest webstore orders
async function webTaxRate(ctx: Ctx) {
  const s = await ctx.db.query('posSettings').first()
  return s?.taxRate ?? 0.1
}

/**
 * Public order from the /store webstore (table QR or guest). Prices are recomputed server-side (the client can't set
 * totals). With a table session the order is attached to it; `addToExisting` appends items to the open order.
 */
export const placeWebstoreOrder = mutation({
  args: {
    orderId: v.string(),
    orderType: v.string(),
    paymentMethod: v.optional(v.string()),
    customerId: v.optional(v.union(v.string(), v.null())),
    customerName: v.optional(v.union(v.string(), v.null())),
    sessionId: v.optional(v.union(v.string(), v.null())),
    tableNumber: v.optional(v.union(v.string(), v.null())),
    addToExisting: v.optional(v.boolean()),
    items: v.array(orderItemArg),
  },
  handler: async (ctx, a) => {
    if (!a.orderId || a.orderId.length < 8) throw new Error('INVALID_ORDER_ID')
    if (!['dine_in', 'takeaway', 'delivery'].includes(a.orderType)) throw new Error('INVALID_ORDER_TYPE')
    if (a.items.length === 0 || a.items.length > 60) throw new Error('INVALID_ITEMS')
    const name = (a.customerName ?? '').trim().slice(0, 100)
    const pay = (a.paymentMethod ?? 'CASH').toUpperCase() === 'CARD' ? 'CARD' : 'CASH'

    let session: Doc<'tableSessions'> | null = null
    let table: Doc<'restaurantTables'> | null = null
    if (a.sessionId) {
      const sid = ctx.db.normalizeId('tableSessions', a.sessionId)
      session = sid ? await ctx.db.get('tableSessions', sid) : null
      if (!session || session.status !== 'active') throw new Error('SESSION_INVALID')
      table = await ctx.db.get('restaurantTables', session.tableId)
    } else if (a.tableNumber) {
      table = (await ctx.db.query('restaurantTables').take(500)).find((t) => t.tableNumber === a.tableNumber && t.isActive) ?? null
      if (!table) throw new Error('TABLE_NOT_FOUND')
    }
    if (a.orderType === 'dine_in' && !table) throw new Error('TABLE_NOT_FOUND')

    const lines = await priceLines(ctx, a.items, a.orderType, { requireActive: true, requireKnown: true })
    const addSub = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
    const rate = await webTaxRate(ctx)
    const customerId = normCustomer(ctx, a.customerId)

    if (!a.addToExisting) {
      const dup = await findByClientId(ctx, a.orderId)
      if (dup) return { order_id: dup.clientId, status: dup.status, subtotal: dup.subtotal, tax: dup.tax, total: dup.total, duplicate: true }
    }
    const OPEN_STATUSES = ['pending', 'preparing', 'ready']
    let existing = a.addToExisting ? await findByClientId(ctx, a.orderId) : null
    if (existing && !OPEN_STATUSES.includes(existing.status)) throw new Error('ORDER_CLOSED')
    // Dine-in orders from one table go on ONE bill: append to the table's open order instead of creating a new one.
    if (!existing && table && a.orderType === 'dine_in') {
      if (session?.orderId) {
        const o = await ctx.db.get('posOrders', session.orderId)
        if (o && OPEN_STATUSES.includes(o.status)) existing = o
      }
      if (!existing) {
        const since = session ? session._creationTime : Date.now() - 12 * 60 * 60 * 1000
        const open: Doc<'posOrders'>[] = []
        for (const st of OPEN_STATUSES)
          open.push(...(await ctx.db.query('posOrders').withIndex('by_status', (q) => q.eq('status', st)).take(1000)))
        existing =
          open
            .filter((o) => o.tableId === table!._id && o.orderSource === 'webstore' && o.timestamp >= since)
            .sort((x, y) => y.timestamp - x.timestamp)[0] ?? null
      }
    }
    let oid: Id<'posOrders'>
    let subtotal = addSub
    if (existing) {
      oid = existing._id
      subtotal = round2(existing.subtotal + addSub)
      const tax = round2(subtotal * rate)
      await ctx.db.patch('posOrders', oid, {
        subtotal,
        tax,
        total: round2(subtotal + tax),
        ...(existing.status === 'ready' ? { status: 'pending' } : {}),
      })
    } else {
      if (await findByClientId(ctx, a.orderId)) {
        const dup = (await findByClientId(ctx, a.orderId))!
        return { order_id: dup.clientId, status: dup.status, subtotal: dup.subtotal, tax: dup.tax, total: dup.total, duplicate: true }
      }
      const tax = round2(addSub * rate)
      oid = await ctx.db.insert('posOrders', {
        clientId: a.orderId,
        subtotal: addSub,
        tax,
        total: round2(addSub + tax),
        paymentMethod: pay,
        orderType: a.orderType,
        timestamp: Date.now(),
        status: 'pending',
        customerName: table ? `Table ${table.tableNumber}` : name || undefined,
        ...(customerId ? { customerId } : {}),
        ...(table ? { tableId: table._id } : {}),
        orderSource: 'webstore',
      })
    }
    await insertLines(ctx, oid, lines)
    await reserveStock(ctx, lines, a.orderId)
    const order = (await ctx.db.get('posOrders', oid))!
    await bumpCustomer(ctx, customerId, Math.floor(round2(addSub * (1 + rate))), round2(addSub * (1 + rate)))
    if (session) {
      await ctx.db.patch('tableSessions', session._id, {
        lastActivityAt: Date.now(),
        orderId: oid,
      })
    }
    return { order_id: order.clientId, status: order.status, subtotal: order.subtotal, tax: order.tax, total: order.total, duplicate: false }
  },
})

// ---------------------------------------------------------------- public: online ordering (port of place_online_order)
const DEFAULT_ONLINE_CFG = {
  enabled: true,
  timezone: 'Australia/Melbourne',
  hours: Object.fromEntries(
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { open: '16:30', close: '21:30' }]),
  ) as Record<string, { open: string; close: string } | null>,
  last_order_minutes_before_close: 30,
  prep_minutes: 30,
  delivery_extra_minutes: 15,
  slot_minutes: 15,
  schedule_days_ahead: 7,
  delivery_fee: 8,
  free_delivery_threshold: 250,
  lunch: { enabled: true, end_time: '', min_days_ahead: 1 },
}

const DOW: Record<string, string> = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' }

function localParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(ms))
  const g = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    dayIndex: Math.floor(Date.UTC(+g('year'), +g('month') - 1, +g('day')) / 86400000),
    minutes: (+g('hour') % 24) * 60 + +g('minute'),
    dow: DOW[g('weekday')],
  }
}
const toMin = (s: string) => {
  const [h, m] = s.split(':')
  return +h * 60 + +(m ?? 0)
}

export const placeOnlineOrder = mutation({
  args: { p: v.any() },
  handler: async (ctx, { p }) => {
    const orderId = String(p?.order_id ?? '')
    if (orderId.length < 8) throw new Error('INVALID_ORDER_ID')

    const dup = await findByClientId(ctx, orderId)
    if (dup)
      return {
        order_id: dup.clientId,
        status: dup.status,
        scheduled_for: toIso(dup.scheduledFor),
        subtotal: dup.subtotal,
        tax: dup.tax,
        delivery_fee: dup.deliveryFee ?? 0,
        total: dup.total,
        duplicate: true,
      }

    const settings = await ctx.db.query('posSettings').first()
    const cfg: any = { ...DEFAULT_ONLINE_CFG, ...((settings?.onlineOrdering as object | undefined) ?? {}) }
    cfg.lunch = { ...DEFAULT_ONLINE_CFG.lunch, ...(cfg.lunch ?? {}) }
    const taxRate = settings?.taxRate ?? 0.1
    if (cfg.enabled === false) throw new Error('ONLINE_ORDERING_DISABLED')

    const tz: string = cfg.timezone ?? 'Australia/Melbourne'
    const lastBefore = Number(cfg.last_order_minutes_before_close ?? 30)
    const prep = Number(cfg.prep_minutes ?? 30)
    const extra = Number(cfg.delivery_extra_minutes ?? 15)
    const daysAhead = Number(cfg.schedule_days_ahead ?? 7)
    const feeCfg = Number(cfg.delivery_fee ?? 8)
    const freeThr = Number(cfg.free_delivery_threshold ?? 250)
    const lunchEnabled = cfg.lunch.enabled !== false
    const lunchEnd = cfg.lunch.end_time ? toMin(String(cfg.lunch.end_time)) : 24 * 60
    const lunchDays = Number(cfg.lunch.min_days_ahead ?? 1)

    const type = String(p?.order_type ?? '')
    const name = String(p?.customer_name ?? '').trim()
    const phone = String(p?.phone ?? '').trim()
    const addr = String(p?.address ?? '').trim()
    const note = String(p?.note ?? '').trim() || undefined
    let pay = String(p?.payment_method || 'CASH').toUpperCase()
    const sched = p?.scheduled_for ? Date.parse(String(p.scheduled_for)) : undefined
    const items: Array<InLine> = Array.isArray(p?.items) ? p.items : []

    if (type !== 'delivery' && type !== 'takeaway') throw new Error('INVALID_ORDER_TYPE')
    if (name.length < 1 || name.length > 100) throw new Error('INVALID_NAME')
    if (phone.replace(/[^0-9]/g, '').length < 8 || phone.length > 30) throw new Error('INVALID_PHONE')
    if (type === 'delivery' && (addr.length < 5 || addr.length > 300)) throw new Error('INVALID_ADDRESS')
    if (pay !== 'CASH' && pay !== 'CARD') pay = 'CASH'
    if (items.length === 0 || items.length > 60) throw new Error('INVALID_ITEMS')

    const lines = await priceLines(ctx, items, type, { requireActive: true, requireKnown: true })
    const hasLunch = lines.some((l) => l.product?.is_lunch_special)
    // the first line carries the order note unless it has its own
    if (note && lines.length > 0 && !lines[0].note) lines[0].note = note
    const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))

    const now = Date.now()
    const local = localParts(now, tz)
    const window = (dow: string) => (cfg.hours?.[dow] ?? null) as { open: string; close: string } | null
    if (sched === undefined || Number.isNaN(sched)) {
      if (hasLunch) throw new Error('LUNCH_PREORDER_ONLY')
      const w = window(local.dow)
      if (!w) throw new Error('STORE_CLOSED')
      if (local.minutes < toMin(w.open) || local.minutes > toMin(w.close) - lastBefore) throw new Error('STORE_CLOSED')
    } else {
      if (sched < now + (prep + (type === 'delivery' ? extra : 0) - 5) * 60000) throw new Error('SLOT_TOO_SOON')
      if (sched > now + (daysAhead + 1) * 86400000) throw new Error('SLOT_TOO_FAR')
      const lt = localParts(sched, tz)
      const w = window(lt.dow)
      if (!w) throw new Error('SLOT_OUTSIDE_HOURS')
      if (lt.minutes < toMin(w.open) || lt.minutes > toMin(w.close) - lastBefore) throw new Error('SLOT_OUTSIDE_HOURS')
      if (hasLunch) {
        if (!lunchEnabled) throw new Error('LUNCH_DISABLED')
        if (lt.dayIndex < local.dayIndex + lunchDays || lt.minutes > lunchEnd) throw new Error('LUNCH_SLOT_INVALID')
      }
    }

    const fee = type === 'delivery' && subtotal < freeThr ? feeCfg : 0
    const tax = round2(subtotal * taxRate)
    const total = round2(subtotal + tax + fee)
    const customerId = normCustomer(ctx, p?.customer_id)

    const oid = await ctx.db.insert('posOrders', {
      clientId: orderId,
      subtotal,
      tax,
      total,
      paymentMethod: pay,
      orderType: type,
      timestamp: now,
      status: 'pending',
      customerName: name,
      deliveryName: name,
      deliveryPhone: phone,
      ...(type === 'delivery' ? { deliveryAddress: addr } : {}),
      ...(customerId ? { customerId } : {}),
      ...(sched !== undefined && !Number.isNaN(sched) ? { scheduledFor: sched } : {}),
      orderSource: 'online',
      deliveryFee: fee,
    })
    await insertLines(ctx, oid, lines)
    await reserveStock(ctx, lines, orderId)
    await bumpCustomer(ctx, customerId, Math.floor(total), total)
    return {
      order_id: orderId,
      status: 'pending',
      scheduled_for: sched !== undefined && !Number.isNaN(sched) ? new Date(sched).toISOString() : null,
      subtotal,
      tax,
      delivery_fee: fee,
      total,
      duplicate: false,
    }
  },
})

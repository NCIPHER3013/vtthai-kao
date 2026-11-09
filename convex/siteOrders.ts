// Public order tracking for the customer website (read-only, minimal fields).
import { v } from 'convex/values'
import { query } from './_generated/server'

// POS/KDS statuses -> labels the website's tracker understands
const STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  preparing: 'cooking',
  completed: 'ready',
  cancelled: 'cancelled',
}

export const trackByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const p = phone.trim()
    if (p.length < 6) return []
    const orders = await ctx.db
      .query('posOrders')
      .withIndex('by_delivery_phone', (q) => q.eq('deliveryPhone', p))
      .order('desc')
      .take(20)
    const out = []
    for (const o of orders) {
      const items = await ctx.db
        .query('posOrderItems')
        .withIndex('by_order', (q) => q.eq('orderId', o._id))
        .collect()
      out.push({
        _id: o._id as string,
        _creationTime: o.timestamp,
        status: STATUS_MAP[o.status] ?? o.status,
        orderType: o.orderType === 'delivery' ? 'delivery' : 'takeaway',
        customerName: o.customerName ?? '',
        customerPhone: p,
        deliveryAddress: o.deliveryAddress,
        notes: items.find((i) => i.note)?.note,
        items: items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          priceAud: i.unitPrice,
          notes: i.note,
        })),
        subtotalAud: o.subtotal,
        taxAud: o.tax,
        totalAud: o.total,
      })
    }
    return out
  },
})

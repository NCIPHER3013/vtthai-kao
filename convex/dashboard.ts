import { v } from 'convex/values'
import { query } from './_generated/server'

export const getReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { startDate, endDate } = args

    const allOrders: Array<any> = []
    for await (const doc of ctx.db.query('orders').order('desc')) {
      if (doc._creationTime < startDate) break
      if (doc._creationTime <= endDate) {
        allOrders.push(doc)
      }
      if (allOrders.length >= 500) break
    }

    const allReservations: Array<any> = []
    for await (const doc of ctx.db.query('reservations').order('desc')) {
      if (doc._creationTime < startDate) break
      if (doc._creationTime <= endDate) {
        allReservations.push(doc)
      }
      if (allReservations.length >= 500) break
    }

    const allContacts: Array<any> = []
    for await (const doc of ctx.db.query('contacts').order('desc')) {
      if (doc._creationTime < startDate) break
      if (doc._creationTime <= endDate) {
        allContacts.push(doc)
      }
      if (allContacts.length >= 500) break
    }

    const ordersByStatus: Record<string, number> = {}
    let totalRevenue = 0
    let totalOrderItems = 0
    let totalSubtotal = 0
    let totalTax = 0

    for (const order of allOrders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1
      totalRevenue += order.totalAud
      totalSubtotal += order.subtotalAud ?? order.totalAud
      totalTax += order.taxAud ?? 0
      totalOrderItems += order.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      )
    }

    const reservationsByStatus: Record<string, number> = {}
    let totalGuests = 0

    for (const res of allReservations) {
      reservationsByStatus[res.status] =
        (reservationsByStatus[res.status] || 0) + 1
      totalGuests += res.numberOfGuests
    }

    const contactsByType: Record<string, number> = {}
    for (const c of allContacts) {
      contactsByType[c.type] = (contactsByType[c.type] || 0) + 1
    }

    const ordersByDay: Record<
      string,
      | { count: number; revenue: number; subtotal: number; tax: number }
      | undefined
    > = {}
    for (const order of allOrders) {
      const dayKey = new Date(order._creationTime).toISOString().split('T')[0]
      let dayData = ordersByDay[dayKey]
      if (!dayData) {
        dayData = { count: 0, revenue: 0, subtotal: 0, tax: 0 }
        ordersByDay[dayKey] = dayData
      }
      dayData.count++
      dayData.revenue += order.totalAud
      dayData.subtotal += order.subtotalAud ?? order.totalAud
      dayData.tax += order.taxAud ?? 0
    }

    const reservationsByDay: Record<string, number> = {}
    for (const res of allReservations) {
      const dayKey = new Date(res._creationTime).toISOString().split('T')[0]
      reservationsByDay[dayKey] = (reservationsByDay[dayKey] || 0) + 1
    }

    const topMenuItems: Record<
      string,
      { title: string; quantity: number; revenue: number } | undefined
    > = {}
    for (const order of allOrders) {
      for (const item of order.items) {
        let topItem = topMenuItems[item.menuId]
        if (!topItem) {
          topItem = {
            title: item.title,
            quantity: 0,
            revenue: 0,
          }
          topMenuItems[item.menuId] = topItem
        }
        topItem.quantity += item.quantity
        topItem.revenue += item.priceAud * item.quantity
      }
    }

    const topMenus = (
      Object.values(topMenuItems).filter(Boolean) as Array<{
        title: string
        quantity: number
        revenue: number
      }>
    )
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const orderTypes: Record<string, number> = {}
    for (const order of allOrders) {
      orderTypes[order.orderType] = (orderTypes[order.orderType] || 0) + 1
    }

    type OrderItemSummary = {
      menuId: string
      title: string
      quantity: number
      revenue: number
      orders: Array<{
        _id: string
        customerName: string
        orderType: string
        totalAud: number
        subtotalAud: number
        taxAud: number
        status: string
        _creationTime: number
      }>
    }
    const orderItemsDetail: Array<OrderItemSummary> = []
    const menuMap: Record<
      string,
      (typeof orderItemsDetail)[number] | undefined
    > = {}
    for (const order of allOrders) {
      for (const item of order.items) {
        let menuDetail = menuMap[item.menuId]
        if (!menuDetail) {
          menuDetail = {
            menuId: item.menuId,
            title: item.title,
            quantity: 0,
            revenue: 0,
            orders: [],
          }
          menuMap[item.menuId] = menuDetail
        }
        menuDetail.quantity += item.quantity
        menuDetail.revenue += item.priceAud * item.quantity
        menuDetail.orders.push({
          _id: order._id,
          customerName: order.customerName,
          orderType: order.orderType,
          totalAud: order.totalAud,
          subtotalAud: order.subtotalAud ?? order.totalAud,
          taxAud: order.taxAud ?? 0,
          status: order.status,
          _creationTime: order._creationTime,
        })
      }
    }
    orderItemsDetail.push(
      ...(
        Object.values(menuMap).filter(Boolean) as Array<OrderItemSummary>
      ).sort((a, b) => b.quantity - a.quantity),
    )

    return {
      summary: {
        totalOrders: allOrders.length,
        totalRevenue,
        totalSubtotal,
        totalTax,
        totalOrderItems,
        totalReservations: allReservations.length,
        totalGuests,
        totalMessages: allContacts.length,
      },
      ordersByStatus,
      reservationsByStatus,
      contactsByType,
      orderTypes,
      ordersByDay,
      reservationsByDay,
      topMenus,
      orderItemsDetail,
    }
  },
})

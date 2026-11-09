import { q, m, api } from '../convex';
import type { Order, OrderItem } from '../supabase';

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { products?: { id: string; name: string; price: number; category: string } })[];
}

// Recipes / stock now live in ./recipes; re-exported here because several pages import them from './orders'.
export { fetchRecipes, fetchStockItems, fetchAllSubRecipeIngredients } from './recipes';

const asOrders = (x: unknown) => x as OrderWithItems[];

export async function fetchOrders(): Promise<OrderWithItems[]> {
  return asOrders(await q(api.posOrders.listOrders, {}));
}

export async function fetchOrdersByStatus(status: string): Promise<OrderWithItems[]> {
  return asOrders(await q(api.posOrders.listOrders, { statuses: [status] }));
}

export async function fetchOrdersByDateRange(from: string, to: string): Promise<OrderWithItems[]> {
  return asOrders(await q(api.posOrders.listOrders, { from, to }));
}

/** Orders that count as sales for reports/dashboards: cancelled and refunded orders are excluded. */
export async function fetchSalesByDateRange(from: string, to: string): Promise<OrderWithItems[]> {
  const all = await fetchOrdersByDateRange(from, to);
  return all.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
}

export async function fetchActiveOrders(): Promise<OrderWithItems[]> {
  return asOrders(await q(api.posOrders.listOrders, { statuses: ['pending', 'preparing'], ascending: true }));
}

export async function fetchOrdersByCustomer(customerId: string): Promise<Order[]> {
  return (await q(api.posOrders.listOrders, { customerId, withItems: false })) as unknown as Order[];
}

export async function fetchOrderById(id: string): Promise<OrderWithItems | null> {
  return (await q(api.posOrders.getOrder, { id })) as unknown as OrderWithItems | null;
}

export async function upsertOrder(order: Record<string, any> & { id: string }): Promise<Order> {
  return (await m(api.posOrders.upsertOrder, { order })) as unknown as Order;
}

export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  return (await m(api.posOrders.updateOrderStatus, { id, status })) as unknown as Order;
}

export async function insertOrderItems(
  items: {
    order_id: string;
    product_id: string;
    quantity: number;
    note?: string | null;
    modifiers?: string[] | null;
    unit_price?: number | null;
  }[]
) {
  return m(api.posOrders.insertOrderItems, { items });
}

export async function deleteOrderItems(orderId: string) {
  return m(api.posOrders.deleteOrderItems, { orderId });
}

export interface ProcessOrderParams {
  orderId: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  orderType: string;
  status?: string;
  customerId?: string | null;
  customerName?: string | null;
  shiftId?: string | null;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  items: { product_id: string; quantity: number; note?: string | null; modifiers?: string[] | null; unit_price?: number | null }[];
}

/** Atomic: order upsert + items + stock (blocks on INSUFFICIENT_STOCK when enforced) + customer points + shift sales. */
export async function processOrderAtomic(params: ProcessOrderParams) {
  return (await m(api.posOrders.processOrder, {
    orderId: params.orderId,
    subtotal: params.subtotal,
    tax: params.tax,
    total: params.total,
    paymentMethod: params.paymentMethod,
    orderType: params.orderType,
    status: params.status,
    customerId: params.customerId,
    customerName: params.customerName,
    shiftId: params.shiftId,
    deliveryAddress: params.deliveryAddress,
    deliveryPhone: params.deliveryPhone,
    items: params.items,
  })) as { order_id: string; status: string }[];
}

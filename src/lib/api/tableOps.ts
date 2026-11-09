import { q, m, api } from '../convex';
import type { Customer } from '../supabase';
import type { OrderWithItems } from './orders';

/** Open order (with items) of a POS table + its customer, or null when the table has none. */
export async function fetchTableOrder(tableNumber: string) {
  return (await q(api.posOrders.getTableOrder, { tableNumber })) as unknown as {
    order: OrderWithItems;
    customer: Customer | null;
  } | null;
}

/** Complete the table's active sessions; optionally cancel its still-open orders (stock is returned). */
export async function closeTable(tableNumber: string, cancelOpenOrders = false) {
  return (await m(api.posOrders.closeTable, { tableNumber, cancelOpenOrders })) as { cancelled: number };
}

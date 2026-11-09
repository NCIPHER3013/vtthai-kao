import { convex, api } from '../convex';
import { DbError } from './errors';

export interface OnlineOrderItemInput {
  product_id: string;
  quantity: number;
  modifiers: string[];
  note?: string | null;
}

export interface PlaceOnlineOrderInput {
  order_id: string;
  order_type: 'delivery' | 'takeaway';
  customer_name: string;
  phone: string;
  address?: string;
  note?: string;
  payment_method: 'CASH' | 'CARD';
  customer_id?: string | null;
  scheduled_for?: string | null;
  items: OnlineOrderItemInput[];
}

export interface PlaceOnlineOrderResult {
  order_id: string;
  status: string;
  scheduled_for: string | null;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  duplicate: boolean;
}

/** Public (no login): the server validates hours/slots/prices and deducts stock. */
export async function placeOnlineOrder(input: PlaceOnlineOrderInput): Promise<PlaceOnlineOrderResult> {
  try {
    return (await convex.mutation(api.posOrders.placeOnlineOrder, { p: input })) as PlaceOnlineOrderResult;
  } catch (e) {
    throw new DbError(e, 'orders', 'placeOnlineOrder');
  }
}

export interface WebstoreOrderInput {
  orderId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  paymentMethod?: 'CASH' | 'CARD';
  customerId?: string | null;
  customerName?: string | null;
  sessionId?: string | null;
  tableNumber?: string | null;
  addToExisting?: boolean;
  items: { product_id: string; quantity: number; note?: string | null; modifiers?: string[] | null }[];
}

/** Public /store order (QR table or guest). Prices are recomputed on the server. */
export async function placeWebstoreOrder(input: WebstoreOrderInput) {
  try {
    return (await convex.mutation(api.posOrders.placeWebstoreOrder, input)) as {
      order_id: string;
      status: string;
      subtotal: number;
      tax: number;
      total: number;
      duplicate: boolean;
    };
  } catch (e) {
    throw new DbError(e, 'orders', 'placeWebstoreOrder');
  }
}

/** Public: status of an order (used by the QR webstore to decide whether items can still be added). */
export async function fetchWebstoreOrderStatus(orderId: string): Promise<string | null> {
  try {
    const r = (await convex.query(api.posOrders.webstoreOrderStatus, { orderId })) as { status: string } | null;
    return r?.status ?? null;
  } catch (e) {
    throw new DbError(e, 'orders', 'fetchWebstoreOrderStatus');
  }
}

import type { Product } from '../lib/supabase';

export type StoreMode = 'dine_in' | 'takeaway' | 'delivery';

export interface SelectedOption {
  group: string;
  name: string;
  price: number;
}

export interface CartLine {
  key: string;
  product: Product;
  qty: number;
  options: SelectedOption[];
  unitPrice: number;
}

export interface TableInfo {
  id: string;
  table_number: string;
  zone: string;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email?: string;
  points: number;
}

export interface CustomizationGroupRaw {
  name: string;
  required?: boolean;
  multiple?: boolean;
  options: any[];
}

export function optionPrice(o: any, mode: StoreMode): number {
  if (mode === 'delivery' && typeof o.price_delivery === 'number') return o.price_delivery;
  if (mode === 'takeaway' && typeof o.price_takeaway === 'number') return o.price_takeaway;
  if (typeof o.price === 'number') return o.price;
  if (typeof o.priceAdjustment === 'number') return o.priceAdjustment;
  if (typeof o.price_adjustment === 'number') return o.price_adjustment;
  return 0;
}

export function productPrice(p: Product, mode: StoreMode): number {
  if (mode === 'delivery' && typeof p.price_delivery === 'number') return p.price_delivery as number;
  if (mode === 'takeaway' && typeof p.price_takeaway === 'number') return p.price_takeaway as number;
  return p.price;
}

export const LOGO_URL =
  '/logo.png';

export const BANNER_URL =
  '/banner.webp';

export const HIDDEN_PRODUCT_CATEGORIES = new Set(['sub-recipe', 'extras']);

export function isCustomerFacing(p: { category: string }): boolean {
  return !HIDDEN_PRODUCT_CATEGORIES.has((p.category || '').toLowerCase());
}

export const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

export type Category = 'Coffee' | 'Pastry' | 'Food' | string;

export interface CustomizationOption {
  name: string;
  price: number;
  price_adjustment?: number;
  price_takeaway?: number;
  price_delivery?: number;
}

export interface CustomizationGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  options: CustomizationOption[];
}

export interface Product {
  id: string;
  plu?: string;
  name: string;
  middle_name?: string;
  description?: string;
  price: number;
  price_takeaway?: number;
  price_delivery?: number;
  customizations?: CustomizationGroup[];
  category: Category;
  color_label?: string;
  is_active?: boolean;
  image_url?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  is_healthy?: boolean;
  is_gluten_free?: boolean;
  is_vegan?: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  modifiers?: string[]; // Note from existing schema
  note?: string;
  selectedOptions?: { group: string; option: CustomizationOption }[];
  effectivePrice?: number;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
}

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  items?: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;
  order_type?: 'dine_in' | 'takeaway' | 'delivery';
  timestamp: Date | string;
  delivery_address?: string;
  delivery_phone?: string;
  customerName?: string;
  customer_name?: string;
  customer_id?: string;
  status?: OrderStatus;
  shift_id?: string;
  generated_gift_cards?: GiftCard[];
}

export interface Shift {
  id: string;
  started_at: string;
  ended_at?: string | null;
  starting_cash: number;
  expected_cash?: number | null;
  actual_cash?: number | null;
  total_sales: number;
  status: 'open' | 'closed';
  notes?: string | null;
  opened_by?: string | null;
  closed_by?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  total_spent: number;
  created_at?: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initial_value: number;
  current_balance: number;
  purchase_price: number;
  customer_id?: string;
  status: 'active' | 'depleted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at?: string;
  notes?: string;
}

export interface GiftCardTransaction {
  id: string;
  gift_card_id: string;
  order_id?: string;
  amount: number;
  transaction_type: 'redemption' | 'reload' | 'issue';
  created_at: string;
  notes?: string;
}

export interface HardwareConfig {
  receiptPrinterIp: string;
  kitchenPrinterIp: string;
  cashDrawerEnabled: boolean;
  cashDrawerPath: string;
}

export interface Settings {
  online_ordering?: import('./lib/onlineOrdering').OnlineOrderingConfig | null;
  id: number;
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_id?: string;
  tax_rate: number;
  holiday_surcharge?: number;
  eftpos_surcharge?: number;
  receipt_header: string;
  receipt_footer: string;
  default_starting_cash: number;
  hardware_config?: HardwareConfig;
  currency?: string;
  currency_locale?: string;
  payment_ratio_target?: number;
}

export interface SubRecipeIngredient {
  id: string | number;
  parent_item_id: string | number;
  child_item_id: string | number;
  quantity: number;
}

// Legacy pos-lite row types. The Supabase client is gone: data comes from Convex through src/lib/api/*.
// All ids are Convex id strings now (stock items, order items, suppliers ... used to be numbers/uuids).
export type Product = {
  id: string;
  plu?: string;
  name: string;
  middle_name?: string;
  description?: string;
  price: number;
  price_takeaway?: number;
  price_delivery?: number;
  category: string;
  color_label: string;
  created_at?: string;
  is_active?: boolean;
  image_url?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  is_healthy?: boolean;
  is_gluten_free?: boolean;
  is_vegan?: boolean;
  is_lunch_special?: boolean;
  customizations?: any[];
};

export type StaffPin = {
  id: string;
  name: string;
  pin: string;
  role: string;
  is_active?: boolean;
};

export type StockItem = {
  id: string;
  item_id?: string;
  plu?: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  cost_per_unit: number;
  current_stock: number;
  status: string;
  notes?: string;
  selected_supplier?: string;
  source_type?: string;
  created_at?: string;
  updated_at?: string;
};

export type ItemSupplier = {
  id: string;
  item_id: string;
  supplier_id: string;
  price: number;
  is_preferred?: boolean;
  created_at?: string;
  suppliers?: Supplier;
};

export type SubRecipeIngredient = {
  id: string;
  parent_item_id: string;
  child_item_id: string;
  quantity: number;
  created_at?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
  created_at?: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total_amount: number;
  notes?: string;
  expected_date?: string;
  created_at?: string;
  updated_at?: string;
  suppliers?: Supplier;
};

export type PurchaseOrderItem = {
  id: string;
  po_id: string;
  inventory_item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
  stock_items?: StockItem;
};

export type Recipe = {
  id: string;
  product_id: string;
  inventory_item_id: string;
  quantity: number;
  variant?: string | null;
  created_at?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  total_spent: number;
  last_visit?: string | null;
  visit_count?: number;
  created_at?: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  master_plu?: string;
  created_at?: string;
};

export type InventoryCategory = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};
export type Order = {
  id: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  timestamp: string;
  status: string;
  shift_id?: string;
  customer_id?: string;
  customer_name?: string;
  delivery_address?: string;
  delivery_phone?: string;
  order_type: string;
  scheduled_for?: string | null;
  order_source?: string;
  delivery_fee?: number;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  note?: string;
  modifiers?: any[];
  products?: Product;
};

export type RestaurantTable = {
  id: string;
  table_number: string;
  zone: string;
  capacity: number;
  is_active: boolean;
  qr_token?: string;
};

export type TableSession = {
  id: string;
  table_id: string;
  session_token: string;
  status: 'active' | 'expired' | 'completed';
  order_id?: string;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
};

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  notes?: string | null;
  status: string;
  created_at: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  cover_image_url?: string;
  author?: string;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  published: boolean;
  published_at: string;
  created_at: string;
};

export type Shift = {
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
};

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  sort_order numeric not null default 0
);

create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  title text not null,
  thai text,
  category text not null,
  prices jsonb,
  heat text not null,
  tags text[],
  description text,
  image_url text,
  image_storage_path text,
  plu text,
  color_label text,
  is_lunch_special boolean,
  nutrition jsonb,
  customizations jsonb,
  available boolean not null default true,
  featured boolean,
  gallery boolean,
  sort_order numeric not null default 0,
  variants jsonb
);
create index if not exists menus_category_idx on menus (category);
create index if not exists menus_available_idx on menus (available);
create index if not exists menus_title_search_idx on menus using gin (to_tsvector('simple', title));

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  price_aud numeric,
  badge text not null,
  image_url text,
  image_storage_path text,
  active boolean not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  sort_order numeric not null default 0
);
create index if not exists promotions_active_idx on promotions (active, start_date, end_date);

create table if not exists web_orders (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  order_type text not null,
  items jsonb not null,
  subtotal_aud numeric not null,
  tax_aud numeric not null,
  total_aud numeric not null,
  notes text,
  status text not null,
  delivery_address text
);
create index if not exists web_orders_status_idx on web_orders (status);
create index if not exists web_orders_phone_idx on web_orders (customer_phone);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  number_of_guests numeric not null,
  date text not null,
  time text not null,
  notes text,
  status text not null
);
create index if not exists reservations_status_idx on reservations (status);
create index if not exists reservations_date_idx on reservations (date);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  topic text,
  message text not null,
  type text not null
);

create table if not exists site_info (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  key text not null unique,
  value text not null
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  cover_image_storage_path text,
  author text not null,
  tags text[],
  published boolean not null,
  published_at timestamptz,
  featured boolean,
  sort_order numeric not null default 0,
  seo_title text,
  seo_description text,
  seo_canonical_url text,
  seo_og_image text
);
create index if not exists blog_posts_published_idx on blog_posts (published, published_at);

create table if not exists seo_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  page_path text not null unique,
  title text,
  description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  noindex boolean,
  custom_json_ld text
);

create table if not exists tracking_codes (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  code text not null,
  position text not null,
  page_target text not null,
  active boolean not null,
  sort_order numeric not null default 0
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  address text,
  phone text,
  timezone text,
  is_active boolean not null default true
);

create table if not exists pos_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  location_id uuid references locations(id),
  is_global boolean,
  store_name text,
  store_address text,
  store_phone text,
  tax_id text,
  tax_rate numeric not null,
  enforce_stock boolean,
  receipt_header text,
  receipt_footer text,
  default_starting_cash numeric,
  holiday_surcharge numeric,
  eftpos_surcharge numeric,
  online_ordering jsonb,
  currency text,
  currency_locale text,
  hardware_config jsonb,
  hardware_auto_print boolean,
  hardware_cash_drawer_auto_open boolean,
  payment_ratio_target numeric,
  cogs_target numeric,
  labor_target numeric
);
create index if not exists pos_settings_location_idx on pos_settings (location_id);

create table if not exists staff_pins (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  pin_hash text not null,
  role text not null check (role in ('ADMIN','MANAGER','CASHIER','KITCHEN')),
  location_id uuid references locations(id)
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  token text not null unique,
  role text not null,
  name text not null,
  staff_id uuid references staff_pins(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  table_number text not null,
  zone text,
  capacity numeric,
  is_active boolean not null default true,
  qr_token text unique,
  location_id uuid references locations(id)
);

create table if not exists inventory_categories (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null unique
);

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  item_code text,
  name text not null,
  category text,
  unit text,
  reorder_level numeric,
  cost_per_unit numeric,
  current_stock numeric not null default 0,
  status text,
  notes text,
  selected_supplier text,
  source_type text,
  plu text,
  location_id uuid references locations(id),
  legacy_id numeric
);
create index if not exists stock_items_category_idx on stock_items (category);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  legacy_id text
);

create table if not exists item_suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  item_id uuid not null references stock_items(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  price numeric not null,
  is_preferred boolean not null default false
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  menu_id uuid not null references menus(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  quantity numeric not null,
  variant text
);
create index if not exists recipes_menu_idx on recipes (menu_id);

create table if not exists sub_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  parent_item_id uuid not null references stock_items(id) on delete cascade,
  child_item_id uuid not null references stock_items(id) on delete cascade,
  quantity numeric not null
);

create table if not exists inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  type text,
  change_type text,
  quantity numeric,
  previous_stock numeric,
  new_stock numeric,
  notes text,
  reference_id text,
  location_id uuid references locations(id)
);
create index if not exists inventory_ledger_item_idx on inventory_ledger (stock_item_id);

create table if not exists waste_log (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  location_id uuid references locations(id),
  quantity numeric not null,
  reason text,
  cost numeric,
  recorded_by uuid references staff_pins(id),
  recorded_at timestamptz not null,
  notes text
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  po_number text,
  supplier_id uuid references suppliers(id),
  status text not null,
  total_amount numeric,
  notes text,
  expected_date text,
  received_at timestamptz,
  received_by uuid references staff_pins(id)
);
create index if not exists purchase_orders_status_idx on purchase_orders (status);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id),
  quantity_ordered numeric not null,
  quantity_received numeric,
  unit_price numeric not null,
  total_price numeric not null
);

create table if not exists stocktakes (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text,
  status text not null,
  created_by text,
  started_at timestamptz not null,
  completed_at timestamptz,
  notes text,
  total_items numeric,
  total_variance numeric
);

create table if not exists stocktake_items (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  stocktake_id uuid not null references stocktakes(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id),
  system_quantity numeric,
  actual_quantity numeric,
  unit text,
  unit_cost numeric,
  note text,
  variance numeric generated always as (coalesce(actual_quantity, 0) - coalesce(system_quantity, 0)) stored,
  variance_value numeric generated always as ((coalesce(actual_quantity, 0) - coalesce(system_quantity, 0)) * coalesce(unit_cost, 0)) stored
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  started_at timestamptz not null,
  ended_at timestamptz,
  starting_cash numeric not null,
  expected_cash numeric,
  actual_cash numeric,
  total_sales numeric not null default 0,
  status text not null,
  notes text,
  opened_by_staff uuid references staff_pins(id),
  closed_by_staff uuid references staff_pins(id),
  location_id uuid references locations(id)
);
create index if not exists shifts_status_idx on shifts (status);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  points numeric not null default 0,
  total_spent numeric not null default 0,
  last_visit timestamptz,
  visit_count numeric not null default 0
);
create index if not exists customers_phone_idx on customers (phone);

create table if not exists pos_orders (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  payment_method text not null,
  status text not null,
  order_type text,
  "timestamp" timestamptz not null,
  shift_id uuid references shifts(id),
  customer_id uuid references customers(id),
  customer_name text,
  delivery_address text,
  delivery_phone text,
  delivery_name text,
  location_id uuid references locations(id),
  staff_id uuid references staff_pins(id),
  table_id uuid references restaurant_tables(id),
  source text,
  client_id text not null unique,
  scheduled_for timestamptz,
  order_source text,
  delivery_fee numeric,
  slip_storage_path text
);
create index if not exists pos_orders_status_idx on pos_orders (status);
create index if not exists pos_orders_shift_idx on pos_orders (shift_id);
create index if not exists pos_orders_timestamp_idx on pos_orders ("timestamp");
create index if not exists pos_orders_delivery_phone_idx on pos_orders (delivery_phone);

create table if not exists pos_order_items (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  order_id uuid not null references pos_orders(id) on delete cascade,
  menu_id uuid references menus(id) on delete set null,
  title text not null,
  quantity numeric not null,
  unit_price numeric not null,
  note text,
  modifiers text[],
  subtotal numeric generated always as (quantity * unit_price) stored
);
create index if not exists pos_order_items_order_idx on pos_order_items (order_id);
create index if not exists pos_order_items_menu_idx on pos_order_items (menu_id);

create table if not exists table_sessions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  session_token text not null unique,
  status text not null,
  order_id uuid references pos_orders(id) on delete set null,
  expires_at timestamptz,
  last_activity_at timestamptz
);
create index if not exists table_sessions_table_status_idx on table_sessions (table_id, status);

create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  order_id uuid not null references pos_orders(id) on delete cascade,
  method text not null,
  amount numeric not null,
  reference text,
  status text not null,
  processed_at timestamptz not null,
  notes text
);

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references pos_orders(id) on delete set null,
  points_delta numeric not null,
  reason text
);

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  code text not null unique,
  initial_value numeric not null,
  current_balance numeric not null,
  purchase_price numeric not null,
  customer_id uuid references customers(id),
  status text not null,
  expires_at timestamptz,
  notes text
);

create table if not exists gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  order_id uuid references pos_orders(id) on delete set null,
  amount numeric not null,
  transaction_type text not null,
  notes text
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  legacy_convex_id text unique,
  created_at timestamptz not null default now(),
  date text not null,
  category text,
  amount numeric not null,
  description text,
  recurring boolean not null default false,
  location_id uuid references locations(id)
);
create index if not exists expenses_date_idx on expenses (date);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "public read menus" on menus for select using (available);
create policy "public read menu_categories" on menu_categories for select using (true);
create policy "public read promotions" on promotions for select using (active);
create policy "public read blog_posts" on blog_posts for select using (published);
create policy "public read seo_settings" on seo_settings for select using (true);
create policy "public read tracking_codes" on tracking_codes for select using (active);
create policy "public insert contacts" on contacts for insert with check (true);
create policy "public insert reservations" on reservations for insert with check (true);

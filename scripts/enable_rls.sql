-- ============================================================
-- Hampton Park Thai Halal Restaurant: Enable RLS + Create Policies for all tables
-- Run in Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- Phase 1: Enable Row Level Security on all 24 tables
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Phase 2: Create Policies
-- ============================================================

-- ----------------------------------------------------------
-- orders: Full CRUD (used by POSPage, KDSPage, OrdersPage, WebstorePage, ChatbotPage)
-- .upsert() requires both INSERT and UPDATE permissions
-- Realtime subscription active
-- ----------------------------------------------------------

CREATE POLICY "anon_select_orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_orders" ON public.orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_orders" ON public.orders FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- order_items: SELECT, INSERT, DELETE (no UPDATE — items are deleted+re-inserted)
-- Used by: POSPage, KDSPage, MenuAnalysisPage, ReportsPage, DashboardPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_order_items" ON public.order_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_order_items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_order_items" ON public.order_items FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- staff_pins: Full CRUD
-- Used by: LoginPage, StaffPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_staff_pins" ON public.staff_pins FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_staff_pins" ON public.staff_pins FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_staff_pins" ON public.staff_pins FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_staff_pins" ON public.staff_pins FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- inventory_items: UNUSED — no policies (fully locked)
-- App uses stock_items instead
-- ----------------------------------------------------------

-- (No policies = fully locked for anon)

-- ----------------------------------------------------------
-- product_categories: Full CRUD
-- Used by: MenuPage, POSPage, WebstorePage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_product_categories" ON public.product_categories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_product_categories" ON public.product_categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_product_categories" ON public.product_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_product_categories" ON public.product_categories FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- suppliers: SELECT, INSERT, UPDATE (no DELETE from app)
-- Used by: InventoryPage, PurchaseOrderPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_suppliers" ON public.suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_suppliers" ON public.suppliers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_suppliers" ON public.suppliers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- recipes: SELECT, INSERT, DELETE (no UPDATE in app)
-- Used by: RecipePage, POSPage, MenuAnalysisPage, ProfitLossPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_recipes" ON public.recipes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_recipes" ON public.recipes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_recipes" ON public.recipes FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- shifts: SELECT, INSERT, UPDATE (no DELETE)
-- Used by: POSPage, ShiftPage
-- Realtime subscription active
-- ----------------------------------------------------------

CREATE POLICY "anon_select_shifts" ON public.shifts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_shifts" ON public.shifts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_shifts" ON public.shifts FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- customers: SELECT, INSERT, UPDATE (no DELETE)
-- Used by: CRMPage, POSPage, WebstorePage, ChatbotPage
-- Realtime subscription active
-- ----------------------------------------------------------

CREATE POLICY "anon_select_customers" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_customers" ON public.customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_customers" ON public.customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- stock_items: Full CRUD
-- Used by: InventoryPage, POSPage, PurchaseOrderPage, RecipePage, StocktakePage, DashboardPage
-- Realtime subscription active
-- ----------------------------------------------------------

CREATE POLICY "anon_select_stock_items" ON public.stock_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stock_items" ON public.stock_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_stock_items" ON public.stock_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_stock_items" ON public.stock_items FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- gift_card_transactions: INSERT only (append-only)
-- Used by: POSPage
-- ----------------------------------------------------------

CREATE POLICY "anon_insert_gift_card_transactions" ON public.gift_card_transactions FOR INSERT TO anon WITH CHECK (true);

-- ----------------------------------------------------------
-- item_suppliers: SELECT, INSERT
-- Used by: InventoryPage, PurchaseOrderPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_item_suppliers" ON public.item_suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_item_suppliers" ON public.item_suppliers FOR INSERT TO anon WITH CHECK (true);

-- ----------------------------------------------------------
-- sub_recipe_ingredients: SELECT, INSERT, DELETE
-- Used by: RecipePage, InventoryPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_sub_recipe_ingredients" ON public.sub_recipe_ingredients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sub_recipe_ingredients" ON public.sub_recipe_ingredients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_sub_recipe_ingredients" ON public.sub_recipe_ingredients FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- products: Full CRUD
-- Used by: MenuPage, POSPage, RecipePage, WebstorePage, ChatbotPage, MenuAnalysisPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_products" ON public.products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_products" ON public.products FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- settings: SELECT, UPDATE only (no INSERT, no DELETE)
-- Used by: SettingsPage, HardwarePage, useSettings hook, ChatbotPage
-- Realtime subscription active
-- Sensitive column: tax_id
-- ----------------------------------------------------------

CREATE POLICY "anon_select_settings" ON public.settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_settings" ON public.settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- gift_cards: SELECT, INSERT, UPDATE
-- Used by: GiftCardRedeemModal, POSPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_gift_cards" ON public.gift_cards FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_gift_cards" ON public.gift_cards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_gift_cards" ON public.gift_cards FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- purchase_orders: SELECT, INSERT, UPDATE
-- Used by: PurchaseOrderPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_purchase_orders" ON public.purchase_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_purchase_orders" ON public.purchase_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_purchase_orders" ON public.purchase_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- restaurant_tables: Full CRUD
-- Used by: TableSetupPage, TableManagement, DashboardPage, WebstorePage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_restaurant_tables" ON public.restaurant_tables FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_restaurant_tables" ON public.restaurant_tables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_restaurant_tables" ON public.restaurant_tables FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_restaurant_tables" ON public.restaurant_tables FOR DELETE TO anon USING (true);

-- ----------------------------------------------------------
-- purchase_order_items: SELECT, INSERT, UPDATE
-- Used by: PurchaseOrderPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_purchase_order_items" ON public.purchase_order_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_purchase_order_items" ON public.purchase_order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_purchase_order_items" ON public.purchase_order_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- inventory_ledger: INSERT only (append-only)
-- Used by: InventoryPage, StocktakePage, PurchaseOrderPage
-- ----------------------------------------------------------

CREATE POLICY "anon_insert_inventory_ledger" ON public.inventory_ledger FOR INSERT TO anon WITH CHECK (true);

-- ----------------------------------------------------------
-- stocktakes: SELECT, INSERT, UPDATE
-- Used by: StocktakePage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_stocktakes" ON public.stocktakes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stocktakes" ON public.stocktakes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_stocktakes" ON public.stocktakes FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- stocktake_items: SELECT, INSERT, UPDATE
-- Used by: StocktakePage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_stocktake_items" ON public.stocktake_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stocktake_items" ON public.stocktake_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_stocktake_items" ON public.stocktake_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- expenses: SELECT only (read-only)
-- Used by: ProfitLossPage
-- ----------------------------------------------------------

CREATE POLICY "anon_select_expenses" ON public.expenses FOR SELECT TO anon USING (true);

-- ----------------------------------------------------------
-- table_sessions: SELECT, INSERT, UPDATE
-- Used by: WebstorePage
-- Sensitive column: session_token
-- ----------------------------------------------------------

CREATE POLICY "anon_select_table_sessions" ON public.table_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_table_sessions" ON public.table_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_table_sessions" ON public.table_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Phase 3: Verify
-- ============================================================
-- Run this query after to verify all tables have RLS enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = true
-- ORDER BY tablename;
--
-- Expected: 24 rows (one per table)
-- ============================================================

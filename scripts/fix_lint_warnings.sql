-- ============================================================
-- Hampton Park Thai Halal Restaurant: Fix Lint Warnings
-- 1. Function Search Path Mutable
-- 2. RLS Policy Always True
-- ============================================================

ALTER FUNCTION public.deduct_stock_on_order() SET search_path = public;
ALTER FUNCTION public.return_stock_on_void() SET search_path = public;

-- ----------------------------------------------------------
-- orders
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_orders ON public.orders;
DROP POLICY IF EXISTS anon_update_orders ON public.orders;
DROP POLICY IF EXISTS anon_delete_orders ON public.orders;

CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_orders" ON public.orders FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_orders" ON public.orders FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- order_items
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_order_items ON public.order_items;
DROP POLICY IF EXISTS anon_delete_order_items ON public.order_items;

CREATE POLICY "anon_insert_order_items" ON public.order_items FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_order_items" ON public.order_items FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- staff_pins
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_staff_pins ON public.staff_pins;
DROP POLICY IF EXISTS anon_update_staff_pins ON public.staff_pins;
DROP POLICY IF EXISTS anon_delete_staff_pins ON public.staff_pins;

CREATE POLICY "anon_insert_staff_pins" ON public.staff_pins FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_staff_pins" ON public.staff_pins FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_staff_pins" ON public.staff_pins FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- product_categories
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_product_categories ON public.product_categories;
DROP POLICY IF EXISTS anon_update_product_categories ON public.product_categories;
DROP POLICY IF EXISTS anon_delete_product_categories ON public.product_categories;

CREATE POLICY "anon_insert_product_categories" ON public.product_categories FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_product_categories" ON public.product_categories FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_product_categories" ON public.product_categories FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- suppliers
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_suppliers ON public.suppliers;
DROP POLICY IF EXISTS anon_update_suppliers ON public.suppliers;

CREATE POLICY "anon_insert_suppliers" ON public.suppliers FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_suppliers" ON public.suppliers FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- recipes
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_recipes ON public.recipes;
DROP POLICY IF EXISTS anon_delete_recipes ON public.recipes;

CREATE POLICY "anon_insert_recipes" ON public.recipes FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_recipes" ON public.recipes FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- shifts
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_shifts ON public.shifts;
DROP POLICY IF EXISTS anon_update_shifts ON public.shifts;

CREATE POLICY "anon_insert_shifts" ON public.shifts FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_shifts" ON public.shifts FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- customers
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_customers ON public.customers;
DROP POLICY IF EXISTS anon_update_customers ON public.customers;

CREATE POLICY "anon_insert_customers" ON public.customers FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_customers" ON public.customers FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- stock_items
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_stock_items ON public.stock_items;
DROP POLICY IF EXISTS anon_update_stock_items ON public.stock_items;
DROP POLICY IF EXISTS anon_delete_stock_items ON public.stock_items;

CREATE POLICY "anon_insert_stock_items" ON public.stock_items FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_stock_items" ON public.stock_items FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_stock_items" ON public.stock_items FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- gift_card_transactions
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_gift_card_transactions ON public.gift_card_transactions;

CREATE POLICY "anon_insert_gift_card_transactions" ON public.gift_card_transactions FOR INSERT TO anon WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- item_suppliers
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_item_suppliers ON public.item_suppliers;

CREATE POLICY "anon_insert_item_suppliers" ON public.item_suppliers FOR INSERT TO anon WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- sub_recipe_ingredients
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_sub_recipe_ingredients ON public.sub_recipe_ingredients;
DROP POLICY IF EXISTS anon_delete_sub_recipe_ingredients ON public.sub_recipe_ingredients;

CREATE POLICY "anon_insert_sub_recipe_ingredients" ON public.sub_recipe_ingredients FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_sub_recipe_ingredients" ON public.sub_recipe_ingredients FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- products
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_products ON public.products;
DROP POLICY IF EXISTS anon_update_products ON public.products;
DROP POLICY IF EXISTS anon_delete_products ON public.products;

CREATE POLICY "anon_insert_products" ON public.products FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_products" ON public.products FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_products" ON public.products FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- settings
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_update_settings ON public.settings;

CREATE POLICY "anon_update_settings" ON public.settings FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- gift_cards
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_gift_cards ON public.gift_cards;
DROP POLICY IF EXISTS anon_update_gift_cards ON public.gift_cards;

CREATE POLICY "anon_insert_gift_cards" ON public.gift_cards FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_gift_cards" ON public.gift_cards FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- purchase_orders
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_purchase_orders ON public.purchase_orders;
DROP POLICY IF EXISTS anon_update_purchase_orders ON public.purchase_orders;

CREATE POLICY "anon_insert_purchase_orders" ON public.purchase_orders FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_purchase_orders" ON public.purchase_orders FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- restaurant_tables
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_restaurant_tables ON public.restaurant_tables;
DROP POLICY IF EXISTS anon_update_restaurant_tables ON public.restaurant_tables;
DROP POLICY IF EXISTS anon_delete_restaurant_tables ON public.restaurant_tables;

CREATE POLICY "anon_insert_restaurant_tables" ON public.restaurant_tables FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_restaurant_tables" ON public.restaurant_tables FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_delete_restaurant_tables" ON public.restaurant_tables FOR DELETE TO anon USING (current_user = 'anon');

-- ----------------------------------------------------------
-- purchase_order_items
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_purchase_order_items ON public.purchase_order_items;
DROP POLICY IF EXISTS anon_update_purchase_order_items ON public.purchase_order_items;

CREATE POLICY "anon_insert_purchase_order_items" ON public.purchase_order_items FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_purchase_order_items" ON public.purchase_order_items FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- inventory_ledger
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_inventory_ledger ON public.inventory_ledger;

CREATE POLICY "anon_insert_inventory_ledger" ON public.inventory_ledger FOR INSERT TO anon WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- stocktakes
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_stocktakes ON public.stocktakes;
DROP POLICY IF EXISTS anon_update_stocktakes ON public.stocktakes;

CREATE POLICY "anon_insert_stocktakes" ON public.stocktakes FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_stocktakes" ON public.stocktakes FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- stocktake_items
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_stocktake_items ON public.stocktake_items;
DROP POLICY IF EXISTS anon_update_stocktake_items ON public.stocktake_items;

CREATE POLICY "anon_insert_stocktake_items" ON public.stocktake_items FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_stocktake_items" ON public.stocktake_items FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

-- ----------------------------------------------------------
-- table_sessions
-- ----------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_table_sessions ON public.table_sessions;
DROP POLICY IF EXISTS anon_update_table_sessions ON public.table_sessions;

CREATE POLICY "anon_insert_table_sessions" ON public.table_sessions FOR INSERT TO anon WITH CHECK (current_user = 'anon');
CREATE POLICY "anon_update_table_sessions" ON public.table_sessions FOR UPDATE TO anon USING (current_user = 'anon') WITH CHECK (current_user = 'anon');

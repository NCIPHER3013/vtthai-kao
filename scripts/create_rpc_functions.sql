-- Hampton Park Thai Halal Restaurant — Atomic RPC Functions
-- Run via: npx tsx scripts/create_rpc_functions.ts

-- ============================================================
-- 1. adjust_customer_points
--    Atomic increment of customer points & total_spent
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_customer_points(
  p_customer_id UUID,
  p_points_delta NUMERIC,
  p_spent_delta NUMERIC
)
RETURNS TABLE (id UUID, points NUMERIC, total_spent NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.customers
  SET
    points = COALESCE(points, 0) + p_points_delta,
    total_spent = COALESCE(total_spent, 0) + p_spent_delta
  WHERE id = p_customer_id
  RETURNING customers.id, customers.points, customers.total_spent;
END;
$$;

-- ============================================================
-- 2. add_shift_sales
--    Atomic increment of shift total_sales
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_shift_sales(
  p_shift_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE (id UUID, total_sales NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.shifts
  SET total_sales = COALESCE(total_sales, 0) + p_amount
  WHERE id = p_shift_id
  RETURNING shifts.id, shifts.total_sales;
END;
$$;

-- ============================================================
-- 3. process_order
--    Atomic: insert order + items + update customer + shift
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_order(
  p_order_id TEXT,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_payment_method TEXT,
  p_order_type TEXT,
  p_timestamp TIMESTAMPTZ,
  p_status TEXT DEFAULT 'pending',
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_shift_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_phone TEXT DEFAULT NULL
)
RETURNS TABLE (order_id TEXT, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_points_earned INTEGER;
BEGIN
  -- 1. Upsert order
  INSERT INTO public.orders (id, subtotal, tax, total, payment_method, order_type, timestamp, status, customer_id, customer_name, shift_id, delivery_address, delivery_phone)
  VALUES (p_order_id, p_subtotal, p_tax, p_total, p_payment_method, p_order_type, p_timestamp, p_status, p_customer_id, p_customer_name, p_shift_id, p_delivery_address, p_delivery_phone)
  ON CONFLICT (id) DO UPDATE SET
    subtotal = EXCLUDED.subtotal,
    tax = EXCLUDED.tax,
    total = EXCLUDED.total,
    payment_method = EXCLUDED.payment_method,
    order_type = EXCLUDED.order_type,
    timestamp = EXCLUDED.timestamp,
    status = EXCLUDED.status,
    customer_id = EXCLUDED.customer_id,
    customer_name = EXCLUDED.customer_name,
    shift_id = EXCLUDED.shift_id,
    delivery_address = EXCLUDED.delivery_address,
    delivery_phone = EXCLUDED.delivery_phone;

  -- 2. Delete old items if this is a re-send
  DELETE FROM public.order_items WHERE public.order_items.order_id = p_order_id;

  -- 3. Insert new items
  INSERT INTO public.order_items (order_id, product_id, quantity, note, modifiers)
  SELECT
    p_order_id,
    (item->>'product_id')::TEXT,
    COALESCE((item->>'quantity')::INTEGER, 1),
    item->>'note',
    (SELECT ARRAY(SELECT jsonb_array_elements_text(CASE WHEN (item->'modifiers') IS NULL OR jsonb_typeof(item->'modifiers') = 'null' THEN '[]'::jsonb ELSE item->'modifiers' END)))
  FROM jsonb_array_elements(p_items) AS item;

  -- 4. Update customer points
  IF p_customer_id IS NOT NULL THEN
    v_points_earned := FLOOR(p_total);
    UPDATE public.customers
    SET
      points = COALESCE(points, 0) + v_points_earned,
      total_spent = COALESCE(total_spent, 0) + p_total
    WHERE id = p_customer_id;
  END IF;

  -- 5. Update shift sales
  IF p_shift_id IS NOT NULL THEN
    UPDATE public.shifts
    SET total_sales = COALESCE(total_sales, 0) + p_total
    WHERE id = p_shift_id;
  END IF;

  -- 6. Return result
  RETURN QUERY SELECT p_order_id, p_status;
END;
$$;

-- ============================================================
-- 4. receive_purchase_order
--    Atomic: update PO status + update stock + write ledger
-- ============================================================
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_po_id UUID,
  p_received_items JSONB DEFAULT '[]'::JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (po_id UUID, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  item_rec RECORD;
  v_stock_delta NUMERIC;
  v_item_name TEXT;
BEGIN
  -- 1. Update PO status
  UPDATE public.purchase_orders
  SET status = 'received', updated_at = NOW(), notes = COALESCE(p_notes, notes)
  WHERE id = p_po_id;

  -- 2. Process each item
  FOR item_rec IN
    SELECT
      (r->>'inventory_item_id')::INTEGER AS inv_item_id,
      (r->>'quantity_received')::NUMERIC AS qty_received,
      (r->>'unit_price')::NUMERIC AS unit_price
    FROM jsonb_array_elements(p_received_items) AS r
  LOOP
    -- Update PO item
    UPDATE public.purchase_order_items
    SET quantity_received = item_rec.qty_received
    WHERE po_id = p_po_id AND inventory_item_id = item_rec.inv_item_id;

    -- Update stock
    UPDATE public.stock_items
    SET
      current_stock = COALESCE(current_stock, 0) + item_rec.qty_received,
      updated_at = NOW()
    WHERE id = item_rec.inv_item_id
    RETURNING name INTO v_item_name;

    -- Write ledger
    INSERT INTO public.inventory_ledger (item_id, change_type, quantity, notes, reference_id)
    VALUES (
      item_rec.inv_item_id::TEXT,
      'po_receive',
      item_rec.qty_received,
      'Received from PO ' || p_po_id,
      p_po_id::TEXT
    );
  END LOOP;

  RETURN QUERY SELECT p_po_id, 'received'::TEXT;
END;
$$;

-- ============================================================
-- 5. complete_stocktake
--    Atomic: update stock items + write ledger + mark complete
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_stocktake(
  p_stocktake_id UUID,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (stocktake_id UUID, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  item_rec RECORD;
  v_old_stock NUMERIC;
  v_variance NUMERIC;
BEGIN
  -- 1. Update each stock item & write ledger
  FOR item_rec IN
    SELECT
      (r->>'stock_item_id')::INTEGER AS s_id,
      (r->>'counted_qty')::NUMERIC AS counted
    FROM jsonb_array_elements(p_items) AS r
  LOOP
    SELECT current_stock INTO v_old_stock
    FROM public.stock_items WHERE id = item_rec.s_id;

    v_variance := item_rec.counted - COALESCE(v_old_stock, 0);

    UPDATE public.stock_items
    SET current_stock = item_rec.counted, updated_at = NOW()
    WHERE id = item_rec.s_id;

    UPDATE public.stocktake_items
    SET counted_qty = item_rec.counted, variance = v_variance
    WHERE stocktake_id = p_stocktake_id AND stock_item_id = item_rec.s_id;

    INSERT INTO public.inventory_ledger (item_id, change_type, quantity, notes, reference_id)
    VALUES (
      item_rec.s_id::TEXT,
      'stocktake',
      v_variance,
      'Stocktake adjustment',
      p_stocktake_id::TEXT
    );
  END LOOP;

  -- 2. Mark stocktake complete
  UPDATE public.stocktakes
  SET status = 'completed', completed_at = NOW(), notes = COALESCE(p_notes, notes)
  WHERE id = p_stocktake_id;

  RETURN QUERY SELECT p_stocktake_id, 'completed'::TEXT;
END;
$$;

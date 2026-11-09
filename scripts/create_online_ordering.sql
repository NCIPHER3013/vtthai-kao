-- Hampton Park Thai — Online ordering: columns, config, and place_online_order RPC

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source text DEFAULT 'pos';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_lunch_special boolean DEFAULT false;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS online_ordering jsonb;
UPDATE public.settings SET online_ordering = '{
  "enabled": true,
  "timezone": "Australia/Melbourne",
  "hours": {
    "mon": {"open": "11:00", "close": "22:00"},
    "tue": {"open": "11:00", "close": "22:00"},
    "wed": {"open": "11:00", "close": "22:00"},
    "thu": {"open": "11:00", "close": "22:00"},
    "fri": {"open": "11:00", "close": "22:00"},
    "sat": {"open": "11:00", "close": "22:00"},
    "sun": {"open": "11:00", "close": "22:00"}
  },
  "last_order_minutes_before_close": 30,
  "prep_minutes": 30,
  "delivery_extra_minutes": 15,
  "slot_minutes": 15,
  "schedule_days_ahead": 7,
  "delivery_fee": 8,
  "free_delivery_threshold": 250,
  "lunch": {"enabled": true, "end_time": "15:00", "min_days_ahead": 1}
}'::jsonb WHERE online_ordering IS NULL;

CREATE INDEX IF NOT EXISTS orders_scheduled_for_idx ON public.orders (scheduled_for) WHERE scheduled_for IS NOT NULL;

CREATE OR REPLACE FUNCTION public.place_online_order(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cfg jsonb;
  v_tz text;
  v_last_before int;
  v_prep int;
  v_extra int;
  v_days int;
  v_fee_cfg numeric;
  v_free_thr numeric;
  v_tax_rate numeric;
  v_lunch_enabled boolean;
  v_lunch_end time;
  v_lunch_days int;
  v_order_id text := p->>'order_id';
  v_type text := p->>'order_type';
  v_name text := btrim(coalesce(p->>'customer_name', ''));
  v_phone text := btrim(coalesce(p->>'phone', ''));
  v_addr text := btrim(coalesce(p->>'address', ''));
  v_note text := nullif(btrim(coalesce(p->>'note', '')), '');
  v_pay text := upper(coalesce(nullif(p->>'payment_method', ''), 'CASH'));
  v_cust uuid := nullif(p->>'customer_id', '')::uuid;
  v_sched timestamptz := nullif(p->>'scheduled_for', '')::timestamptz;
  v_items jsonb := coalesce(p->'items', '[]'::jsonb);
  v_now timestamptz := now();
  v_local_now timestamp;
  v_local_t timestamp;
  v_win jsonb;
  v_open time;
  v_close time;
  v_dow text;
  v_days_arr text[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  v_item jsonb;
  v_ord int;
  v_prod record;
  v_opt jsonb;
  v_mod text;
  v_group text;
  v_optname text;
  v_unit numeric;
  v_adj numeric;
  v_qty int;
  v_priced jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_tax numeric;
  v_fee numeric := 0;
  v_total numeric;
  v_has_lunch boolean := false;
  v_existing record;
BEGIN
  IF v_order_id IS NULL OR length(v_order_id) < 8 THEN
    RAISE EXCEPTION 'INVALID_ORDER_ID';
  END IF;

  SELECT * INTO v_existing FROM public.orders WHERE id = v_order_id;
  IF FOUND THEN
    RETURN jsonb_build_object('order_id', v_existing.id, 'status', v_existing.status, 'scheduled_for', v_existing.scheduled_for,
      'subtotal', v_existing.subtotal, 'tax', v_existing.tax, 'delivery_fee', coalesce(v_existing.delivery_fee, 0), 'total', v_existing.total, 'duplicate', true);
  END IF;

  SELECT online_ordering, coalesce(tax_rate, 0.1) INTO cfg, v_tax_rate FROM public.settings ORDER BY id LIMIT 1;
  cfg := coalesce(cfg, '{}'::jsonb);
  IF coalesce((cfg->>'enabled')::boolean, true) = false THEN
    RAISE EXCEPTION 'ONLINE_ORDERING_DISABLED';
  END IF;

  v_tz := coalesce(cfg->>'timezone', 'Australia/Melbourne');
  v_last_before := coalesce((cfg->>'last_order_minutes_before_close')::int, 30);
  v_prep := coalesce((cfg->>'prep_minutes')::int, 30);
  v_extra := coalesce((cfg->>'delivery_extra_minutes')::int, 15);
  v_days := coalesce((cfg->>'schedule_days_ahead')::int, 7);
  v_fee_cfg := coalesce((cfg->>'delivery_fee')::numeric, 8);
  v_free_thr := coalesce((cfg->>'free_delivery_threshold')::numeric, 250);
  v_lunch_enabled := coalesce((cfg#>>'{lunch,enabled}')::boolean, true);
  v_lunch_end := coalesce((cfg#>>'{lunch,end_time}')::time, '15:00'::time);
  v_lunch_days := coalesce((cfg#>>'{lunch,min_days_ahead}')::int, 1);

  IF v_type NOT IN ('delivery', 'takeaway') THEN RAISE EXCEPTION 'INVALID_ORDER_TYPE'; END IF;
  IF length(v_name) < 1 OR length(v_name) > 100 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 OR length(v_phone) > 30 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF v_type = 'delivery' AND (length(v_addr) < 5 OR length(v_addr) > 300) THEN RAISE EXCEPTION 'INVALID_ADDRESS'; END IF;
  IF v_pay NOT IN ('CASH', 'CARD') THEN v_pay := 'CASH'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 OR jsonb_array_length(v_items) > 60 THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;

  FOR v_item, v_ord IN SELECT e.item, e.ord FROM jsonb_array_elements(v_items) WITH ORDINALITY AS e(item, ord) LOOP
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 50 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    SELECT id, name, price, price_delivery, price_takeaway, customizations, is_lunch_special, category, is_active
      INTO v_prod FROM public.products WHERE id = v_item->>'product_id';
    IF NOT FOUND OR coalesce(v_prod.is_active, false) = false
       OR lower(coalesce(v_prod.category, '')) IN ('sub-recipe', 'extras') THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: %', coalesce(v_item->>'product_id', '?');
    END IF;

    IF coalesce(v_prod.is_lunch_special, false) THEN v_has_lunch := true; END IF;

    v_unit := CASE
      WHEN v_type = 'delivery' THEN coalesce(v_prod.price_delivery, v_prod.price)
      ELSE coalesce(v_prod.price_takeaway, v_prod.price)
    END;

    FOR v_mod IN SELECT jsonb_array_elements_text(coalesce(v_item->'modifiers', '[]'::jsonb)) LOOP
      v_group := btrim(split_part(v_mod, ': ', 1));
      v_optname := btrim(substr(v_mod, strpos(v_mod, ': ') + 2));
      v_opt := NULL;
      SELECT opt INTO v_opt
        FROM jsonb_array_elements(coalesce(v_prod.customizations, '[]'::jsonb)) grp,
             jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
       WHERE grp->>'name' = v_group AND opt->>'name' = v_optname
       LIMIT 1;
      IF v_opt IS NOT NULL THEN
        v_adj := CASE
          WHEN v_type = 'delivery' AND jsonb_typeof(v_opt->'price_delivery') = 'number' THEN (v_opt->>'price_delivery')::numeric
          WHEN v_type = 'takeaway' AND jsonb_typeof(v_opt->'price_takeaway') = 'number' THEN (v_opt->>'price_takeaway')::numeric
          WHEN jsonb_typeof(v_opt->'price') = 'number' THEN (v_opt->>'price')::numeric
          WHEN jsonb_typeof(v_opt->'priceAdjustment') = 'number' THEN (v_opt->>'priceAdjustment')::numeric
          WHEN jsonb_typeof(v_opt->'price_adjustment') = 'number' THEN (v_opt->>'price_adjustment')::numeric
          ELSE 0
        END;
        v_unit := v_unit + v_adj;
      END IF;
    END LOOP;

    v_unit := round(v_unit, 2);
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_priced := v_priced || jsonb_build_object(
      'product_id', v_prod.id,
      'quantity', v_qty,
      'unit_price', v_unit,
      'modifiers', coalesce(v_item->'modifiers', '[]'::jsonb),
      'note', CASE WHEN v_ord = 1 THEN coalesce(nullif(btrim(coalesce(v_item->>'note', '')), ''), v_note)
                   ELSE nullif(btrim(coalesce(v_item->>'note', '')), '') END
    );
  END LOOP;

  v_subtotal := round(v_subtotal, 2);

  v_local_now := v_now AT TIME ZONE v_tz;
  IF v_sched IS NULL THEN
    IF v_has_lunch THEN RAISE EXCEPTION 'LUNCH_PREORDER_ONLY'; END IF;
    v_dow := v_days_arr[extract(isodow FROM v_local_now)::int];
    v_win := cfg->'hours'->v_dow;
    IF v_win IS NULL OR jsonb_typeof(v_win) <> 'object' THEN RAISE EXCEPTION 'STORE_CLOSED'; END IF;
    v_open := (v_win->>'open')::time;
    v_close := (v_win->>'close')::time;
    IF v_local_now::time < v_open OR v_local_now::time > v_close - make_interval(mins => v_last_before) THEN
      RAISE EXCEPTION 'STORE_CLOSED';
    END IF;
  ELSE
    IF v_sched < v_now + make_interval(mins => v_prep + CASE WHEN v_type = 'delivery' THEN v_extra ELSE 0 END - 5) THEN
      RAISE EXCEPTION 'SLOT_TOO_SOON';
    END IF;
    IF v_sched > v_now + make_interval(days => v_days + 1) THEN RAISE EXCEPTION 'SLOT_TOO_FAR'; END IF;
    v_local_t := v_sched AT TIME ZONE v_tz;
    v_dow := v_days_arr[extract(isodow FROM v_local_t)::int];
    v_win := cfg->'hours'->v_dow;
    IF v_win IS NULL OR jsonb_typeof(v_win) <> 'object' THEN RAISE EXCEPTION 'SLOT_OUTSIDE_HOURS'; END IF;
    v_open := (v_win->>'open')::time;
    v_close := (v_win->>'close')::time;
    IF v_local_t::time < v_open OR v_local_t::time > v_close - make_interval(mins => v_last_before) THEN
      RAISE EXCEPTION 'SLOT_OUTSIDE_HOURS';
    END IF;
    IF v_has_lunch THEN
      IF NOT v_lunch_enabled THEN RAISE EXCEPTION 'LUNCH_DISABLED'; END IF;
      IF v_local_t::date < v_local_now::date + v_lunch_days OR v_local_t::time > v_lunch_end THEN
        RAISE EXCEPTION 'LUNCH_SLOT_INVALID';
      END IF;
    END IF;
  END IF;

  IF v_type = 'delivery' AND v_subtotal < v_free_thr THEN v_fee := v_fee_cfg; END IF;
  v_tax := round(v_subtotal * v_tax_rate, 2);
  v_total := v_subtotal + v_tax + v_fee;

  INSERT INTO public.orders (id, subtotal, tax, total, payment_method, order_type, timestamp, status, customer_id,
    customer_name, delivery_address, delivery_phone, delivery_name, scheduled_for, order_source, delivery_fee)
  VALUES (v_order_id, v_subtotal, v_tax, v_total, v_pay, v_type, v_now, 'pending', v_cust,
    v_name, CASE WHEN v_type = 'delivery' THEN v_addr ELSE NULL END, v_phone, v_name, v_sched, 'online', v_fee);

  INSERT INTO public.order_items (order_id, product_id, quantity, note, modifiers, unit_price)
  SELECT v_order_id, i->>'product_id', (i->>'quantity')::int, i->>'note',
         ARRAY(SELECT jsonb_array_elements_text(i->'modifiers')), (i->>'unit_price')::numeric
    FROM jsonb_array_elements(v_priced) i;

  IF v_cust IS NOT NULL THEN
    UPDATE public.customers
       SET points = coalesce(points, 0) + floor(v_total),
           total_spent = coalesce(total_spent, 0) + v_total
     WHERE id = v_cust;
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'status', 'pending', 'scheduled_for', v_sched,
    'subtotal', v_subtotal, 'tax', v_tax, 'delivery_fee', v_fee, 'total', v_total, 'duplicate', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_online_order(jsonb) TO anon, authenticated;

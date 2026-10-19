-- Recurring TokTok delivery schedules: store clock times and materialize today's dated batches on demand.
create or replace function public.ensure_toktok_daily_batches(p_date date default (timezone('Africa/Cairo', now()))::date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_templates jsonb;
  v_template jsonb;
  v_start timestamp with time zone;
  v_end timestamp with time zone;
  v_delivery timestamp with time zone;
  v_created integer := 0;
  v_store_id uuid;
  v_start_time time;
  v_end_time time;
  v_delivery_time time;
  v_capacity integer;
begin
  select s.setting_value into v_templates
  from public.toktok_settings s
  where s.setting_key = 'toktok_batch_schedule';

  if jsonb_typeof(v_templates) <> 'array' then
    return 0;
  end if;

  for v_template in select value from jsonb_array_elements(v_templates)
  loop
    if coalesce((v_template->>'is_active')::boolean, true) is not true then
      continue;
    end if;
    begin
      v_store_id := (v_template->>'store_id')::uuid;
      v_start_time := (v_template->>'registration_start')::time;
      v_end_time := (v_template->>'registration_end')::time;
      v_delivery_time := (v_template->>'delivery_time')::time;
      v_capacity := nullif(v_template->>'capacity', '')::integer;
    exception when others then
      continue;
    end;

    if v_store_id is null or v_start_time is null or v_end_time is null or v_delivery_time is null then
      continue;
    end if;

    v_start := (p_date + v_start_time) at time zone 'Africa/Cairo';
    v_end := (p_date + v_end_time) at time zone 'Africa/Cairo';
    v_delivery := (p_date + v_delivery_time) at time zone 'Africa/Cairo';

    if v_end <= v_start or v_delivery < v_end or v_end <= now() then
      continue;
    end if;

    if exists (
      select 1 from public.toktok_batches b
      where b.store_id = v_store_id and b.delivery_time = v_delivery
    ) then
      continue;
    end if;

    insert into public.toktok_batches
      (store_id, registration_start, registration_end, delivery_time, capacity, is_active)
    values
      (v_store_id, v_start, v_end, v_delivery, v_capacity, true);
    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.ensure_toktok_daily_batches(date) from public;
grant execute on function public.ensure_toktok_daily_batches(date) to authenticated;

insert into public.toktok_settings(setting_key, setting_value, updated_at)
values ('toktok_batch_schedule', '[]'::jsonb, now())
on conflict (setting_key) do nothing;

-- Update the existing order RPC so a stale batch from another date cannot be used.
create or replace function public.toktok_place_order(p_store_id uuid, p_batch_id uuid, p_items jsonb, p_delivery_address text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
returns public.toktok_orders
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_uid uuid := auth.uid();
  v_store public.toktok_stores%rowtype;
  v_batch public.toktok_batches%rowtype;
  v_order public.toktok_orders%rowtype;
  v_profile public.profiles%rowtype;
  v_order_date date := (timezone('Africa/Cairo', now()))::date;
  v_seq integer;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2) := 0;
  v_item record;
  v_product public.toktok_products%rowtype;
  v_count integer := 0;
BEGIN
  perform public.ensure_toktok_daily_batches(v_order_date);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT p.* INTO v_profile FROM public.profiles p WHERE p.id = v_uid AND p.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active profile not found'; END IF;
  IF v_profile.role <> 'student' THEN RAISE EXCEPTION 'Only students can place TokTok orders'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Too many line items'; END IF;

  SELECT s.* INTO v_store FROM public.toktok_stores s
  WHERE s.id = p_store_id AND s.is_active = true AND s.is_open = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'TokTok store is unavailable'; END IF;

  SELECT b.* INTO v_batch FROM public.toktok_batches b
  WHERE b.id = p_batch_id AND b.store_id = p_store_id AND b.is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid delivery batch'; END IF;
  IF (timezone('Africa/Cairo', v_batch.delivery_time))::date <> v_order_date THEN
    RAISE EXCEPTION 'This delivery batch is not scheduled for today. Refresh and choose a current batch.';
  END IF;
  IF now() < v_batch.registration_start OR now() > v_batch.registration_end THEN
    RAISE EXCEPTION 'Batch registration is closed';
  END IF;
  IF v_batch.capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.toktok_orders o
    WHERE o.batch_id = p_batch_id AND o.status NOT IN ('cancelled','rejected');
    IF v_count >= v_batch.capacity THEN RAISE EXCEPTION 'Delivery batch is full'; END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS e(item)
    WHERE jsonb_typeof(e.item) <> 'object'
      OR coalesce(e.item->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR coalesce(e.item->>'quantity','') !~ '^[0-9]{1,2}$'
      OR (e.item->>'quantity')::integer < 1
      OR (e.item->>'quantity')::integer > 99
  ) THEN RAISE EXCEPTION 'Invalid item format or quantity'; END IF;

  FOR v_item IN
    SELECT (e.item->>'product_id')::uuid AS product_id, sum((e.item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS e(item) GROUP BY (e.item->>'product_id')::uuid
  LOOP
    SELECT pr.* INTO v_product FROM public.toktok_products pr
    WHERE pr.id = v_item.product_id AND pr.store_id = p_store_id AND pr.is_available = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable or belongs to another store'; END IF;
    v_subtotal := v_subtotal + round(v_product.selling_price * v_item.quantity, 2);
  END LOOP;

  SELECT coalesce(
    (SELECT (tier ->> 'fee')::numeric FROM public.toktok_settings s, jsonb_array_elements(s.setting_value) AS tier
      WHERE s.setting_key = 'delivery_fee_tiers' AND jsonb_typeof(s.setting_value) = 'array'
        AND (tier ->> 'min_order_total')::numeric <= v_subtotal
      ORDER BY (tier ->> 'min_order_total')::numeric DESC LIMIT 1),
    (SELECT CASE WHEN jsonb_typeof(s.setting_value) = 'number' THEN (s.setting_value #>> '{}')::numeric ELSE 0 END
       FROM public.toktok_settings s WHERE s.setting_key = 'delivery_fee'), 0
  ) INTO v_delivery_fee;
  v_delivery_fee := coalesce(v_delivery_fee, 0);
  IF v_delivery_fee < 0 THEN RAISE EXCEPTION 'Invalid TokTok delivery fee configuration'; END IF;

  INSERT INTO public.toktok_daily_order_counters(store_id, order_date, last_sequence)
  VALUES (p_store_id, v_order_date, 1)
  ON CONFLICT (store_id, order_date) DO UPDATE
    SET last_sequence = public.toktok_daily_order_counters.last_sequence + 1, updated_at = now()
  RETURNING last_sequence INTO v_seq;

  INSERT INTO public.toktok_orders(
    student_id, store_id, batch_id, order_date, daily_sequence, order_number,
    student_name_snapshot, student_phone_snapshot, store_name_snapshot,
    delivery_address, delivery_fee, items_subtotal, discount_amount, total_amount, notes
  ) VALUES (
    v_uid, p_store_id, p_batch_id, v_order_date, v_seq, 'T' || v_seq::text,
    v_profile.full_name, v_profile.phone, v_store.name,
    nullif(trim(p_delivery_address), ''), v_delivery_fee, v_subtotal, 0,
    v_subtotal + v_delivery_fee, nullif(trim(p_notes), '')
  ) RETURNING * INTO v_order;

  FOR v_item IN
    SELECT (e.item->>'product_id')::uuid AS product_id, sum((e.item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS e(item) GROUP BY (e.item->>'product_id')::uuid
  LOOP
    SELECT pr.* INTO v_product FROM public.toktok_products pr
    WHERE pr.id = v_item.product_id AND pr.store_id = p_store_id AND pr.is_available = true;
    INSERT INTO public.toktok_order_items(
      order_id, product_id, product_name_snapshot, quantity, unit_price, unit_cost_snapshot, line_total
    ) VALUES (
      v_order.id, v_product.id, v_product.name, v_item.quantity, v_product.selling_price,
      v_product.cost_price, round(v_product.selling_price * v_item.quantity, 2)
    );
  END LOOP;
  RETURN v_order;
END;
$function$;

grant execute on function public.toktok_place_order(uuid, uuid, jsonb, text, text) to authenticated;

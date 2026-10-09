-- Database tests for the 2026-10-09 features.
-- Run AFTER the migration, inside a transaction that is always rolled back:
-- the block ends by raising an exception that carries the results, so nothing is saved.
do $test$
declare
  s1 uuid := gen_random_uuid();   -- student
  s2 uuid := gen_random_uuid();   -- another student
  a1 uuid := gen_random_uuid();   -- admin
  d1 uuid := gen_random_uuid();   -- driver assigned to the batch
  d2 uuid := gen_random_uuid();   -- driver not assigned
  r1 uuid; r2 uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid;
  size_l uuid; size_xl uuid; b1 uuid; pm uuid; o1 uuid; o2 uuid;
  v record; v_json json; v_num numeric; v_cnt int; v_text text;
  results text[] := '{}';
  passed int := 0; failed int := 0;
begin
  -- ---------- fixtures (as postgres) ----------
  insert into auth.users (id, email, aud, role, instance_id, raw_user_meta_data)
  select u.id, u.email, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '{}'::jsonb
  from (values (s1, 't-s1@test.local'), (s2, 't-s2@test.local'), (a1, 't-a1@test.local'),
               (d1, 't-d1@test.local'), (d2, 't-d2@test.local')) as u(id, email);
  insert into public.profiles (id, full_name, phone, university_id)
  values (s1, 'Test Student', '01000000000', '9999991'), (s2, 'Other', null, '9999992'),
         (a1, 'Test Admin', null, null), (d1, 'Driver One', null, null), (d2, 'Driver Two', null, null)
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;
  update public.profiles set role = 'admin' where id = a1;
  update public.profiles set role = 'driver' where id in (d1, d2);
  insert into public.driver_profiles (id, is_active) values (d1, true), (d2, true);

  insert into public.restaurants (name, code) values ('Test R1', 'Q') returning id into r1;
  insert into public.restaurants (name, code) values ('Test R2', 'W') returning id into r2;
  insert into public.food_items (restaurant_id, name, selling_price, cost_price) values (r1, 'Burger', 100, 60) returning id into f1;
  insert into public.food_items (restaurant_id, name, selling_price, cost_price) values (r1, 'Pizza', 90, 50) returning id into f2;
  insert into public.food_items (restaurant_id, name, selling_price, cost_price, is_available) values (r1, 'Gone', 10, 5, false) returning id into f3;
  insert into public.food_items (restaurant_id, name, selling_price, cost_price) values (r2, 'Other', 50, 20) returning id into f4;
  insert into public.food_item_sizes (food_item_id, name, selling_price, cost_price, sort_order) values (f2, 'M', 80, 40, 1);
  insert into public.food_item_sizes (food_item_id, name, selling_price, cost_price, sort_order) values (f2, 'L', 120, 70, 2) returning id into size_l;
  insert into public.food_item_sizes (food_item_id, name, selling_price, cost_price, sort_order, is_available) values (f2, 'XL', 150, 90, 3, false) returning id into size_xl;
  insert into public.delivery_batches (batch_number, registration_start, registration_end, delivery_time, delivery_date, maximum_orders)
    values (999, now() - interval '1 hour', now() + interval '1 hour', now() + interval '2 hour', current_date, 5) returning id into b1;
  insert into public.payment_methods (name, type, account_number) values ('Test Wallet', 'Wallet', '010') returning id into pm;
  delete from public.delivery_fee_tiers;
  insert into public.delivery_fee_tiers (min_order_total, fee) values (0, 20), (300, 35);
  insert into public.driver_batch_assignments (batch_id, driver_id) values (b1, d1);

  -- ---------- fee tier function ----------
  if public.delivery_fee_for(0) = 20 and public.delivery_fee_for(299.99) = 20 and public.delivery_fee_for(300) = 35 and public.delivery_fee_for(5000) = 35
    then passed := passed + 1; results := array_append(results, ('PASS fee tiers pick the right fee')::text);
    else failed := failed + 1; results := array_append(results, ('FAIL fee tiers')::text); end if;

  -- ---------- as student ----------
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.orders (student_id, restaurant_id, batch_id, payment_method_id, food_subtotal, delivery_fee, total_amount, payment_screenshot_path, payment_status, status)
    values (s1, r1, b1, pm, 1, 0, 1, 'x/y.png', 'UNDER_CONFIRMATION', 'PAYMENT_UNDER_CONFIRMATION') returning id into o1;
  select assigned_driver_id into v from public.orders where id = o1;
  if v.assigned_driver_id = d1 then passed := passed + 1; results := array_append(results, ('PASS new order gets the batch driver automatically')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL auto driver: ' || coalesce(v.assigned_driver_id::text, 'null')))::text); end if;

  -- cheating prices from the browser are ignored
  insert into public.order_items (order_id, food_item_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total)
    values (o1, f1, 'hack', 2, 1, 2, 0);
  insert into public.order_items (order_id, food_item_id, size_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total)
    values (o1, f2, size_l, 'hack', 1, 1, 1, 0);
  select food_subtotal, delivery_fee, total_amount, food_cost_total into v from public.orders where id = o1;
  if v.food_subtotal = 320 and v.delivery_fee = 35 and v.total_amount = 355 and v.food_cost_total = 190
    then passed := passed + 1; results := array_append(results, ('PASS prices come from the menu + size, fee tier 35 applied (320 + 35 = 355)')::text);
    else failed := failed + 1; results := array_append(results, (format('FAIL totals %s %s %s %s', v.food_subtotal, v.delivery_fee, v.total_amount, v.food_cost_total))::text); end if;

  select string_agg(food_name_snapshot || ':' || line_total || ':' || coalesce(size_name, '-'), ',' order by line_total) into v_text from public.order_items where order_id = o1;
  if v_text = 'Pizza (L):120.00:L,Burger:200.00:-' then passed := passed + 1; results := array_append(results, ('PASS item names include the size (Pizza (L))')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL item names ' || coalesce(v_text, 'null')))::text); end if;

  begin
    insert into public.order_items (order_id, food_item_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total) values (o1, f2, 'x', 1, 0, 0, 0);
    failed := failed + 1; results := array_append(results, ('FAIL item with sizes accepted without a size')::text);
  exception when others then
    if sqlerrm like 'Please choose a size%' then passed := passed + 1; results := array_append(results, ('PASS item with sizes needs a size')::text);
    else failed := failed + 1; results := array_append(results, (('FAIL size required msg: ' || sqlerrm))::text); end if;
  end;

  begin
    insert into public.order_items (order_id, food_item_id, size_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total) values (o1, f2, size_xl, 'x', 1, 0, 0, 0);
    failed := failed + 1; results := array_append(results, ('FAIL unavailable size accepted')::text);
  exception when others then passed := passed + 1; results := array_append(results, ('PASS unavailable size rejected')::text);
  end;

  begin
    insert into public.order_items (order_id, food_item_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total) values (o1, f3, 'x', 1, 0, 0, 0);
    failed := failed + 1; results := array_append(results, ('FAIL unavailable item accepted')::text);
  exception when others then passed := passed + 1; results := array_append(results, ('PASS unavailable item rejected')::text);
  end;

  begin
    insert into public.order_items (order_id, food_item_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total) values (o1, f4, 'x', 1, 0, 0, 0);
    failed := failed + 1; results := array_append(results, ('FAIL item from another restaurant accepted')::text);
  exception when others then passed := passed + 1; results := array_append(results, ('PASS item from another restaurant rejected')::text);
  end;

  update public.food_items set selling_price = 1 where id = f1;
  get diagnostics v_cnt = row_count;
  if v_cnt = 0 then passed := passed + 1; results := array_append(results, ('PASS students cannot change food prices')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL student changed a food price')::text); end if;

  begin
    insert into public.home_categories (name) values ('Hack');
    failed := failed + 1; results := array_append(results, ('FAIL student created a home category')::text);
  exception when others then passed := passed + 1; results := array_append(results, ('PASS students cannot create home categories')::text);
  end;

  select count(*) into v_cnt from public.home_categories;
  if v_cnt >= 1 then passed := passed + 1; results := array_append(results, ('PASS students can read home categories')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL students see no home categories')::text); end if;

  select count(*) into v_cnt from public.food_item_sizes where food_item_id = f2;
  if v_cnt = 3 then passed := passed + 1; results := array_append(results, ('PASS students can read sizes')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL sizes visible: ' || v_cnt))::text); end if;

  insert into public.orders (student_id, restaurant_id, batch_id, payment_method_id, food_subtotal, delivery_fee, total_amount, payment_screenshot_path, payment_status, status)
    values (s1, r1, b1, pm, 0, 0, 0, 'x/z.png', 'UNDER_CONFIRMATION', 'PAYMENT_UNDER_CONFIRMATION') returning id into o2;
  insert into public.order_items (order_id, food_item_id, food_name_snapshot, quantity, unit_selling_price, line_total, line_cost_total) values (o2, f1, 'x', 1, 0, 0, 0);
  select delivery_fee, total_amount into v from public.orders where id = o2;
  if v.delivery_fee = 20 and v.total_amount = 120 then passed := passed + 1; results := array_append(results, ('PASS small order uses the base fee (100 + 20)')::text);
  else failed := failed + 1; results := array_append(results, (format('FAIL small order %s %s', v.delivery_fee, v.total_amount))::text); end if;

  -- place_student_order: order + items in one go
  v_json := public.place_student_order(r1, b1, pm, 'x/w.png',
    jsonb_build_array(
      jsonb_build_object('food_item_id', f1, 'quantity', 1),
      jsonb_build_object('food_item_id', f2, 'size_id', size_l, 'quantity', 2)));
  if (v_json ->> 'food_subtotal')::numeric = 340 and (v_json ->> 'delivery_fee')::numeric = 35 and (v_json ->> 'total_amount')::numeric = 375 and (v_json ->> 'order_number') is not null
    then passed := passed + 1; results := array_append(results, ('PASS place_student_order saves order + items with server prices (340 + 35)')::text);
    else failed := failed + 1; results := array_append(results, ('FAIL place order ' || v_json::text)::text); end if;

  select count(*) into v_cnt from public.orders where student_id = s1;
  begin
    perform public.place_student_order(r1, b1, pm, 'x/v.png',
      jsonb_build_array(jsonb_build_object('food_item_id', f1, 'quantity', 1), jsonb_build_object('food_item_id', f3, 'quantity', 1)));
    failed := failed + 1; results := array_append(results, ('FAIL order with unavailable item was placed')::text);
  exception when others then
    select count(*) into v_num from public.orders where student_id = s1;
    if v_num = v_cnt then passed := passed + 1; results := array_append(results, ('PASS a failed item cancels the whole order (no empty order left)')::text);
    else failed := failed + 1; results := array_append(results, ('FAIL orphan order left behind')::text); end if;
  end;

  begin
    perform public.place_student_order(r1, b1, pm, 'x/u.png', '[]'::jsonb);
    failed := failed + 1; results := array_append(results, ('FAIL empty cart accepted')::text);
  exception when others then passed := passed + 1; results := array_append(results, ('PASS empty cart rejected')::text);
  end;

  -- other student cannot see these orders
  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.orders where id in (o1, o2);
  if v_cnt = 0 then passed := passed + 1; results := array_append(results, ('PASS students only see their own orders')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL student saw another student''s orders')::text); end if;

  -- ---------- as assigned driver ----------
  perform set_config('request.jwt.claims', json_build_object('sub', d1, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.orders where id in (o1, o2);
  if v_cnt = 2 then passed := passed + 1; results := array_append(results, ('PASS driver sees the orders of their batch')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL driver sees ' || v_cnt || ' orders'))::text); end if;

  v_json := public.driver_update_order_status(o1, 'OUT_FOR_DELIVERY');
  if (v_json ->> 'success')::boolean = false then passed := passed + 1; results := array_append(results, ('PASS driver cannot pick up an unpaid order')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL driver picked up an unpaid order')::text); end if;

  -- admin confirms payment and starts preparing
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  update public.orders set status = 'PREPARING', payment_status = 'PAID' where id in (o1, o2);
  get diagnostics v_cnt = row_count;
  if v_cnt = 2 then passed := passed + 1; results := array_append(results, ('PASS admin moves orders to PREPARING')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL admin update rows ' || v_cnt))::text); end if;

  perform set_config('request.jwt.claims', json_build_object('sub', d1, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.orders where id in (o1, o2) and status = 'PREPARING';
  if v_cnt = 2 then passed := passed + 1; results := array_append(results, ('PASS driver sees PREPARING orders ready for pickup')::text);
  else failed := failed + 1; results := array_append(results, (('FAIL driver sees preparing ' || v_cnt))::text); end if;

  v_json := public.driver_update_order_status(o1, 'OUT_FOR_DELIVERY');
  select status, picked_up_at, out_for_delivery_at into v from public.orders where id = o1;
  if (v_json ->> 'success')::boolean and v.status = 'OUT_FOR_DELIVERY' and v.picked_up_at is not null and v.out_for_delivery_at is not null
    then passed := passed + 1; results := array_append(results, ('PASS driver picks up a PREPARING order (times recorded)')::text);
    else failed := failed + 1; results := array_append(results, (('FAIL pickup ' || v_json::text))::text); end if;

  v_json := public.driver_update_order_status(o1, 'DELIVERED_BY_DRIVER');
  select status, delivered_at into v from public.orders where id = o1;
  if (v_json ->> 'success')::boolean and v.status = 'DELIVERED_BY_DRIVER' and v.delivered_at is not null
    then passed := passed + 1; results := array_append(results, ('PASS driver confirms delivery')::text);
    else failed := failed + 1; results := array_append(results, (('FAIL deliver ' || v_json::text))::text); end if;

  v_json := public.driver_update_order_status(o1, 'OUT_FOR_DELIVERY');
  if (v_json ->> 'success')::boolean = false then passed := passed + 1; results := array_append(results, ('PASS delivered order cannot go back')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL delivered order went back')::text); end if;

  -- ---------- as a driver who is not assigned ----------
  perform set_config('request.jwt.claims', json_build_object('sub', d2, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.orders where id in (o1, o2);
  v_json := public.driver_update_order_status(o2, 'OUT_FOR_DELIVERY');
  if v_cnt = 0 and (v_json ->> 'success')::boolean = false then passed := passed + 1; results := array_append(results, ('PASS other drivers cannot see or take the order')::text);
  else failed := failed + 1; results := array_append(results, (format('FAIL other driver saw %s / %s', v_cnt, v_json))::text); end if;

  -- ---------- as admin ----------
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  insert into public.home_categories (name, icon, sort_order) values ('Test Cat', '🧪', 99) returning id into v_text;
  update public.food_items set home_category_id = v_text::uuid, selling_price = 110 where id = f1;
  get diagnostics v_cnt = row_count;
  if v_cnt = 1 then passed := passed + 1; results := array_append(results, ('PASS admin creates a category and links food to it')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL admin category/food link')::text); end if;

  insert into public.delivery_fee_tiers (min_order_total, fee) values (600, 50);
  if public.delivery_fee_for(700) = 50 then passed := passed + 1; results := array_append(results, ('PASS admin adds a fee tier')::text);
  else failed := failed + 1; results := array_append(results, ('FAIL admin tier')::text); end if;

  -- fee stays fixed once an order is past payment confirmation (edited by staff in the database)
  execute 'reset role';
  delete from public.order_items where order_id = o2;
  select food_subtotal, delivery_fee, total_amount into v from public.orders where id = o2;
  if v.food_subtotal = 0 and v.delivery_fee = 20 and v.total_amount = 20 then passed := passed + 1; results := array_append(results, ('PASS editing a confirmed order keeps its delivery fee')::text);
  else failed := failed + 1; results := array_append(results, (format('FAIL confirmed recalc %s %s %s', v.food_subtotal, v.delivery_fee, v.total_amount))::text); end if;

  execute 'reset role';
  raise exception 'TEST_RESULTS passed=% failed=% || %', passed, failed, array_to_string(results, ' || ');
end
$test$;

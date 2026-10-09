-- Role helpers (security definer so policies on profiles don't recurse)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- New orders: server decides fees, status, driver and validates the batch.

create or replace function public.prepare_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.delivery_batches%rowtype;
  v_settings public.delivery_settings%rowtype;
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    new.student_id := auth.uid();
    new.status := 'PAYMENT_UNDER_CONFIRMATION';
    new.payment_status := 'UNDER_CONFIRMATION';
  end if;

  select * into v_batch from public.delivery_batches where id = new.batch_id;
  if not found or not v_batch.is_active then
    raise exception 'This delivery batch is not available. Please choose another one.';
  end if;

  select count(*) into v_count
  from public.orders
  where batch_id = new.batch_id and status <> 'CANCELLED';

  if v_count >= v_batch.maximum_orders then
    raise exception 'This delivery batch is full. Please choose another one.';
  end if;

  if not exists (
    select 1 from public.restaurants where id = new.restaurant_id and is_active
  ) then
    raise exception 'This restaurant is not taking orders right now.';
  end if;

  select * into v_settings
  from public.delivery_settings
  order by updated_at desc
  limit 1;

  new.delivery_fee := coalesce(v_settings.delivery_fee, 0);
  new.driver_cost := coalesce(v_settings.driver_cost, 0);
  new.food_subtotal := coalesce(new.food_subtotal, 0);
  new.total_amount := new.food_subtotal + new.delivery_fee;
  new.order_date := current_date;

  select driver_id into new.assigned_driver_id
  from public.driver_batch_assignments
  where batch_id = new.batch_id;

  return new;
end;
$$;

create trigger orders_prepare_new
before insert on public.orders
for each row execute function public.prepare_new_order();

-- Order items: prices always come from the menu, never from the browser.

create or replace function public.prepare_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item public.food_items%rowtype;
  v_is_admin boolean := public.is_admin();
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then
    raise exception 'Order not found.';
  end if;

  if auth.uid() is not null and not v_is_admin then
    if v_order.student_id <> auth.uid()
       or v_order.status <> 'PAYMENT_UNDER_CONFIRMATION'
       or v_order.created_at < now() - interval '15 minutes' then
      raise exception 'You cannot add items to this order.';
    end if;

    if new.food_item_id is null then
      raise exception 'Please choose items from the menu.';
    end if;
  end if;

  if new.food_item_id is not null then
    select * into v_item from public.food_items where id = new.food_item_id;
    if not found then
      raise exception 'A food item in your cart no longer exists.';
    end if;
    if v_item.restaurant_id <> v_order.restaurant_id then
      raise exception 'All items must come from the same restaurant.';
    end if;
    if not v_item.is_available then
      raise exception '% is not available right now.', v_item.name;
    end if;

    new.food_name_snapshot := v_item.name;
    new.unit_selling_price := v_item.selling_price;
    new.unit_cost_price := coalesce(v_item.cost_price, 0);
  end if;

  new.line_total := new.unit_selling_price * new.quantity;
  new.line_cost_total := new.unit_cost_price * new.quantity;

  return new;
end;
$$;

create trigger order_items_prepare
before insert on public.order_items
for each row execute function public.prepare_order_item();

create or replace function public.recalc_order_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_subtotal numeric(10,2);
begin
  select coalesce(sum(line_total), 0) into v_subtotal
  from public.order_items
  where order_id = v_order_id;

  update public.orders
  set food_subtotal = v_subtotal,
      total_amount = v_subtotal + delivery_fee
  where id = v_order_id;

  return null;
end;
$$;

create trigger order_items_recalc
after insert or update or delete on public.order_items
for each row execute function public.recalc_order_totals();

-- Admin: assign (or clear) the driver for a delivery batch.

create or replace function public.assign_driver_to_batch(
  p_batch_id uuid,
  p_driver_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign drivers.';
  end if;

  if p_driver_id is null then
    delete from public.driver_batch_assignments where batch_id = p_batch_id;
  else
    if not exists (
      select 1
      from public.profiles p
      join public.driver_profiles d on d.id = p.id
      where p.id = p_driver_id and p.role = 'driver'
    ) then
      raise exception 'Driver not found.';
    end if;

    insert into public.driver_batch_assignments (batch_id, driver_id)
    values (p_batch_id, p_driver_id)
    on conflict (batch_id)
    do update set driver_id = excluded.driver_id, assigned_at = now();
  end if;

  update public.orders
  set assigned_driver_id = p_driver_id
  where batch_id = p_batch_id
    and status not in ('DELIVERED_BY_DRIVER', 'COMPLETED', 'CANCELLED');
end;
$$;

-- Driver: move an assigned order to "out for delivery" or "delivered".

create or replace function public.driver_update_order_status(
  p_order_id uuid,
  p_new_status text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not exists (
    select 1 from public.driver_profiles
    where id = auth.uid() and is_active
  ) then
    return json_build_object('success', false, 'message', 'Your driver account is not active.');
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return json_build_object('success', false, 'message', 'Order not found.');
  end if;

  if v_order.assigned_driver_id is distinct from auth.uid() then
    return json_build_object('success', false, 'message', 'This order is not assigned to you.');
  end if;

  if not (
    (p_new_status = 'OUT_FOR_DELIVERY' and v_order.status in ('CONFIRMED', 'PREPARING'))
    or (p_new_status = 'DELIVERED_BY_DRIVER' and v_order.status = 'OUT_FOR_DELIVERY')
  ) then
    return json_build_object('success', false, 'message', 'This status change is not allowed.');
  end if;

  update public.orders set status = p_new_status where id = p_order_id;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.assign_driver_to_batch(uuid, uuid) from public, anon;
revoke all on function public.driver_update_order_status(uuid, text) from public, anon;
revoke all on function public.prepare_new_order() from public, anon, authenticated;
revoke all on function public.prepare_order_item() from public, anon, authenticated;
revoke all on function public.recalc_order_totals() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.assign_driver_to_batch(uuid, uuid) to authenticated;
grant execute on function public.driver_update_order_status(uuid, text) to authenticated;
grant execute on function public.is_admin() to authenticated;

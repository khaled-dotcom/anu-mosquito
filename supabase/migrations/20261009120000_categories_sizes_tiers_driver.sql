-- ANU Mosquito: home categories, meal sizes, delivery fee tiers,
-- server-side order pricing, driver auto-assignment, image storage rules.
-- Safe to re-run: every statement is idempotent.

-- =========================================================
-- 1. Home categories (shown on the student home page)
-- =========================================================

create table if not exists public.home_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  icon text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.home_categories enable row level security;

drop policy if exists "Signed-in users view home categories" on public.home_categories;
create policy "Signed-in users view home categories" on public.home_categories
  for select to authenticated
  using (is_active or get_my_role() = any (array['admin', 'moderator']::user_role[]));

drop policy if exists "Admins manage home categories" on public.home_categories;
create policy "Admins manage home categories" on public.home_categories
  for all to authenticated
  using (get_my_role() = 'admin'::user_role)
  with check (get_my_role() = 'admin'::user_role);

insert into public.home_categories (name, icon, sort_order)
select v.name, v.icon, v.sort_order
from (values ('Burgers', '🍔', 1), ('Pizza', '🍕', 2), ('Chicken', '🍗', 3), ('Drinks', '🥤', 4)) as v(name, icon, sort_order)
where not exists (select 1 from public.home_categories);

alter table public.food_items
  add column if not exists home_category_id uuid references public.home_categories(id) on delete set null;
create index if not exists food_items_home_category_idx on public.food_items (home_category_id);

-- =========================================================
-- 2. Meal sizes (M / L / XL ...) with their own prices
-- =========================================================

create table if not exists public.food_item_sizes (
  id uuid primary key default gen_random_uuid(),
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  selling_price numeric(10,2) not null check (selling_price >= 0),
  cost_price numeric(10,2) not null default 0 check (cost_price >= 0),
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (food_item_id, name)
);
create index if not exists food_item_sizes_item_idx on public.food_item_sizes (food_item_id);

alter table public.food_item_sizes enable row level security;

drop policy if exists "Signed-in users view sizes" on public.food_item_sizes;
create policy "Signed-in users view sizes" on public.food_item_sizes
  for select to authenticated using (true);

drop policy if exists "Admins manage sizes" on public.food_item_sizes;
create policy "Admins manage sizes" on public.food_item_sizes
  for all to authenticated
  using (get_my_role() = 'admin'::user_role)
  with check (get_my_role() = 'admin'::user_role);

alter table public.order_items
  add column if not exists size_id uuid references public.food_item_sizes(id) on delete set null,
  add column if not exists size_name text;
create index if not exists order_items_size_idx on public.order_items (size_id);

-- =========================================================
-- 3. Delivery fee tiers (fee depends on the order's food total)
-- =========================================================

create table if not exists public.delivery_fee_tiers (
  id uuid primary key default gen_random_uuid(),
  min_order_total numeric(10,2) not null unique check (min_order_total >= 0),
  fee numeric(10,2) not null check (fee >= 0),
  created_at timestamptz not null default now()
);

alter table public.delivery_fee_tiers enable row level security;

drop policy if exists "Signed-in users view fee tiers" on public.delivery_fee_tiers;
create policy "Signed-in users view fee tiers" on public.delivery_fee_tiers
  for select to authenticated using (true);

drop policy if exists "Admins manage fee tiers" on public.delivery_fee_tiers;
create policy "Admins manage fee tiers" on public.delivery_fee_tiers
  for all to authenticated
  using (get_my_role() = 'admin'::user_role)
  with check (get_my_role() = 'admin'::user_role);

-- Seed from the existing settings: base fee, plus the existing
-- "orders above the threshold pay X% more" rule as a second tier.
insert into public.delivery_fee_tiers (min_order_total, fee)
select 0, s.delivery_fee
from (select delivery_fee from public.delivery_settings order by updated_at desc limit 1) s
where not exists (select 1 from public.delivery_fee_tiers);

insert into public.delivery_fee_tiers (min_order_total, fee)
select s.order_threshold, round(s.delivery_fee * (1 + s.delivery_increase_percent / 100.0), 2)
from (select * from public.delivery_settings order by updated_at desc limit 1) s
where s.order_threshold > 0
  and (select count(*) from public.delivery_fee_tiers) = 1
on conflict (min_order_total) do nothing;

create or replace function public.delivery_fee_for(p_subtotal numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select fee from public.delivery_fee_tiers
      where min_order_total <= coalesce(p_subtotal, 0)
      order by min_order_total desc limit 1),
    (select delivery_fee from public.delivery_settings order by updated_at desc limit 1),
    0
  );
$$;

-- =========================================================
-- 4. Order items are always priced from the menu (never from the browser)
-- =========================================================

create or replace function public.price_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.food_items%rowtype;
  v_size public.food_item_sizes%rowtype;
  v_role public.user_role := get_my_role();
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then
    raise exception 'Order not found.';
  end if;

  if new.quantity is null or new.quantity < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

  if new.food_item_id is null then
    if v_role is distinct from 'admin'::public.user_role then
      raise exception 'Please choose items from the menu.';
    end if;
  else
    select * into v_item from public.food_items where id = new.food_item_id;
    if not found then
      raise exception 'An item in your cart no longer exists.';
    end if;
    if v_item.restaurant_id <> v_order.restaurant_id then
      raise exception 'All items must come from the same restaurant.';
    end if;
    if not v_item.is_available then
      raise exception '% is not available right now.', v_item.name;
    end if;

    new.size_name := null;

    if new.size_id is not null then
      select * into v_size from public.food_item_sizes
        where id = new.size_id and food_item_id = v_item.id;
      if not found then
        raise exception 'The chosen size for % no longer exists.', v_item.name;
      end if;
      if not v_size.is_available then
        raise exception '% (%) is not available right now.', v_item.name, v_size.name;
      end if;
      new.unit_selling_price := v_size.selling_price;
      new.unit_cost_price := coalesce(v_size.cost_price, 0);
      new.size_name := v_size.name;
      new.food_name_snapshot := v_item.name || ' (' || v_size.name || ')';
    else
      if exists (select 1 from public.food_item_sizes where food_item_id = v_item.id and is_available) then
        raise exception 'Please choose a size for %.', v_item.name;
      end if;
      new.unit_selling_price := v_item.selling_price;
      new.unit_cost_price := coalesce(v_item.cost_price, 0);
      new.food_name_snapshot := v_item.name;
    end if;
  end if;

  new.line_total := new.unit_selling_price * new.quantity;
  new.line_cost_total := coalesce(new.unit_cost_price, 0) * new.quantity;

  return new;
end;
$$;

drop trigger if exists price_order_item_trigger on public.order_items;
create trigger price_order_item_trigger
  before insert on public.order_items
  for each row execute function public.price_order_item();

create or replace function public.recalc_order_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_subtotal numeric(10,2);
  v_cost numeric(10,2);
begin
  select coalesce(sum(line_total), 0), coalesce(sum(line_cost_total), 0)
    into v_subtotal, v_cost
  from public.order_items
  where order_id = v_order_id;

  update public.orders o
  set food_subtotal = v_subtotal,
      food_cost_total = v_cost,
      delivery_fee = case
        when o.status = 'PAYMENT_UNDER_CONFIRMATION'::public.order_status
          then public.delivery_fee_for(v_subtotal)
        else o.delivery_fee
      end,
      total_amount = v_subtotal + case
        when o.status = 'PAYMENT_UNDER_CONFIRMATION'::public.order_status
          then public.delivery_fee_for(v_subtotal)
        else o.delivery_fee
      end
  where o.id = v_order_id;

  return null;
end;
$$;

drop trigger if exists recalc_order_totals_trigger on public.order_items;
create trigger recalc_order_totals_trigger
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_totals();

-- =========================================================
-- 5. Drivers: new orders inherit the driver assigned to their batch
-- =========================================================

create or replace function public.assign_batch_driver_to_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_driver_id is null then
    select driver_id into new.assigned_driver_id
    from public.driver_batch_assignments
    where batch_id = new.batch_id
    order by assigned_at desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_batch_driver_trigger on public.orders;
create trigger assign_batch_driver_trigger
  before insert on public.orders
  for each row execute function public.assign_batch_driver_to_order();

-- Backfill open orders that were placed after their batch got a driver.
update public.orders o
set assigned_driver_id = d.driver_id
from public.driver_batch_assignments d
where d.batch_id = o.batch_id
  and o.assigned_driver_id is null
  and o.status not in ('DELIVERED_BY_DRIVER', 'COMPLETED', 'CANCELLED');

-- Drivers can pick up anything that is confirmed, being prepared or ready.
create or replace function public.driver_update_order_status(p_order_id uuid, p_new_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if get_my_role() is distinct from 'driver'::public.user_role then
    return json_build_object('success', false, 'message', 'Only drivers can update order status.');
  end if;

  if exists (select 1 from public.driver_profiles where id = auth.uid() and not is_active) then
    return json_build_object('success', false, 'message', 'Your driver account is not active.');
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return json_build_object('success', false, 'message', 'Order not found.');
  end if;

  if not exists (
       select 1 from public.driver_batch_assignments
       where batch_id = v_order.batch_id and driver_id = auth.uid())
     and v_order.assigned_driver_id is distinct from auth.uid() then
    return json_build_object('success', false, 'message', 'Order is not assigned to this driver.');
  end if;

  if p_new_status = 'OUT_FOR_DELIVERY'
     and v_order.status in ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP') then
    update public.orders
    set status = 'OUT_FOR_DELIVERY',
        assigned_driver_id = auth.uid(),
        picked_up_at = coalesce(picked_up_at, now()),
        out_for_delivery_at = now()
    where id = p_order_id;
  elsif p_new_status = 'DELIVERED_BY_DRIVER' and v_order.status = 'OUT_FOR_DELIVERY' then
    update public.orders
    set status = 'DELIVERED_BY_DRIVER',
        assigned_driver_id = auth.uid(),
        delivered_at = now()
    where id = p_order_id;
  else
    return json_build_object(
      'success', false,
      'message', 'Invalid status transition from ' || v_order.status::text || ' to ' || p_new_status
    );
  end if;

  return json_build_object(
    'success', true,
    'message', 'Order status updated successfully.',
    'order_id', p_order_id,
    'new_status', p_new_status
  );
end;
$$;

-- =========================================================
-- 6. Only admins may change the menu
-- =========================================================

drop policy if exists "Authenticated users can insert food items" on public.food_items;
drop policy if exists "Authenticated users can update food items" on public.food_items;
drop policy if exists "Admins can insert food items" on public.food_items;
drop policy if exists "Admins can update food items" on public.food_items;

create policy "Admins can insert food items" on public.food_items
  for insert to authenticated with check (get_my_role() = 'admin'::user_role);
create policy "Admins can update food items" on public.food_items
  for update to authenticated
  using (get_my_role() = 'admin'::user_role)
  with check (get_my_role() = 'admin'::user_role);

-- =========================================================
-- 7. Image storage: public reads, admin-only uploads (compressed WebP/JPEG/PNG, max 2 MB)
-- =========================================================

update storage.buckets
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'food_images';

drop policy if exists "Allow authenticated users to upload food images" on storage.objects;
drop policy if exists "Admins upload food images" on storage.objects;
drop policy if exists "Admins update food images" on storage.objects;
drop policy if exists "Admins delete food images" on storage.objects;

create policy "Admins upload food images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'food_images' and public.get_my_role() = 'admin'::public.user_role);
create policy "Admins update food images" on storage.objects
  for update to authenticated
  using (bucket_id = 'food_images' and public.get_my_role() = 'admin'::public.user_role);
create policy "Admins delete food images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'food_images' and public.get_my_role() = 'admin'::public.user_role);

-- Function permissions
revoke all on function public.price_order_item() from public, anon, authenticated;
revoke all on function public.recalc_order_totals() from public, anon, authenticated;
revoke all on function public.assign_batch_driver_to_order() from public, anon, authenticated;
revoke all on function public.delivery_fee_for(numeric) from public, anon;
grant execute on function public.delivery_fee_for(numeric) to authenticated;

-- Table privileges for the new tables (row level security above decides which rows)
grant select, insert, update, delete on public.home_categories to authenticated;
grant select, insert, update, delete on public.food_item_sizes to authenticated;
grant select, insert, update, delete on public.delivery_fee_tiers to authenticated;
revoke all on public.home_categories, public.food_item_sizes, public.delivery_fee_tiers from anon;

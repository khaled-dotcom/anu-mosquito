-- Table privileges: only signed-in users talk to the data API.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.food_categories enable row level security;
alter table public.food_items enable row level security;
alter table public.delivery_batches enable row level security;
alter table public.payment_methods enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.driver_batch_assignments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles
create policy "Read own profile or admin reads all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update profiles" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Catalogue tables: everyone signed in can read, admins manage.
create policy "Signed-in users read restaurants" on public.restaurants
  for select to authenticated using (true);
create policy "Admins insert restaurants" on public.restaurants
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update restaurants" on public.restaurants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete restaurants" on public.restaurants
  for delete to authenticated using ((select public.is_admin()));

create policy "Signed-in users read categories" on public.food_categories
  for select to authenticated using (true);
create policy "Admins insert categories" on public.food_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update categories" on public.food_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete categories" on public.food_categories
  for delete to authenticated using ((select public.is_admin()));

create policy "Signed-in users read food" on public.food_items
  for select to authenticated using (true);
create policy "Admins insert food" on public.food_items
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update food" on public.food_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete food" on public.food_items
  for delete to authenticated using ((select public.is_admin()));

create policy "Signed-in users read batches" on public.delivery_batches
  for select to authenticated using (true);
create policy "Admins insert batches" on public.delivery_batches
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update batches" on public.delivery_batches
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete batches" on public.delivery_batches
  for delete to authenticated using ((select public.is_admin()));

create policy "Signed-in users read payment methods" on public.payment_methods
  for select to authenticated using (true);
create policy "Admins insert payment methods" on public.payment_methods
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update payment methods" on public.payment_methods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete payment methods" on public.payment_methods
  for delete to authenticated using ((select public.is_admin()));

create policy "Signed-in users read delivery settings" on public.delivery_settings
  for select to authenticated using (true);
create policy "Admins insert delivery settings" on public.delivery_settings
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update delivery settings" on public.delivery_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Drivers
create policy "Driver reads own driver profile, admin reads all" on public.driver_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update driver profiles" on public.driver_profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Driver reads own assignments, admin reads all" on public.driver_batch_assignments
  for select to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()));

-- Orders
create policy "Students, assigned drivers and admins read orders" on public.orders
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or assigned_driver_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "Students create their own orders" on public.orders
  for insert to authenticated
  with check (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update orders" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete orders" on public.orders
  for delete to authenticated using ((select public.is_admin()));

create policy "Read items of visible orders" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Students add items to their own orders" on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.student_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Admins update order items" on public.order_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete order items" on public.order_items
  for delete to authenticated using ((select public.is_admin()));

-- Storage: private bucket for payment screenshots, one folder per student.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "Students upload their own payment proofs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Students read own proofs, admins read all" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );
create policy "Admins delete payment proofs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and (select public.is_admin()));

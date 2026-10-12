create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('PERCENTAGE','FIXED')),
  value numeric(12,2) not null check (value > 0),
  min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
  max_discount_amount numeric(12,2),
  usage_limit integer,
  usage_per_student integer,
  starts_at timestamptz,
  expires_at timestamptz,
  target_type text not null default 'ALL' check (target_type in ('ALL','TEAM','RESTAURANT')),
  target_team_id uuid references public.teams(id) on delete set null,
  target_restaurant_id uuid references public.restaurants(id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_code_upper_unique unique (code),
  constraint discounts_percentage_max check (discount_type <> 'PERCENTAGE' or value <= 100),
  constraint discounts_max_discount_nonnegative check (max_discount_amount is null or max_discount_amount >= 0),
  constraint discounts_usage_limit_positive check (usage_limit is null or usage_limit > 0),
  constraint discounts_usage_per_student_positive check (usage_per_student is null or usage_per_student > 0),
  constraint discounts_dates_valid check (expires_at is null or starts_at is null or expires_at > starts_at),
  constraint discounts_target_valid check (
    (target_type = 'ALL' and target_team_id is null and target_restaurant_id is null)
    or (target_type = 'TEAM' and target_team_id is not null and target_restaurant_id is null)
    or (target_type = 'RESTAURANT' and target_team_id is null and target_restaurant_id is not null)
  )
);

create unique index discounts_code_upper_idx on public.discounts (upper(code));
create index discounts_active_idx on public.discounts (is_active);
create index discounts_team_idx on public.discounts (target_team_id);
create index discounts_restaurant_idx on public.discounts (target_restaurant_id);

create table public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  discount_amount numeric(12,2) not null check (discount_amount > 0),
  used_at timestamptz not null default now(),
  unique (discount_id, order_id)
);

create index discount_usages_discount_idx on public.discount_usages(discount_id);
create index discount_usages_student_idx on public.discount_usages(student_id);
create index discount_usages_order_idx on public.discount_usages(order_id);

alter table public.discounts enable row level security;
alter table public.discount_usages enable row level security;

grant select, insert, update, delete on table public.discounts to authenticated;
grant select on table public.discount_usages to authenticated;

create policy "Admins can manage discounts"
on public.discounts for all to authenticated
using (get_my_role() = 'admin'::user_role)
with check (get_my_role() = 'admin'::user_role);

create policy "Admins can view discount usages"
on public.discount_usages for select to authenticated
using (get_my_role() = 'admin'::user_role);

create policy "Students can view own discount usages"
on public.discount_usages for select to authenticated
using (student_id = auth.uid());
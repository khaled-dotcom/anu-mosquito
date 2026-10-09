-- ANU Mosquito core schema

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  university_id text unique,
  driver_id text unique,
  phone text,
  role text not null default 'student'
    check (role in ('student', 'driver', 'admin', 'moderator')),
  admin_id text,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.food_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index food_categories_restaurant_idx on public.food_categories (restaurant_id);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.food_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  selling_price numeric(10,2) not null check (selling_price >= 0),
  cost_price numeric(10,2) check (cost_price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
create index food_items_restaurant_idx on public.food_items (restaurant_id);
create index food_items_category_idx on public.food_items (category_id);

-- Times are stored without a zone: the admin enters local (Cairo) times and
-- the browser reads them back as local times.
create table public.delivery_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number integer not null,
  registration_start timestamp not null,
  registration_end timestamp not null,
  delivery_time timestamp not null,
  delivery_date date not null,
  maximum_orders integer not null check (maximum_orders > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  account_number text,
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.delivery_settings (
  id uuid primary key default gen_random_uuid(),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  driver_cost numeric(10,2) not null default 0 check (driver_cost >= 0),
  updated_at timestamptz not null default now()
);
insert into public.delivery_settings (delivery_fee, driver_cost) values (0, 0);

create table public.driver_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.driver_batch_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null unique references public.delivery_batches(id) on delete cascade,
  assigned_at timestamptz not null default now()
);
create index driver_batch_assignments_driver_idx on public.driver_batch_assignments (driver_id);

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('ANU-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  student_id uuid not null references public.profiles(id),
  restaurant_id uuid not null references public.restaurants(id),
  batch_id uuid not null references public.delivery_batches(id),
  assigned_driver_id uuid references public.profiles(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  food_subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  driver_cost numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  payment_screenshot_path text,
  payment_status text not null default 'UNDER_CONFIRMATION'
    check (payment_status in ('UNDER_CONFIRMATION', 'PAID', 'REJECTED')),
  status text not null default 'PAYMENT_UNDER_CONFIRMATION'
    check (status in (
      'PAYMENT_UNDER_CONFIRMATION', 'CONFIRMED', 'PREPARING',
      'OUT_FOR_DELIVERY', 'DELIVERED_BY_DRIVER', 'COMPLETED', 'CANCELLED'
    )),
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index orders_student_idx on public.orders (student_id);
create index orders_restaurant_idx on public.orders (restaurant_id);
create index orders_batch_idx on public.orders (batch_id);
create index orders_driver_idx on public.orders (assigned_driver_id);
create index orders_payment_method_idx on public.orders (payment_method_id);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  food_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_selling_price numeric(10,2) not null default 0,
  unit_cost_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0,
  line_cost_total numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_food_idx on public.order_items (food_item_id);

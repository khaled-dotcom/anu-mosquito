-- Additive Teams foundation.
-- This migration intentionally does not alter existing tables, orders, checkout,
-- profiles, RPCs, triggers, or existing policies.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index teams_name_unique_idx
  on public.teams (lower(name));

alter table public.teams enable row level security;

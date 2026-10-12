-- Additive Team membership foundation.
-- Links existing profiles to teams without changing profiles or any existing
-- ordering, checkout, restaurant, or authentication behavior.

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint team_members_team_student_unique unique (team_id, student_id)
);

create index team_members_team_id_idx
  on public.team_members (team_id);

create index team_members_student_id_idx
  on public.team_members (student_id);

alter table public.team_members enable row level security;

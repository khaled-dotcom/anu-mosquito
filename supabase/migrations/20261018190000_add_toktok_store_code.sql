-- Add a stable short code for each ANU TokTok store.
alter table public.toktok_stores
  add column if not exists code text;

-- Preserve existing stores by assigning a deterministic code where missing.
update public.toktok_stores
set code = 'TT-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where code is null or btrim(code) = '';

create unique index if not exists toktok_stores_code_unique
  on public.toktok_stores (upper(code));

alter table public.toktok_stores
  alter column code set not null;

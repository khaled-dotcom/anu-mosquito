-- ANU Mosquito: driver cost per delivery batch
-- The cost belongs to the batch, not to each order.

alter table public.delivery_batches
  add column if not exists driver_cost numeric(10,2) not null default 0
  check (driver_cost >= 0);

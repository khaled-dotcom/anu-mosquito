-- Student delivery confirmation
-- Driver confirmation remains delivered_at / DELIVERED_BY_DRIVER.
-- The order becomes COMPLETED only after the student confirms receipt.

alter table public.orders
  add column if not exists student_confirmed_at timestamptz;

create or replace function public.student_confirm_order_received(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Please log in again.');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and student_id = auth.uid()
  for update;

  if not found then
    return json_build_object('success', false, 'message', 'Order not found.');
  end if;

  if v_order.status <> 'DELIVERED_BY_DRIVER' then
    return json_build_object(
      'success', false,
      'message', 'You can confirm the order only after the driver marks it as delivered.'
    );
  end if;

  if v_order.student_confirmed_at is not null then
    return json_build_object(
      'success', true,
      'message', 'Order already confirmed.',
      'order_id', p_order_id,
      'new_status', 'COMPLETED'
    );
  end if;

  update public.orders
  set student_confirmed_at = now(),
      status = 'COMPLETED'
  where id = p_order_id;

  return json_build_object(
    'success', true,
    'message', 'Order confirmed successfully.',
    'order_id', p_order_id,
    'new_status', 'COMPLETED'
  );
end;
$$;

revoke all on function public.student_confirm_order_received(uuid) from public, anon;
grant execute on function public.student_confirm_order_received(uuid) to authenticated;

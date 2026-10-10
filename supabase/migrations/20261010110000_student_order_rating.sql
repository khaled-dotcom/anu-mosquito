-- Student order rating and feedback
alter table public.orders
  add column if not exists student_rating smallint,
  add column if not exists student_feedback text,
  add column if not exists student_reviewed_at timestamptz;

alter table public.orders
  drop constraint if exists orders_student_rating_check;

alter table public.orders
  add constraint orders_student_rating_check
  check (student_rating is null or student_rating between 1 and 5);

create or replace function public.submit_student_order_review(
  p_order_id uuid,
  p_rating smallint,
  p_feedback text default null
)
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

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return json_build_object('success', false, 'message', 'Please choose a rating from 1 to 5 stars.');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and student_id = auth.uid()
  for update;

  if not found then
    return json_build_object('success', false, 'message', 'Order not found.');
  end if;

  if v_order.status <> 'COMPLETED' then
    return json_build_object('success', false, 'message', 'You can review the order only after it is completed.');
  end if;

  if v_order.student_reviewed_at is not null then
    return json_build_object('success', false, 'message', 'This order has already been reviewed.');
  end if;

  update public.orders
  set student_rating = p_rating,
      student_feedback = nullif(trim(coalesce(p_feedback, '')), ''),
      student_reviewed_at = now()
  where id = p_order_id;

  return json_build_object(
    'success', true,
    'message', 'Thank you for your feedback.',
    'order_id', p_order_id
  );
end;
$$;

revoke all on function public.submit_student_order_review(uuid, smallint, text) from public, anon;
grant execute on function public.submit_student_order_review(uuid, smallint, text) to authenticated;

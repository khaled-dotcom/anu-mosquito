-- Place an order and its items in one transaction, so a failed item
-- (unavailable, wrong size...) never leaves an empty order behind.
-- Runs with the caller's permissions: row level security still applies and
-- the pricing triggers set every price from the menu.

create or replace function public.place_student_order(
  p_restaurant_id uuid,
  p_batch_id uuid,
  p_payment_method_id uuid,
  p_payment_screenshot_path text,
  p_items jsonb
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_result json;
begin
  if auth.uid() is null then
    raise exception 'Please log in again.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order.';
  end if;

  insert into public.orders (
    student_id, restaurant_id, batch_id, payment_method_id,
    payment_screenshot_path, payment_status, status,
    food_subtotal, delivery_fee, total_amount
  )
  values (
    auth.uid(), p_restaurant_id, p_batch_id, p_payment_method_id,
    p_payment_screenshot_path, 'UNDER_CONFIRMATION', 'PAYMENT_UNDER_CONFIRMATION',
    0, 0, 0
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, food_item_id, size_id, food_name_snapshot,
      quantity, unit_selling_price, line_total, line_cost_total
    )
    values (
      v_order_id,
      nullif(v_item ->> 'food_item_id', '')::uuid,
      nullif(v_item ->> 'size_id', '')::uuid,
      '',
      greatest(1, least(99, coalesce((v_item ->> 'quantity')::int, 1))),
      0, 0, 0
    );
  end loop;

  select json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'food_subtotal', o.food_subtotal,
    'delivery_fee', o.delivery_fee,
    'total_amount', o.total_amount,
    'status', o.status,
    'payment_status', o.payment_status
  ) into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function public.place_student_order(uuid, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.place_student_order(uuid, uuid, uuid, text, jsonb) to authenticated;

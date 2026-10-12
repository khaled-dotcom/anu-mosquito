create or replace function public.validate_discount_code(
  p_code text,
  p_student_id uuid,
  p_order_amount numeric,
  p_restaurant_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discount public.discounts%rowtype;
  v_discount_amount numeric(12,2);
  v_usage_count integer;
  v_student_usage_count integer;
  v_is_team_member boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_student_id then
    raise exception 'Not authorized';
  end if;

  if p_order_amount is null or p_order_amount < 0 then
    raise exception 'Invalid order amount';
  end if;

  select * into v_discount
  from public.discounts
  where upper(code) = upper(trim(p_code)) and is_active = true
  limit 1;

  if not found then raise exception 'Invalid or inactive discount code'; end if;
  if v_discount.starts_at is not null and now() < v_discount.starts_at then raise exception 'Discount is not active yet'; end if;
  if v_discount.expires_at is not null and now() >= v_discount.expires_at then raise exception 'Discount has expired'; end if;
  if p_order_amount < v_discount.min_order_amount then raise exception 'Minimum order amount for this discount is %', v_discount.min_order_amount; end if;

  if v_discount.target_type = 'RESTAURANT' then
    if p_restaurant_id is null or v_discount.target_restaurant_id <> p_restaurant_id then raise exception 'Discount is not valid for this restaurant'; end if;
  elsif v_discount.target_type = 'TEAM' then
    select exists (
      select 1 from public.team_members tm
      where tm.team_id = v_discount.target_team_id and tm.student_id = p_student_id
    ) into v_is_team_member;
    if not v_is_team_member then raise exception 'Discount is not available for your team'; end if;
  end if;

  select count(*)::integer into v_usage_count from public.discount_usages where discount_id = v_discount.id;
  if v_discount.usage_limit is not null and v_usage_count >= v_discount.usage_limit then raise exception 'Discount usage limit has been reached'; end if;

  select count(*)::integer into v_student_usage_count from public.discount_usages where discount_id = v_discount.id and student_id = p_student_id;
  if v_discount.usage_per_student is not null and v_student_usage_count >= v_discount.usage_per_student then raise exception 'You have reached the usage limit for this discount'; end if;

  if v_discount.discount_type = 'PERCENTAGE' then
    v_discount_amount := round(p_order_amount * v_discount.value / 100, 2);
  else
    v_discount_amount := v_discount.value;
  end if;

  if v_discount.max_discount_amount is not null then
    v_discount_amount := least(v_discount_amount, v_discount.max_discount_amount);
  end if;

  v_discount_amount := least(v_discount_amount, p_order_amount);

  return json_build_object(
    'valid', true,
    'discount_id', v_discount.id,
    'code', v_discount.code,
    'discount_type', v_discount.discount_type,
    'discount_value', v_discount.value,
    'discount_amount', v_discount_amount,
    'order_amount', p_order_amount,
    'total_after_discount', p_order_amount - v_discount_amount
  );
end;
$$;

revoke all on function public.validate_discount_code(text, uuid, numeric, uuid) from public;
grant execute on function public.validate_discount_code(text, uuid, numeric, uuid) to authenticated;

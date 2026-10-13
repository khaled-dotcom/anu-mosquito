-- Discount-aware order creation uses a distinct RPC name to avoid PostgREST
-- ambiguity with the original five-argument place_student_order function.

CREATE OR REPLACE FUNCTION public.apply_discount_to_student_order(
  p_order_id uuid,
  p_discount_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_discount public.discounts%ROWTYPE;
  v_amount numeric(12,2) := 0;
  v_usage_count integer;
  v_student_usage_count integer;
  v_is_team_member boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please log in again.'; END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND student_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.discount_id IS NOT NULL THEN RAISE EXCEPTION 'A discount is already applied to this order.'; END IF;

  SELECT * INTO v_discount FROM public.discounts
  WHERE id = p_discount_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Discount is no longer available.'; END IF;
  IF v_discount.starts_at IS NOT NULL AND now() < v_discount.starts_at THEN RAISE EXCEPTION 'Discount is not active yet.'; END IF;
  IF v_discount.expires_at IS NOT NULL AND now() >= v_discount.expires_at THEN RAISE EXCEPTION 'Discount has expired.'; END IF;
  IF v_order.food_subtotal < v_discount.min_order_amount THEN RAISE EXCEPTION 'Minimum order amount for this discount is %', v_discount.min_order_amount; END IF;

  IF v_discount.target_type = 'RESTAURANT' AND v_discount.target_restaurant_id IS DISTINCT FROM v_order.restaurant_id THEN
    RAISE EXCEPTION 'Discount is not valid for this restaurant.';
  ELSIF v_discount.target_type = 'TEAM' THEN
    SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = v_discount.target_team_id AND student_id = auth.uid()) INTO v_is_team_member;
    IF NOT v_is_team_member THEN RAISE EXCEPTION 'Discount is not available for your team.'; END IF;
  END IF;

  SELECT count(*)::integer INTO v_usage_count FROM public.discount_usages WHERE discount_id = v_discount.id;
  IF v_discount.usage_limit IS NOT NULL AND v_usage_count >= v_discount.usage_limit THEN RAISE EXCEPTION 'Discount usage limit has been reached.'; END IF;
  SELECT count(*)::integer INTO v_student_usage_count FROM public.discount_usages WHERE discount_id = v_discount.id AND student_id = auth.uid();
  IF v_discount.usage_per_student IS NOT NULL AND v_student_usage_count >= v_discount.usage_per_student THEN RAISE EXCEPTION 'You have reached the usage limit for this discount.'; END IF;

  IF v_discount.discount_type = 'PERCENTAGE' THEN
    v_amount := round(v_order.food_subtotal * v_discount.value / 100, 2);
  ELSE
    v_amount := v_discount.value;
  END IF;
  IF v_discount.max_discount_amount IS NOT NULL THEN v_amount := least(v_amount, v_discount.max_discount_amount); END IF;
  v_amount := least(v_amount, v_order.food_subtotal);

  UPDATE public.orders SET discount_id = v_discount.id, discount_amount = v_amount,
    total_amount = greatest(0, food_subtotal + delivery_fee - v_amount)
  WHERE id = v_order.id;

  INSERT INTO public.discount_usages(discount_id, student_id, order_id, discount_amount)
  VALUES (v_discount.id, auth.uid(), v_order.id, v_amount);
  RETURN v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_discount_to_student_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_discount_to_student_order(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.place_student_order_with_discount(
  p_restaurant_id uuid,
  p_batch_id uuid,
  p_payment_method_id uuid,
  p_payment_screenshot_path text,
  p_items jsonb,
  p_discount_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please log in again.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Your cart is empty.'; END IF;
  IF jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Too many items in one order.'; END IF;

  INSERT INTO public.orders (
    student_id, restaurant_id, batch_id, payment_method_id,
    payment_screenshot_path, payment_status, status,
    food_subtotal, delivery_fee, total_amount
  ) VALUES (
    auth.uid(), p_restaurant_id, p_batch_id, p_payment_method_id,
    p_payment_screenshot_path, 'UNDER_CONFIRMATION', 'PAYMENT_UNDER_CONFIRMATION',
    0, 0, 0
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (
      order_id, food_item_id, size_id, food_name_snapshot,
      quantity, unit_selling_price, line_total, line_cost_total
    ) VALUES (
      v_order_id,
      nullif(v_item ->> 'food_item_id', '')::uuid,
      nullif(v_item ->> 'size_id', '')::uuid,
      '',
      greatest(1, least(99, coalesce((v_item ->> 'quantity')::int, 1))),
      0, 0, 0
    );
  END LOOP;

  IF p_discount_id IS NOT NULL THEN
    PERFORM public.apply_discount_to_student_order(v_order_id, p_discount_id);
  END IF;

  SELECT json_build_object(
    'id', o.id, 'order_number', o.order_number,
    'food_subtotal', o.food_subtotal, 'delivery_fee', o.delivery_fee,
    'discount_id', o.discount_id, 'discount_amount', o.discount_amount,
    'total_amount', o.total_amount, 'status', o.status,
    'payment_status', o.payment_status
  ) INTO v_result FROM public.orders o WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_student_order_with_discount(uuid, uuid, uuid, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_student_order_with_discount(uuid, uuid, uuid, text, jsonb, uuid) TO authenticated;

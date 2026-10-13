-- Preserve the original order creation logic and apply discount only after it
-- creates a fully priced order. This avoids duplicating item/price/batch logic.
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
  v_original json;
  v_order_id uuid;
  v_result json;
BEGIN
  v_original := public.place_student_order(
    p_restaurant_id, p_batch_id, p_payment_method_id,
    p_payment_screenshot_path, p_items
  );

  IF p_discount_id IS NULL THEN
    RETURN v_original;
  END IF;

  v_order_id := (v_original ->> 'id')::uuid;
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Could not identify the created order.';
  END IF;

  PERFORM public.apply_discount_to_student_order(v_order_id, p_discount_id);

  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'food_subtotal', o.food_subtotal,
    'delivery_fee', o.delivery_fee,
    'discount_id', o.discount_id,
    'discount_amount', o.discount_amount,
    'total_amount', o.total_amount,
    'status', o.status,
    'payment_status', o.payment_status
  ) INTO v_result
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_student_order_with_discount(uuid, uuid, uuid, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_student_order_with_discount(uuid, uuid, uuid, text, jsonb, uuid) TO authenticated;

import { supabase } from '../supabase'

export async function validateDiscountCode(code, studentId, orderAmount, restaurantId) {
  const { data, error } = await supabase.rpc('validate_discount_code', {
    p_code: code,
    p_student_id: studentId,
    p_order_amount: orderAmount,
    p_restaurant_id: restaurantId,
  })

  return { data, error }
}

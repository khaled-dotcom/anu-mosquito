import { supabase } from '../supabase'

export async function loadStudentOrders(studentId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      restaurant_id,
      batch_id,
      food_subtotal,
      delivery_fee,
      total_amount,
      payment_status,
      status,
      payment_screenshot_path,
      created_at,
      order_items (
        id,
        food_name_snapshot,
        quantity,
        unit_selling_price,
        line_total
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  return {
    data,
    error,
  }
}
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
      student_rating,
      student_feedback,
      student_reviewed_at,
      payment_screenshot_path,
      created_at,
      restaurants (
        name
      ),
      delivery_batches (
        batch_number,
        delivery_time
      ),
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

export async function confirmStudentOrderReceived(orderId) {
  const { data, error } = await supabase.rpc('student_confirm_order_received', {
    p_order_id: orderId,
  })

  return { data, error }
}

export async function submitStudentOrderReview(orderId, rating, feedback) {
  const { data, error } = await supabase.rpc('submit_student_order_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_feedback: feedback || null,
  })

  return { data, error }
}

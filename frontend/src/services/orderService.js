import { supabase } from '../supabase'

/**
 * Place an order with its items in one database transaction.
 * Prices, delivery fee and totals are set by the database from the menu.
 */
export async function createOrder(orderData) {
  const items = (orderData.items || []).map((item) => ({
    food_item_id: item.id,
    size_id: item.size_id || null,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('place_student_order', {
    p_restaurant_id: orderData.restaurant_id,
    p_batch_id: orderData.batch_id,
    p_payment_method_id: orderData.payment_method_id,
    p_payment_screenshot_path: orderData.payment_screenshot_path,
    p_items: items,
  })

  if (error) {
    return { data: null, error }
  }

  return { data: { order: data }, error: null }
}

export async function loadAvailableBatches() {
  const { data, error } = await supabase
    .from('delivery_batches')
    .select('*')
    .eq('is_active', true)
    .order('delivery_date', { ascending: true })
    .order('batch_number', { ascending: true })

  return {
    data,
    error,
  }
}
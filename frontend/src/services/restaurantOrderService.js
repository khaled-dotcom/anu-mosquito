import { supabase } from '../supabase'

export async function loadRestaurantOrders(restaurantId, batchId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      restaurant_id,
      batch_id,
      status,
      created_at,

      order_items (
        id,
        food_name_snapshot,
        quantity,
        notes
      ),

      restaurants (
        name
      ),

      delivery_batches (
        batch_number,
        delivery_date
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })

  return {
    data,
    error,
  }
}
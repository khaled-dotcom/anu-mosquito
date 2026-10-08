import { supabase } from '../supabase'

export async function createOrder(orderData) {
  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .insert([
      {
        student_id: orderData.student_id,
        restaurant_id: orderData.restaurant_id,
        batch_id: orderData.batch_id,
        food_subtotal: orderData.food_subtotal,
        delivery_fee: orderData.delivery_fee,
        total_amount: orderData.total_amount,
        payment_method_id: orderData.payment_method_id,
        payment_screenshot_path: orderData.payment_screenshot_path,
        payment_status: 'UNDER_CONFIRMATION',
        status: 'PAYMENT_UNDER_CONFIRMATION',
      },
    ])
    .select()
    .single()

  if (orderError) {
    return {
      data: null,
      error: orderError,
    }
  }

  const orderItems = orderData.items.map((item) => ({
    order_id: order.id,
    food_item_id: item.id,
    food_name_snapshot: item.name,
    quantity: item.quantity,
    unit_selling_price: item.selling_price,
    unit_cost_price: item.cost_price ?? 0,
    line_total: item.selling_price * item.quantity,
    line_cost_total: (item.cost_price ?? 0) * item.quantity,
  }))

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select()

  if (itemsError) {
    return {
      data: null,
      error: itemsError,
    }
  }

  return {
    data: {
      order,
      items,
    },
    error: null,
  }
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
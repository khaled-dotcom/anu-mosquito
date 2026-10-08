import { supabase } from '../supabase'

export async function loadFinanceOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      restaurant_id,
      batch_id,
      food_subtotal,
      delivery_fee,
      driver_cost,
      total_amount,
      payment_status,
      status,
      created_at,

      restaurants (
        name
      ),

      delivery_batches (
        batch_number,
        delivery_date
      ),

      order_items (
        id,
        quantity,
        unit_cost_price,
        line_cost_total
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      data: null,
      error,
    }
  }

  const financeOrders = (data || []).map((order) => {
    const foodCost = (order.order_items || []).reduce(
      (total, item) =>
        total + Number(item.line_cost_total || 0),
      0
    )

    const foodSales = Number(order.food_subtotal || 0)
    const deliveryFee = Number(order.delivery_fee || 0)
    const driverCost = Number(order.driver_cost || 0)

    const foodProfit = foodSales - foodCost
    const deliveryProfit = deliveryFee - driverCost

    const profit = foodProfit + deliveryProfit

    return {
      ...order,
      food_cost_total: foodCost,
      food_profit: foodProfit,
      delivery_profit: deliveryProfit,
      profit,
    }
  })

  return {
    data: financeOrders,
    error: null,
  }
}
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
        delivery_date,
        driver_cost
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

  // Driver cost is a batch-level cost. Allocate it across the
  // financially relevant orders only for per-order display/profit.
  // The total allocation for each batch always equals the batch cost.
  const batchOrderCounts = new Map()

  ;(data || []).forEach((order) => {
    if (!order.batch_id) return
    if (order.status === 'CANCELLED') return

    batchOrderCounts.set(
      order.batch_id,
      (batchOrderCounts.get(order.batch_id) || 0) + 1
    )
  })

  const financeOrders = (data || []).map((order) => {
    const foodCost = (order.order_items || []).reduce(
      (total, item) =>
        total + Number(item.line_cost_total || 0),
      0
    )

    const foodSales = Number(order.food_subtotal || 0)
    const deliveryFee = Number(order.delivery_fee || 0)

    const batchDriverCost =
      order.delivery_batches?.driver_cost == null
        ? Number(order.driver_cost || 0)
        : Number(order.delivery_batches.driver_cost || 0)

    const batchOrderCount = batchOrderCounts.get(order.batch_id) || 0

    const allocatedDriverCost =
      order.status === 'CANCELLED' || batchOrderCount === 0
        ? 0
        : batchDriverCost / batchOrderCount

    const foodProfit = foodSales - foodCost
    const deliveryProfit = deliveryFee - allocatedDriverCost
    const profit = foodProfit + deliveryProfit

    return {
      ...order,
      driver_cost: allocatedDriverCost,
      batch_driver_cost: batchDriverCost,
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
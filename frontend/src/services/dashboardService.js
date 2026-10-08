import { supabase } from '../supabase'

export async function loadDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  const [
    restaurantsResult,
    foodItemsResult,
    ordersResult,
    studentsResult,
    todayOrdersResult,
    pendingPaymentsResult,
  ] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase
      .from('food_items')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student'),

    supabase
      .from('orders')
      .select('total_amount')
      .eq('order_date', today)
      .neq('status', 'CANCELLED'),

      supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('payment_status', 'UNDER_CONFIRMATION'),
  ])

  const error =
    restaurantsResult.error ||
    foodItemsResult.error ||
    ordersResult.error ||
    studentsResult.error ||
    todayOrdersResult.error
    pendingPaymentsResult.error

  if (error) {
    return {
      data: null,
      error,
    }
  }

  const todayOrders = todayOrdersResult.data || []

  

  const todayRevenue = todayOrders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
    0
  )

  return {
    data: {
      activeRestaurants: restaurantsResult.count || 0,
      foodItems: foodItemsResult.count || 0,
      orders: ordersResult.count || 0,
      students: studentsResult.count || 0,
      todayOrders: todayOrders.length,
      todayRevenue,
      pendingPayments: pendingPaymentsResult.count || 0,
    },
    error: null,
  }
}
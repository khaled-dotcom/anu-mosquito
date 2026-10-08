import { supabase } from '../supabase'

export async function loadAdminOrders() {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      student_id,
      restaurant_id,
      batch_id,
      food_subtotal,
      delivery_fee,
      total_amount,
      payment_status,
      status,
      payment_screenshot_path,
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
        food_name_snapshot,
        quantity,
        unit_selling_price,
        line_total
      )
    `)
    .order('created_at', { ascending: false })

  if (ordersError) {
    return {
      data: null,
      error: ordersError,
    }
  }

  const studentIds = [
    ...new Set(
      (orders || [])
        .map((order) => order.student_id)
        .filter(Boolean)
    ),
  ]

  let profiles = []

  if (studentIds.length > 0) {
    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, university_id, phone')
      .in('id', studentIds)

    if (profilesError) {
      return {
        data: null,
        error: profilesError,
      }
    }

    profiles = data || []
  }

  const profileMap = Object.fromEntries(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  )

  const enrichedOrders = (orders || []).map((order) => ({
    ...order,
    student: profileMap[order.student_id] || null,
  }))

  return {
    data: enrichedOrders,
    error: null,
  }
}

export async function getPaymentProofUrl(filePath) {
  if (!filePath) {
    return {
      data: null,
      error: new Error('Payment proof not found'),
    }
  }

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 60 * 5)

  return {
    data: data?.signedUrl || null,
    error,
  }
}

export async function updateOrderPaymentStatus(
  orderId,
  paymentStatus
) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
    })
    .eq('id', orderId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function confirmOrderPayment(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_status: 'PAID',
      status: 'CONFIRMED',
    })
    .eq('id', orderId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function rejectOrderPayment(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_status: 'REJECTED',
      status: 'CANCELLED',
    })
    .eq('id', orderId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function updateOrderStatus(
  orderId,
  status
) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
    })
    .eq('id', orderId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function bulkUpdateOrderStatusByBatch(
  batchId,
  currentStatus,
  nextStatus
) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
    })
    .eq('batch_id', batchId)
    .eq('status', currentStatus)
    .select('id, status, batch_id')

  return {
    data,
    error,
  }
}

export async function deleteOrder(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .select()
    .single()

  return {
    data,
    error,
  }
}
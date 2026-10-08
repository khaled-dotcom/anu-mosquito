import './DriverDashboard.css'
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

function DriverDashboard({ profile, handleLogout }) {
  const [orders, setOrders] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  async function loadDriverData() {
    if (!profile?.id) return

    setLoading(true)

    const [
      { data: orderData, error: orderError },
      { data: batchData, error: batchError },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          created_at,
          batch_id,
          restaurant_id,
          restaurants (
            id,
            name
          ),
          delivery_batches (
            id,
            batch_number,
            delivery_time
          )
        `)
        .eq('assigned_driver_id', profile.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('driver_batch_assignments')
        .select(`
          id,
          batch_id,
          assigned_at,
          delivery_batches (
            id,
            batch_number,
            registration_start,
            registration_end,
            delivery_time,
            is_active
          )
        `)
        .eq('driver_id', profile.id)
        .order('assigned_at', { ascending: false }),
    ])

    if (orderError) {
      console.error('Driver orders error:', orderError)
    }

    if (batchError) {
      console.error('Driver batches error:', batchError)
    }

    setOrders(orderData || [])
    setBatches(batchData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadDriverData()
  }, [profile])

  async function updateOrderStatus(order, newStatus) {
    const confirmed = window.confirm(
      newStatus === 'OUT_FOR_DELIVERY'
        ? `Confirm pickup for order ${order.order_number}?`
        : `Confirm delivery for order ${order.order_number}?`
    )

    if (!confirmed) return

    setUpdatingOrderId(order.id)

    const { data, error } = await supabase.rpc(
      'driver_update_order_status',
      {
        p_order_id: order.id,
        p_new_status: newStatus,
      }
    )

    setUpdatingOrderId(null)

    if (error) {
      console.error('Driver status update error:', error)
      alert(error.message)
      return
    }

    if (!data?.success) {
      alert(data?.message || 'Unable to update order status.')
      return
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              status: newStatus,
            }
          : currentOrder
      )
    )
  }

  function getStatusLabel(status) {
    const labels = {
      PAYMENT_UNDER_CONFIRMATION:
        'Payment Under Confirmation',
      CONFIRMED: 'Confirmed',
      PREPARING: 'Preparing',
      OUT_FOR_DELIVERY: 'Out For Delivery',
      DELIVERED_BY_DRIVER: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }

    return labels[status] || status
  }

  function getStatusClass(status) {
    return `driver-status driver-status-${status
      .toLowerCase()
      .replaceAll('_', '-')}`
  }

  if (loading) {
    return (
      <div className="driver-page">
        <div className="driver-loading">
          Loading Driver Dashboard...
        </div>
      </div>
    )
  }

  const pickupOrders = orders.filter(
  (order) =>
    order.status === 'CONFIRMED' ||
    order.status === 'PREPARING'
)

  const deliveryOrders = orders.filter(
    (order) => order.status === 'OUT_FOR_DELIVERY'
  )

  const completedOrders = orders.filter(
    (order) =>
      order.status === 'DELIVERED_BY_DRIVER' ||
      order.status === 'COMPLETED'
  )

  return (
    <div className="driver-page">

      {/* Header */}
      <header className="driver-header">
        <div>
          <p className="driver-brand">
            ANU Mosquito
          </p>

          <h1>Driver Dashboard</h1>

          <p className="driver-welcome">
            Welcome, {profile?.full_name || 'Driver'}
          </p>
        </div>

        <button
          className="driver-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <main className="driver-container">

        {/* Summary */}
        <section className="driver-summary">

          <div className="driver-summary-card">
            <span>Assigned Orders</span>
            <strong>{orders.length}</strong>
          </div>

          <div className="driver-summary-card">
            <span>Pickup</span>
            <strong>{pickupOrders.length}</strong>
          </div>

          <div className="driver-summary-card">
            <span>Deliveries</span>
            <strong>{deliveryOrders.length}</strong>
          </div>

          <div className="driver-summary-card">
            <span>Completed</span>
            <strong>{completedOrders.length}</strong>
          </div>

        </section>

        {/* Assigned Batches */}
        <section className="driver-section">

          <div className="driver-section-header">
            <div>
              <h2>My Batches</h2>
              <p>
                Batches assigned to you
              </p>
            </div>
          </div>

          {batches.length === 0 ? (
            <div className="driver-empty">
              No batches assigned yet.
            </div>
          ) : (
            <div className="driver-batches">

              {batches.map((assignment) => {
                const batch =
                  assignment.delivery_batches

                return (
                  <div
                    key={assignment.id}
                    className="driver-batch-card"
                  >
                    <div>
                      <span>Batch</span>
                      <strong>
                        #{batch?.batch_number}
                      </strong>
                    </div>

                    <div>
                      <span>Delivery Time</span>
                      <strong>
                        {batch?.delivery_time
                          ? new Date(
                              batch.delivery_time
                            ).toLocaleString(
                              'en-US',
                              {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }
                            )
                          : '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {batch?.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </strong>
                    </div>
                  </div>
                )
              })}

            </div>
          )}
        </section>

        {/* Pickup */}
        <section className="driver-section">

          <div className="driver-section-header">
            <div>
              <h2>Restaurant Pickup</h2>
              <p>
                Orders you need to collect from restaurants
              </p>
            </div>

            <span className="driver-count">
              {pickupOrders.length}
            </span>
          </div>

          {pickupOrders.length === 0 ? (
            <div className="driver-empty">
              No orders waiting for pickup.
            </div>
          ) : (
            <div className="driver-orders">

              {pickupOrders.map((order) => (
                <div
                  key={order.id}
                  className="driver-order-card"
                >

                  <div className="driver-order-top">

                    <div>
                      <span>Order</span>
                      <strong>
                        {order.order_number}
                      </strong>
                    </div>

                    <span
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      {getStatusLabel(order.status)}
                    </span>

                  </div>

                  <div className="driver-order-info">

                    <div>
                      <span>Restaurant</span>
                      <strong>
                        {order.restaurants?.name ||
                          'Restaurant'}
                      </strong>
                    </div>

                    <div>
                      <span>Batch</span>
                      <strong>
                        #
                        {order.delivery_batches
                          ?.batch_number || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>
                        {order.total_amount} EGP
                      </strong>
                    </div>

                  </div>

                  <button
                    className="driver-primary-button"
                    disabled={
                      updatingOrderId === order.id
                    }
                    onClick={() =>
                      updateOrderStatus(
                        order,
                        'OUT_FOR_DELIVERY'
                      )
                    }
                  >
                    {updatingOrderId === order.id
                      ? 'Updating...'
                      : 'Confirm Pickup'}
                  </button>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* Deliveries */}
        <section className="driver-section">

          <div className="driver-section-header">
            <div>
              <h2>My Deliveries</h2>
              <p>
                Orders currently with you
              </p>
            </div>

            <span className="driver-count">
              {deliveryOrders.length}
            </span>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="driver-empty">
              No deliveries right now.
            </div>
          ) : (
            <div className="driver-orders">

              {deliveryOrders.map((order) => (
                <div
                  key={order.id}
                  className="driver-order-card"
                >

                  <div className="driver-order-top">

                    <div>
                      <span>Order</span>
                      <strong>
                        {order.order_number}
                      </strong>
                    </div>

                    <span
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      {getStatusLabel(order.status)}
                    </span>

                  </div>

                  <div className="driver-order-info">

                    <div>
                      <span>Restaurant</span>
                      <strong>
                        {order.restaurants?.name ||
                          'Restaurant'}
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>
                        {order.total_amount} EGP
                      </strong>
                    </div>

                  </div>

                  <button
                    className="driver-primary-button"
                    disabled={
                      updatingOrderId === order.id
                    }
                    onClick={() =>
                      updateOrderStatus(
                        order,
                        'DELIVERED_BY_DRIVER'
                      )
                    }
                  >
                    {updatingOrderId === order.id
                      ? 'Updating...'
                      : 'Confirm Delivery'}
                  </button>

                </div>
              ))}

            </div>
          )}
        </section>
 
       {/* Completed Orders */}
<section className="driver-section">

  <div className="driver-section-header">
    <div>
      <h2>Completed Orders</h2>
      <p>
        Orders you have completed
      </p>
    </div>

    <span className="driver-count">
      {completedOrders.length}
    </span>
  </div>

  {completedOrders.length === 0 ? (
    <div className="driver-empty">
      No completed orders yet.
    </div>
  ) : (
    <div className="driver-orders">

      {completedOrders.map((order) => (
        <div
          key={order.id}
          className="driver-order-card"
        >

          <div className="driver-order-top">

            <div>
              <span>Order</span>
              <strong>
                {order.order_number}
              </strong>
            </div>

            <span
              className={getStatusClass(
                order.status
              )}
            >
              {getStatusLabel(order.status)}
            </span>

          </div>

          <div className="driver-order-info">

            <div>
              <span>Restaurant</span>
              <strong>
                {order.restaurants?.name ||
                  'Restaurant'}
              </strong>
            </div>

            <div>
              <span>Batch</span>
              <strong>
                #
                {order.delivery_batches
                  ?.batch_number || '—'}
              </strong>
            </div>

            <div>
              <span>Total</span>
              <strong>
                {order.total_amount} EGP
              </strong>
            </div>

          </div>

        </div>
      ))}

    </div>
  )}

</section>
   
      </main>
    </div>
  )
}

export default DriverDashboard
import './DriverDashboard.css'
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import Icon from '../common/Icon'
import { orderStatusInfo } from '../../orderStatus'

const PICKUP_STATUSES = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP']

function itemsSummary(order) {
  const items = order.order_items || []
  if (items.length === 0) return ''
  return items.map((item) => `${item.quantity}× ${item.food_name_snapshot}`).join(', ')
}

function DriverDashboard({ profile, handleLogout }) {
  const [orders, setOrders] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  async function loadDriverData(silent = false) {
    if (!profile?.id) return

    if (!silent) setLoading(true)

    const { data: batchData, error: batchError } = await supabase
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
      .order('assigned_at', { ascending: false })

    // Orders in any batch assigned to this driver, plus orders handed to them directly.
    const batchIds = (batchData || []).map((assignment) => assignment.batch_id).filter(Boolean)
    const scope = batchIds.length > 0
      ? `assigned_driver_id.eq.${profile.id},batch_id.in.(${batchIds.join(',')})`
      : `assigned_driver_id.eq.${profile.id}`

    const { data: orderData, error: orderError } = await supabase
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
        student_name_snapshot,
        student_phone_snapshot,
        university_id_snapshot,
        restaurants (
          id,
          name
        ),
        delivery_batches (
          id,
          batch_number,
          delivery_time
        ),
        order_items (
          id,
          quantity,
          food_name_snapshot
        )
      `)
      .or(scope)
      .not('status', 'in', '(PAYMENT_UNDER_CONFIRMATION,CANCELLED)')
      .order('created_at', { ascending: false })

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

    // Keep the list fresh while the driver has the app open.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadDriverData(true)
    }, 30000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) {
    return (
      <div className="driver-page">
        <div className="driver-loading">
          <span className="driver-spinner" aria-hidden="true" />
          Loading your deliveries…
        </div>
      </div>
    )
  }

  const pickupOrders = orders.filter(
    (order) => PICKUP_STATUSES.includes(order.status)
  )

  const deliveryOrders = orders.filter(
    (order) => order.status === 'OUT_FOR_DELIVERY'
  )

  const completedOrders = orders.filter(
    (order) =>
      order.status === 'DELIVERED_BY_DRIVER' || order.status === 'COMPLETED'
  )

  const tabs = [
    { key: 'pickup', label: 'To pick up', icon: 'store', orders: pickupOrders },
    { key: 'delivering', label: 'On the way', icon: 'truck', orders: deliveryOrders },
    { key: 'done', label: 'Done', icon: 'check', orders: completedOrders },
  ]

  const currentTab =
    tabs.find((tab) => tab.key === activeTab) ||
    tabs.find((tab) => tab.orders.length > 0 && tab.key !== 'done') ||
    tabs[0]

  const emptyText = {
    pickup: 'No orders waiting for pickup.',
    delivering: 'Nothing on the way right now.',
    done: 'No completed orders yet.',
  }

  async function refresh() {
    setRefreshing(true)
    await loadDriverData(true)
    setRefreshing(false)
  }

  return (
    <div className="driver-page">

      {/* Header */}
      <header className="driver-appbar">
        <div className="driver-appbar-inner">
          <img
            src={`${import.meta.env.BASE_URL}logo-256.webp`}
            alt=""
            className="driver-logo"
            width="40"
            height="40"
          />

          <div className="driver-appbar-text">
            <p className="driver-brand">Driver</p>
            <h1>Hi, {profile?.full_name?.split(' ')[0] || 'Driver'}</h1>
          </div>

          <button
            type="button"
            className={`app-icon-button ${refreshing ? 'is-spinning' : ''}`}
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <Icon name="refresh" size={20} />
          </button>

          <button
            type="button"
            className="app-icon-button driver-logout-button"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>

      <main className="driver-container">

        {/* Status tabs */}
        <div className="driver-tabs" role="tablist" aria-label="Orders">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={currentTab.key === tab.key}
              className={`driver-tab driver-tab-${tab.key} ${
                currentTab.key === tab.key ? 'active' : ''
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="driver-tab-icon" aria-hidden="true">
                <Icon name={tab.icon} size={18} />
              </span>
              <strong>{tab.orders.length}</strong>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Orders for the selected tab */}
        <section className="driver-section" role="tabpanel">
          {currentTab.orders.length === 0 ? (
            <div className="driver-empty">
              <Icon name={currentTab.icon} size={26} />
              <p>{emptyText[currentTab.key]}</p>
            </div>
          ) : (
            <div className="driver-orders">
              {currentTab.orders.map((order) => {
                const status = orderStatusInfo(order.status)
                const busy = updatingOrderId === order.id
                const time = order.delivery_batches?.delivery_time
                  ? new Date(order.delivery_batches.delivery_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : null

                return (
                  <article key={order.id} className="driver-order-card">
                    <div className="driver-order-top">
                      <span className="driver-order-number">
                        #{order.order_number}
                      </span>
                      <span className={`status-badge tone-${status.tone}`}>
                        {status.label}
                      </span>
                    </div>

                    <h3 className="driver-order-restaurant">
                      <Icon name="store" size={18} />
                      {order.restaurants?.name || 'Restaurant'}
                    </h3>

                    <div className="driver-order-meta">
                      <span>
                        Batch #{order.delivery_batches?.batch_number || '—'}
                        {time && ` · ${time}`}
                      </span>
                      <strong>{order.total_amount} EGP</strong>
                    </div>

                    {itemsSummary(order) && (
                      <p className="driver-order-items">{itemsSummary(order)}</p>
                    )}

                    {(order.student_name_snapshot || order.student_phone_snapshot) && (
                      <div className="driver-order-student">
                        <span className="driver-student-avatar" aria-hidden="true">
                          {(order.student_name_snapshot || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="driver-student-text">
                          <strong>{order.student_name_snapshot || 'Student'}</strong>
                          {order.university_id_snapshot && <small>ID {order.university_id_snapshot}</small>}
                        </span>
                        {order.student_phone_snapshot && (
                          <a
                            className="driver-call"
                            href={`tel:${order.student_phone_snapshot}`}
                            aria-label={`Call ${order.student_name_snapshot || 'student'}`}
                          >
                            <Icon name="phone" size={18} />
                            Call
                          </a>
                        )}
                      </div>
                    )}

                    {currentTab.key === 'pickup' && (
                      <button
                        type="button"
                        className="btn-primary btn-block driver-primary-button"
                        disabled={busy}
                        onClick={() => updateOrderStatus(order, 'OUT_FOR_DELIVERY')}
                      >
                        <Icon name="package" size={18} />
                        {busy ? 'Updating…' : 'Confirm pickup'}
                      </button>
                    )}

                    {currentTab.key === 'delivering' && (
                      <button
                        type="button"
                        className="btn-primary btn-block driver-primary-button driver-deliver-button"
                        disabled={busy}
                        onClick={() => updateOrderStatus(order, 'DELIVERED_BY_DRIVER')}
                      >
                        <Icon name="check" size={18} strokeWidth={2.5} />
                        {busy ? 'Updating…' : 'Confirm delivery'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Assigned batches */}
        <section className="driver-section">
          <h2 className="app-section-title">
            My batches
            <small>{batches.length}</small>
          </h2>

          {batches.length === 0 ? (
            <div className="driver-empty">
              <Icon name="clock" size={26} />
              <p>No batches assigned yet.</p>
            </div>
          ) : (
            <div className="driver-batches">
              {batches.map((assignment) => {
                const batch = assignment.delivery_batches
                const date = batch?.delivery_time ? new Date(batch.delivery_time) : null

                return (
                  <div key={assignment.id} className="driver-batch-card">
                    <div className="driver-batch-top">
                      <strong>Batch #{batch?.batch_number}</strong>
                      <span
                        className={`status-badge ${
                          batch?.is_active ? 'tone-success' : ''
                        }`}
                      >
                        {batch?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="driver-batch-time">
                      <Icon name="clock" size={15} />
                      {date
                        ? date.toLocaleString('en-US', {
                            weekday: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default DriverDashboard

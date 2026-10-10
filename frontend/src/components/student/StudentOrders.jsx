import './StudentOrders.css'
import { useEffect, useState } from 'react'
import TopBar from '../common/TopBar'
import Icon from '../common/Icon'
import StudentTabBar from './StudentTabBar'
import {
  loadStudentOrders,
  confirmStudentOrderReceived,
  submitStudentOrderReview,
} from '../../services/studentOrderService'
import {
  ORDER_STEPS,
  orderStatusInfo,
  orderStepIndex,
  paymentStatusInfo,
} from '../../orderStatus'

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function groupItems(orderItems) {
  return Object.values(
    (orderItems || []).reduce((items, item) => {
      const key = item.food_name_snapshot

      if (!items[key]) {
        items[key] = { name: key, quantity: 0, total: 0 }
      }

      items[key].quantity += item.quantity
      items[key].total += Number(item.line_total || 0)

      return items
    }, {})
  )
}

function OrderTracker({ status }) {
  const current = orderStepIndex(status)
  if (current < 0) return null

  return (
    <ol className="order-tracker" aria-label="Order progress">
      {ORDER_STEPS.map((step, index) => (
        <li
          key={step.key}
          className={
            index < current ? 'done' : index === current ? 'current' : ''
          }
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="order-tracker-dot" aria-hidden="true">
            {index < current && <Icon name="check" size={12} strokeWidth={3.5} />}
          </span>
          <span className="order-tracker-label">{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

async function fetchOrders(profile) {
  if (!profile?.id) return []

  const { data, error } = await loadStudentOrders(profile.id)

  if (error) {
    console.error('Student orders error:', error)
    alert(error.message)
    return []
  }

  return data || []
}

function StudentOrders({ profile, setStudentPage, handleLogout }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmingOrderId, setConfirmingOrderId] = useState(null)
  const [reviewingOrderId, setReviewingOrderId] = useState(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  function openReview(order) {
    setReviewingOrderId(order.id)
    setReviewRating(order.student_rating || 0)
    setReviewFeedback(order.student_feedback || '')
  }

  function closeReview() {
    if (submittingReview) return
    setReviewingOrderId(null)
    setReviewRating(0)
    setReviewFeedback('')
  }

  async function submitReview(order) {
    if (!reviewRating) {
      alert('Please choose a rating from 1 to 5 stars.')
      return
    }

    setSubmittingReview(true)

    const { data, error } = await submitStudentOrderReview(
      order.id,
      reviewRating,
      reviewFeedback
    )

    setSubmittingReview(false)

    if (error) {
      console.error('Student review error:', error)
      alert(error.message)
      return
    }

    if (!data?.success) {
      alert(data?.message || 'Unable to submit your review.')
      return
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              student_rating: reviewRating,
              student_feedback: reviewFeedback.trim(),
              student_reviewed_at: new Date().toISOString(),
            }
          : currentOrder
      )
    )

    closeReview()
  }

  async function confirmReceived(order) {
    const confirmed = window.confirm(
      `Confirm that you received order #${order.order_number}?`
    )

    if (!confirmed) return

    setConfirmingOrderId(order.id)

    const { data, error } = await confirmStudentOrderReceived(order.id)

    setConfirmingOrderId(null)

    if (error) {
      console.error('Student order confirmation error:', error)
      alert(error.message)
      return
    }

    if (!data?.success) {
      alert(data?.message || 'Unable to confirm the order.')
      return
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              status: 'COMPLETED',
            }
          : currentOrder
      )
    )
  }

  useEffect(() => {
    let cancelled = false

    fetchOrders(profile).then((data) => {
      if (cancelled) return
      setOrders(data)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [profile])

  async function refresh() {
    setRefreshing(true)
    setOrders(await fetchOrders(profile))
    setRefreshing(false)
  }

  return (
    <div className="app-page student-orders-page">
      <TopBar
        title="My orders"
        onBack={() => setStudentPage('home')}
        backLabel="Back to home"
        right={
          <button
            type="button"
            className={`app-icon-button ${refreshing ? 'is-spinning' : ''}`}
            onClick={refresh}
            disabled={refreshing || loading}
            aria-label="Refresh orders"
          >
            <Icon name="refresh" size={20} />
          </button>
        }
      />

      <main className="app-page-content student-orders-content">
        {loading ? (
          <div className="student-orders-list">
            {[0, 1].map((i) => (
              <div key={i} className="app-card student-order-card">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton" style={{ height: 40, borderRadius: 12, marginTop: 12 }} />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>No orders yet</h3>
            <p>When you place an order it will show up here so you can track it.</p>
            <button
              type="button"
              className="btn-primary student-orders-browse"
              onClick={() => setStudentPage('home')}
            >
              Browse restaurants
            </button>
          </div>
        ) : (
          <div className="student-orders-list">
            {orders.map((order) => {
              const status = orderStatusInfo(order.status)
              const payment = paymentStatusInfo(order.payment_status)
              const items = groupItems(order.order_items)

              return (
                <article key={order.id} className="app-card student-order-card">
                  <header className="student-order-head">
                    <div className="student-order-title">
                      <h2>{order.restaurants?.name || 'Order'}</h2>
                      <p>
                        #{order.order_number}
                        {order.created_at && ` · ${formatDate(order.created_at)}`}
                      </p>
                    </div>

                    <span className={`status-badge tone-${status.tone}`}>
                      {status.label}
                    </span>
                  </header>

                  {order.status !== 'CANCELLED' && (
                    <>
                      <OrderTracker status={order.status} />

                      <div className="student-pickup-location" role="note">
                        <span className="student-pickup-location-icon" aria-hidden="true">
                          📍
                        </span>
                        <div>
                          <span className="student-pickup-location-label">Pickup Location</span>
                          <strong>الاستلام من أمام بوابة الجراج</strong>
                        </div>
                      </div>
                    </>
                  )}

                  <ul className="student-order-items">
                    {items.map((item) => (
                      <li key={item.name}>
                        <span>
                          <b>{item.quantity}×</b> {item.name}
                        </span>
                        <span>{item.total} EGP</span>
                      </li>
                    ))}
                    <li className="muted">
                      <span>Delivery</span>
                      <span>{order.delivery_fee} EGP</span>
                    </li>
                  </ul>

                  <footer className="student-order-foot">
                    <span className={`status-badge tone-${payment.tone}`}>
                      {payment.label}
                    </span>
                    <strong>{order.total_amount} EGP</strong>
                  </footer>

                  {order.status === 'DELIVERED_BY_DRIVER' && (
                    <button
                      type="button"
                      className="btn-primary btn-block student-confirm-order-button"
                      disabled={confirmingOrderId === order.id}
                      onClick={() => confirmReceived(order)}
                    >
                      {confirmingOrderId === order.id
                        ? 'Confirming…'
                        : '✓ Confirm order received'}
                    </button>
                  )}

                  {order.status === 'COMPLETED' && !order.student_reviewed_at && (
                    <button
                      type="button"
                      className="btn-primary btn-block student-review-order-button"
                      onClick={() => openReview(order)}
                    >
                      ★ Rate your order
                    </button>
                  )}

                  {order.status === 'COMPLETED' && order.student_reviewed_at && (
                    <div className="student-order-review-summary">
                      <span>★★★★★</span>
                      <strong>{order.student_rating}/5</strong>
                      {order.student_feedback && <p>{order.student_feedback}</p>}
                    </div>
                  )}

                  {reviewingOrderId === order.id && (
                    <div className="student-review-panel">
                      <div className="student-review-title">Rate your order</div>
                      <div className="student-review-stars" role="radiogroup" aria-label="Order rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={star <= reviewRating ? 'selected' : ''}
                            onClick={() => setReviewRating(star)}
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewFeedback}
                        onChange={(event) => setReviewFeedback(event.target.value)}
                        placeholder="Any problem or note? Tell us what happened..."
                        rows={3}
                        maxLength={500}
                      />
                      <div className="student-review-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={closeReview}
                          disabled={submittingReview}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => submitReview(order)}
                          disabled={submittingReview || !reviewRating}
                        >
                          {submittingReview ? 'Submitting…' : 'Submit review'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>

      <StudentTabBar
        active="orders"
        profile={profile}
        setStudentPage={setStudentPage}
        handleLogout={handleLogout}
      />
    </div>
  )
}

export default StudentOrders

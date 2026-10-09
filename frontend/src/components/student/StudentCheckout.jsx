import './StudentCheckout.css'
import { useEffect, useState } from 'react'
import StudentPayment from './StudentPayment'
import TopBar from '../common/TopBar'
import Icon from '../common/Icon'
import { loadDeliverySettings, loadDeliveryFeeTiers } from '../../services/settingsService'
import { cartSubtotal, deliveryFeeFor, formatEGP, lineLabel, nextTier } from '../../lib/pricing'
import { loadAvailableBatches } from '../../services/orderService'

function validDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTime(value) {
  const date = validDate(value)
  return date
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—'
}

function formatDay(value) {
  const date = validDate(value)
  if (!date) return ''

  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function StudentCheckout({
  cart,
  setShowCheckout,
  setStudentPage,
  profile,
  selectedRestaurant,
  goToStudentHome,
}) {
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [loadedAt] = useState(() => Date.now())
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [baseFee, setBaseFee] = useState(0)
  const [feeTiers, setFeeTiers] = useState([])
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(true)

  useEffect(() => {
    async function loadBatches() {
      const { data, error } = await loadAvailableBatches()

      if (error) {
        console.error('Batches error:', error)
        alert(error.message)
        setBatches([])
      } else {
        // Only batches still taking orders, soonest delivery first.
        const now = Date.now()
        setBatches(
          (data || [])
            .filter((batch) => !batch.registration_end || new Date(batch.registration_end).getTime() > now)
            .sort((a, b) => new Date(a.delivery_time) - new Date(b.delivery_time))
        )
      }

      setBatchesLoading(false)
    }

    loadBatches()
  }, [])

  useEffect(() => {
    async function loadFee() {
      const [{ data: settings, error }, { data: tiers }] = await Promise.all([
        loadDeliverySettings(),
        loadDeliveryFeeTiers(),
      ])

      if (error) console.error('Delivery fee error:', error)
      setBaseFee(Number(settings?.delivery_fee ?? 0))
      setFeeTiers(tiers || [])
      setDeliveryFeeLoading(false)
    }

    loadFee()
  }, [])

  // Payment screen covers checkout; start it at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [showPayment])

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0)

  const foodSubtotal = cartSubtotal(cart)
  const deliveryFee = deliveryFeeFor(foodSubtotal, feeTiers, baseFee)
  const upcomingTier = nextTier(foodSubtotal, feeTiers)
  const totalAmount = foodSubtotal + deliveryFee

  if (showPayment) {
    return (
      <StudentPayment
        cart={cart}
        selectedBatch={selectedBatch}
        deliveryFee={deliveryFee}
        setShowPayment={setShowPayment}
        setShowCheckout={setShowCheckout}
        profile={profile}
        selectedRestaurant={selectedRestaurant}
        setStudentPage={setStudentPage}
        goToStudentHome={goToStudentHome}
      />
    )
  }

  return (
    <div className="app-page checkout-page">
      <TopBar
        title="Checkout"
        subtitle={selectedRestaurant?.name}
        onBack={() => setShowCheckout(false)}
        backLabel="Back to menu"
      />

      <main className="app-page-content has-bottom-bar">

        {/* Items */}
        <h2 className="app-section-title">
          Your order
          <small>
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </small>
        </h2>

        <ul className="app-card checkout-lines">
          {cart.map((item, index) => (
            <li key={item.key || `${item.id}-${index}`} className="checkout-line">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="checkout-line-thumb" />
              ) : (
                <span className="checkout-line-thumb" aria-hidden="true">🍽️</span>
              )}

              <div className="checkout-line-info">
                <h3>{lineLabel(item)}</h3>
                <span>
                  {item.quantity} × {formatEGP(item.selling_price)}
                </span>
              </div>

              <strong>{formatEGP(item.selling_price * item.quantity)}</strong>
            </li>
          ))}
        </ul>

        {/* Delivery batch */}
        <h2 className="app-section-title">Delivery time</h2>

        {batchesLoading ? (
          <div className="batch-options">
            {[0, 1].map((i) => (
              <div key={i} className="batch-option skeleton" style={{ height: 76 }} />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="app-card checkout-empty">
            <Icon name="clock" size={22} />
            <p>No delivery batches are open right now. Please check back soon.</p>
          </div>
        ) : (
          <div className="batch-options" role="radiogroup" aria-label="Delivery batch">
            {batches.map((batch) => {
              const selected = selectedBatch?.id === batch.id
              const orderBy = validDate(batch.registration_end)
              const opensAt = validDate(batch.registration_start)
              const notOpenYet = opensAt && opensAt.getTime() > loadedAt

              return (
                <button
                  key={batch.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`batch-option ${selected ? 'selected' : ''} ${notOpenYet ? 'is-later' : ''}`}
                  disabled={notOpenYet}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <span className="batch-option-time">
                    <strong>{formatTime(batch.delivery_time)}</strong>
                    <small>{formatDay(batch.delivery_time)}</small>
                  </span>

                  <span className="batch-option-info">
                    <strong>Batch {batch.batch_number}</strong>
                    {notOpenYet ? (
                      <small>Ordering opens at {formatTime(batch.registration_start)}</small>
                    ) : orderBy && (
                      <small>Order by {formatTime(batch.registration_end)}</small>
                    )}
                  </span>

                  <span className="batch-option-check" aria-hidden="true">
                    {selected && <Icon name="check" size={16} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Summary */}
        <h2 className="app-section-title">Summary</h2>

        <div className="app-card checkout-summary">
          <div className="checkout-summary-row">
            <span>Food subtotal</span>
            <strong>{formatEGP(foodSubtotal)}</strong>
          </div>

          <div className="checkout-summary-row">
            <span>Delivery fee</span>
            <strong>{deliveryFeeLoading ? '…' : formatEGP(deliveryFee)}</strong>
          </div>

          {!deliveryFeeLoading && upcomingTier && (
            <p className="checkout-fee-hint">
              Orders from {formatEGP(upcomingTier.min_order_total)} pay {formatEGP(upcomingTier.fee)} delivery.
            </p>
          )}

          <div className="checkout-summary-row total">
            <span>Total</span>
            <strong>{formatEGP(totalAmount)}</strong>
          </div>
        </div>
      </main>

      <div className="app-bottom-bar">
        <div className="app-bottom-bar-inner">
          <div className="app-bottom-bar-total">
            <span>Total</span>
            <strong>{formatEGP(totalAmount)}</strong>
          </div>

          <button
            type="button"
            className="btn-primary btn-grow checkout-continue"
            disabled={!selectedBatch}
            onClick={() => setShowPayment(true)}
          >
            {selectedBatch ? 'Continue to payment' : 'Choose a delivery time'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentCheckout

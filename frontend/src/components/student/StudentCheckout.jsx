import './StudentCheckout.css'
import { useEffect, useState } from 'react'
import StudentPayment from './StudentPayment'
import { loadDeliverySettings } from '../../services/settingsService'
import {
  loadAvailableBatches,
  createOrder,
} from '../../services/orderService'
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
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(true)

  useEffect(() => {
    async function loadBatches() {
      const { data, error } = await loadAvailableBatches()

      if (error) {
  console.error('Batches error:', error)
  alert(error.message)
        setBatches([])
      } else {
        setBatches(data || [])
      }

      setBatchesLoading(false)
    }

    loadBatches()
  }, [])  

const foodSubtotal = cart.reduce(
  (total, item) =>
    total + item.selling_price * item.quantity,
  0
)

const totalAmount = foodSubtotal + deliveryFee

  useEffect(() => {
  async function loadFee() {
    const { data, error } = await loadDeliverySettings()

    if (error) {
      console.error('Delivery fee error:', error)
      setDeliveryFee(0)
    } else {
      setDeliveryFee(Number(data?.delivery_fee ?? 0))
    }

    setDeliveryFeeLoading(false)
  }

  loadFee()
}, [])

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
    <div className="checkout-page">

      <div className="checkout-container">

        <button
          className="checkout-back-button"
          onClick={() => setShowCheckout(false)}
        >
          ←
        </button>

        <div className="checkout-header">
          <h1>Checkout</h1>
          <p>Review your order before confirming</p>
        </div>

        <div className="checkout-items">

          {cart.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="checkout-item"
            >

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="checkout-item-image"
                />
              )}

              <div className="checkout-item-info">

                <h3>{item.name}</h3>

                <p>
                  Quantity: {item.quantity}
                </p>

                <span>
                  {item.selling_price} EGP each
                </span>

              </div>

              <strong>
                {item.selling_price * item.quantity} EGP
              </strong>

            </div>
          ))}

        </div>

        <div className="checkout-summary">

          <h2>Order Summary</h2>

          <div className="checkout-summary-row">
            <span>Food Subtotal</span>
            <strong>{foodSubtotal} EGP</strong>
          </div>

          <div className="checkout-summary-row">
  <span>Delivery Fee</span>
  <strong>
    {deliveryFeeLoading ? '...' : `${deliveryFee} EGP`}
  </strong>
</div>

<div className="checkout-total">
  <span>Total</span>
  <strong>
    {totalAmount} EGP
  </strong>
</div>

        </div>

        <div className="delivery-batches-section">

  <h2>Choose Delivery Batch</h2>

  {batchesLoading ? (
    <p className="batches-message">
      Loading available batches...
    </p>
  ) : batches.length === 0 ? (
    <p className="batches-message">
      No delivery batches available right now.
    </p>
  ) : (
    <div className="delivery-batches-list">

      {batches.map((batch) => (
        <button
  key={batch.id}
  className={`delivery-batch-card ${
    selectedBatch?.id === batch.id ? 'selected' : ''
  }`}
  onClick={() => setSelectedBatch(batch)}
>
         <div className="delivery-batch-info">
  <div className="delivery-batch-main">
    <strong>
      Batch {batch.batch_number}
    </strong>

    <span className="delivery-batch-time">
      🕐{' '}
      {new Date(batch.delivery_time).toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      )}
    </span>
  </div>

  <p>
    {new Date(batch.delivery_time).toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    )}
  </p>
</div>

<span className="delivery-batch-arrow">
  →
</span>
        </button>
      ))}

    </div>
  )}
{selectedBatch && (
  <div className="selected-batch-summary">
    <span>Selected Delivery Batch</span>

    <div className="selected-batch-main">
      <strong>
        Batch {selectedBatch.batch_number}
      </strong>

      <span className="selected-batch-time">
        🕐{' '}
        {new Date(selectedBatch.delivery_time).toLocaleTimeString(
          'en-US',
          {
            hour: 'numeric',
            minute: '2-digit',
          }
        )}
      </span>
    </div>

    <p>
      {new Date(selectedBatch.delivery_time).toLocaleDateString(
        'en-US',
        {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }
      )}
    </p>
  </div>
)}
<button
  className="confirm-order-button"
  disabled={!selectedBatch}
  onClick={() => setShowPayment(true)}
>
  Continue to Payment →
</button>

</div>

      </div>

    </div>
  )
}

export default StudentCheckout
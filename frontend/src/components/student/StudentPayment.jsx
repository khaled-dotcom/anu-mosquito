import './StudentPayment.css'
import { useEffect, useState } from 'react'
import {
  loadActivePaymentMethods,
  uploadPaymentProof,
} from '../../services/paymentService'
import { createOrder } from '../../services/orderService'

function StudentPayment({
  cart,
  selectedBatch,
  deliveryFee,
  setShowPayment,
  setShowCheckout,
  profile,
  selectedRestaurant,
  setStudentPage,
  goToStudentHome,
}) {
      const [paymentScreenshot, setPaymentScreenshot] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState(null)
    const [paymentMethods, setPaymentMethods] = useState([])
const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)

useEffect(() => {
  async function loadMethods() {
    const { data, error } = await loadActivePaymentMethods()

    if (error) {
      console.error('Payment methods error:', error)
      alert(error.message)
      setPaymentMethods([])
    } else {
      setPaymentMethods(data || [])
    }

    setPaymentMethodsLoading(false)
  }

  loadMethods()
}, [])
 const foodSubtotal = cart.reduce(
  (total, item) =>
    total + item.selling_price * item.quantity,
  0
)

const totalAmount = foodSubtotal + deliveryFee

const handleSubmitPayment = async () => {
  if (!selectedPaymentMethod) {
    alert('Please select a payment method.')
    return
  }

  if (!paymentScreenshot) {
    alert('Please upload your payment screenshot.')
    return
  }

  if (!selectedBatch) {
    alert('Please select a delivery batch.')
    return
  }

  if (!profile?.id) {
    alert('Student profile not found.')
    return
  }

  if (!selectedRestaurant?.id) {
    alert('Restaurant not found.')
    return
  }

  setSubmitting(true)

  const {
    data: uploadData,
    error: uploadError,
    filePath,
  } = await uploadPaymentProof(
    paymentScreenshot,
    profile.id
  )

  if (uploadError) {
    console.error('Payment proof upload error:', uploadError)
    alert(uploadError.message)
    setSubmitting(false)
    return
  }

  console.log('Payment proof uploaded:', uploadData)

  const { data, error } = await createOrder({
    student_id: profile.id,
    restaurant_id: selectedRestaurant.id,
    batch_id: selectedBatch.id,
    items: cart,
    food_subtotal: foodSubtotal,
    delivery_fee: deliveryFee,
    total_amount: totalAmount,
    payment_method_id: selectedPaymentMethod.id,
    payment_screenshot_path: filePath,
  })

  if (error) {
    console.error('Create order error:', error)
    alert(error.message)
    setSubmitting(false)
    return
  }

 console.log('Order created:', data)

setSubmitting(false)

if (data?.order) {
  setOrderResult(data.order)
}
}

if (orderResult) {
  return (
    <div className="payment-page">
      <div className="payment-container">

        <div className="payment-header">
          <h1>Order Submitted Successfully 🎉</h1>
          <p>Your order has been received and is waiting for payment confirmation.</p>
        </div>

        <div className="payment-summary">

          <div className="payment-summary-row">
            <span>Order Number</span>
            <strong>{orderResult.order_number}</strong>
          </div>

          <div className="payment-summary-row">
            <span>Food Subtotal</span>
            <strong>{foodSubtotal} EGP</strong>
          </div>

          <div className="payment-summary-row">
            <span>Delivery Fee</span>
            <strong>{deliveryFee} EGP</strong>
          </div>

          <div className="payment-total">
            <span>Total</span>
            <strong>{totalAmount} EGP</strong>
          </div>

        </div>

        <div className="payment-batch">
          <span>Payment Status</span>

          <div className="payment-batch-main">
            <strong>Under Confirmation</strong>
          </div>

          <p>
            Your payment proof has been submitted successfully.
          </p>
        </div>
      <button
  className="payment-back-home-button"
  onClick={() => {
    setShowCheckout(false)
    goToStudentHome()
  }}
>
  ← Back to Home
</button>

      </div>
    </div>
  )
}

  return (
    <div className="payment-page">
      <div className="payment-container">

        <button
          className="payment-back-button"
          onClick={() => setShowPayment(false)}
        >
          ←
        </button>

        <div className="payment-header">
          <h1>Payment</h1>
          <p>Complete your payment to place your order</p>
        </div>

        <div className="payment-summary">
          <h2>Order Summary</h2>

          <div className="payment-summary-row">
            <span>Food Subtotal</span>
            <strong>{foodSubtotal} EGP</strong>
          </div>

          <div className="payment-summary-row">
  <span>Delivery Fee</span>
  <strong>{deliveryFee} EGP</strong>
</div>

<div className="payment-total">
  <span>Total</span>
  <strong>{totalAmount} EGP</strong>
</div>
        </div>

        {selectedBatch && (
          <div className="payment-batch">
            <span>Delivery Batch</span>

            <div className="payment-batch-main">
              <strong>
                Batch {selectedBatch.batch_number}
              </strong>

              <span>
                🕐{' '}
                {new Date(
                  selectedBatch.delivery_time
                ).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <p>
              {new Date(
                selectedBatch.delivery_time
              ).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        <div className="payment-method-section">
          <h2>Payment Method</h2>

          <div className="payment-method-list">

  {paymentMethodsLoading ? (
    <p className="payment-message">
      Loading payment methods...
    </p>
  ) : paymentMethods.length === 0 ? (
    <p className="payment-message">
      No payment methods are available right now.
    </p>
  ) : (
    paymentMethods.map((method) => (
      <button
        key={method.id}
        type="button"
        className={`payment-method-card ${
          selectedPaymentMethod?.id === method.id
            ? 'selected'
            : ''
        }`}
        onClick={() => setSelectedPaymentMethod(method)}
      >
        <div>
          <strong>{method.name}</strong>
          <span>{method.type}</span>
        </div>

        <span className="payment-method-arrow">
          →
        </span>
      </button>
    ))
  )}

</div>
        </div>
         
                {selectedPaymentMethod && (
          <div className="selected-payment-method">
            <div className="selected-payment-method-header">
              <span>Payment Details</span>
              <strong>{selectedPaymentMethod.name}</strong>
            </div>

            <div className="payment-account">
              <span>Account Number</span>
              <strong>{selectedPaymentMethod.account_number}</strong>
            </div>

            {selectedPaymentMethod.instructions && (
              <div className="payment-instructions">
                <span>Instructions</span>
                <p>{selectedPaymentMethod.instructions}</p>
              </div>
            )}
          </div>
        )}

        <div className="payment-upload-section">
          <h2>Payment Proof</h2>

          <p>
            Upload your payment screenshot after completing the payment.
          </p>

          <label className="payment-upload-box">
            <span>📷</span>
            <strong>Upload Payment Screenshot</strong>
            <small>PNG, JPG or JPEG</small>

            <input
  type="file"
  accept="image/png,image/jpeg"
  onChange={(e) => {
    setPaymentScreenshot(e.target.files[0] || null)
  }}
/>
{paymentScreenshot && (
  <small className="payment-file-name">
    Selected: {paymentScreenshot.name}
  </small>
)}
          </label>
        </div>

        <button
  className="submit-payment-button"
  onClick={handleSubmitPayment}
  disabled={submitting}
>
  {submitting ? 'Uploading...' : 'Submit Payment →'}
</button>

      </div>
    </div>
  )
}

export default StudentPayment
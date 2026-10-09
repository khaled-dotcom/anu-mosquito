import './StudentPayment.css'
import { useEffect, useMemo, useState } from 'react'
import TopBar from '../common/TopBar'
import Icon from '../common/Icon'
import {
  loadActivePaymentMethods,
  uploadPaymentProof,
} from '../../services/paymentService'
import { createOrder } from '../../services/orderService'
import { cartSubtotal, formatEGP } from '../../lib/pricing'

function formatBatch(batch) {
  const date = batch?.delivery_time ? new Date(batch.delivery_time) : null
  if (!date || Number.isNaN(date.getTime())) return `Batch ${batch?.batch_number ?? ''}`

  return `Batch ${batch.batch_number} · ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

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
  const [copied, setCopied] = useState(false)

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

  // Thumbnail of the chosen screenshot.
  const previewUrl = useMemo(
    () => (paymentScreenshot ? URL.createObjectURL(paymentScreenshot) : null),
    [paymentScreenshot]
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [orderResult])

  const foodSubtotal = cartSubtotal(cart)
  const totalAmount = foodSubtotal + deliveryFee

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(
        String(selectedPaymentMethod?.account_number || '')
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the number is still visible to copy by hand.
    }
  }

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

    const { error: uploadError, filePath } = await uploadPaymentProof(
      paymentScreenshot,
      profile.id
    )

    if (uploadError) {
      console.error('Payment proof upload error:', uploadError)
      alert(uploadError.message)
      setSubmitting(false)
      return
    }

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

    setSubmitting(false)

    if (data?.order) {
      setOrderResult(data.order)
    }
  }

  // =========================
  // SUCCESS
  // =========================

  if (orderResult) {
    return (
      <div className="app-page payment-page">
        <main className="app-page-content payment-success">
          <div className="payment-success-icon" aria-hidden="true">
            <Icon name="check" size={36} strokeWidth={3} />
          </div>

          <h1>Order placed!</h1>
          <p>
            We&apos;ve received your order. We&apos;ll confirm your payment
            shortly.
          </p>

          <div className="app-card payment-success-card">
            <div className="payment-row">
              <span>Order number</span>
              <strong>{orderResult.order_number}</strong>
            </div>
            <div className="payment-row">
              <span>Restaurant</span>
              <strong>{selectedRestaurant?.name}</strong>
            </div>
            {selectedBatch && (
              <div className="payment-row">
                <span>Delivery</span>
                <strong>{formatBatch(selectedBatch)}</strong>
              </div>
            )}
            <div className="payment-row">
              <span>Payment</span>
              <span className="status-badge tone-warning">Under review</span>
            </div>
            <div className="payment-row total">
              <span>Total</span>
              <strong>{formatEGP(orderResult.total_amount ?? totalAmount)}</strong>
            </div>
          </div>

          {orderResult.total_amount != null && Number(orderResult.total_amount) !== Number(totalAmount) && (
            <p className="payment-total-changed" role="status">
              The final total is {formatEGP(orderResult.total_amount)} because menu prices changed while you were ordering.
              We&apos;ll check your payment against this amount.
            </p>
          )}

          <div className="payment-success-actions">
            <button
              type="button"
              className="btn-primary btn-block"
              onClick={() => {
                setShowCheckout(false)
                setStudentPage('orders')
              }}
            >
              <Icon name="package" size={18} />
              Track my order
            </button>

            <button
              type="button"
              className="btn-secondary btn-block payment-back-home-button"
              onClick={() => {
                setShowCheckout(false)
                goToStudentHome()
              }}
            >
              Back to home
            </button>
          </div>
        </main>
      </div>
    )
  }

  // =========================
  // PAYMENT FORM
  // =========================

  const ready = selectedPaymentMethod && paymentScreenshot && !submitting

  return (
    <div className="app-page payment-page">
      <TopBar
        title="Payment"
        subtitle={`Total ${formatEGP(totalAmount)}`}
        onBack={() => setShowPayment(false)}
        backLabel="Back to checkout"
      />

      <main className="app-page-content has-bottom-bar">

        {/* Summary */}
        <div className="app-card payment-summary-card">
          <div className="payment-row">
            <span>Food subtotal</span>
            <strong>{formatEGP(foodSubtotal)}</strong>
          </div>
          <div className="payment-row">
            <span>Delivery fee</span>
            <strong>{formatEGP(deliveryFee)}</strong>
          </div>
          {selectedBatch && (
            <div className="payment-row">
              <span>Delivery</span>
              <strong>{formatBatch(selectedBatch)}</strong>
            </div>
          )}
          <div className="payment-row total">
            <span>Total to pay</span>
            <strong>{formatEGP(totalAmount)}</strong>
          </div>
        </div>

        {/* Step 1 — method */}
        <h2 className="app-section-title">
          <span>
            <span className="payment-step">1</span>
            Choose how to pay
          </span>
        </h2>

        {paymentMethodsLoading ? (
          <div className="pay-methods">
            {[0, 1].map((i) => (
              <div key={i} className="pay-method skeleton" style={{ height: 64 }} />
            ))}
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="app-card payment-message">
            No payment methods are available right now.
          </div>
        ) : (
          <div className="pay-methods" role="radiogroup" aria-label="Payment method">
            {paymentMethods.map((method) => {
              const selected = selectedPaymentMethod?.id === method.id

              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`pay-method ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPaymentMethod(method)
                    setCopied(false)
                  }}
                >
                  <span className="pay-method-icon" aria-hidden="true">💳</span>
                  <span className="pay-method-text">
                    <strong>{method.name}</strong>
                    {method.type && <small>{method.type}</small>}
                  </span>
                  <span className="batch-option-check" aria-hidden="true">
                    {selected && <Icon name="check" size={16} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {selectedPaymentMethod && (
          <div className="app-card pay-details">
            <span className="pay-details-label">
              Send {formatEGP(totalAmount)} to
            </span>

            <div className="pay-account">
              <strong>{selectedPaymentMethod.account_number}</strong>
              <button
                type="button"
                className="pay-copy"
                onClick={copyAccountNumber}
              >
                <Icon name={copied ? 'check' : 'copy'} size={16} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {selectedPaymentMethod.instructions && (
              <p className="pay-instructions">
                {selectedPaymentMethod.instructions}
              </p>
            )}
          </div>
        )}

        {/* Step 2 — proof */}
        <h2 className="app-section-title">
          <span>
            <span className="payment-step">2</span>
            Upload your receipt
          </span>
        </h2>

        <label className={`pay-upload ${paymentScreenshot ? 'has-file' : ''}`}>
          {previewUrl ? (
            <img src={previewUrl} alt="" className="pay-upload-preview" />
          ) : (
            <span className="pay-upload-icon" aria-hidden="true">
              <Icon name="upload" size={22} />
            </span>
          )}

          <span className="pay-upload-text">
            <strong>
              {paymentScreenshot ? 'Screenshot added' : 'Add payment screenshot'}
            </strong>
            <small>
              {paymentScreenshot
                ? paymentScreenshot.name
                : 'PNG or JPG of your transfer confirmation'}
            </small>
          </span>

          <span className="pay-upload-action">
            {paymentScreenshot ? 'Change' : 'Choose'}
          </span>

          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              setPaymentScreenshot(e.target.files[0] || null)
            }}
          />
        </label>
      </main>

      <div className="app-bottom-bar">
        <div className="app-bottom-bar-inner">
          <div className="app-bottom-bar-total">
            <span>Total</span>
            <strong>{formatEGP(totalAmount)}</strong>
          </div>

          <button
            type="button"
            className="btn-primary btn-grow submit-payment-button"
            onClick={handleSubmitPayment}
            disabled={!ready}
          >
            {submitting
              ? 'Sending…'
              : !selectedPaymentMethod
                ? 'Choose a payment method'
                : !paymentScreenshot
                  ? 'Add your screenshot'
                  : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentPayment

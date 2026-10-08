// Human-readable labels and colour tones for order / payment statuses.

const ORDER_STATUS = {
  PAYMENT_UNDER_CONFIRMATION: { label: 'Checking payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PREPARING: { label: 'Preparing', tone: 'info' },
  OUT_FOR_DELIVERY: { label: 'On the way', tone: 'primary' },
  DELIVERED_BY_DRIVER: { label: 'Delivered', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
}

const PAYMENT_STATUS = {
  UNDER_CONFIRMATION: { label: 'Payment under review', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  REJECTED: { label: 'Payment rejected', tone: 'danger' },
}

function fallback(status) {
  const text = String(status || 'Unknown')
    .toLowerCase()
    .replaceAll('_', ' ')
  return { label: text.charAt(0).toUpperCase() + text.slice(1), tone: 'neutral' }
}

export function orderStatusInfo(status) {
  return ORDER_STATUS[status] || fallback(status)
}

export function paymentStatusInfo(status) {
  return PAYMENT_STATUS[status] || fallback(status)
}

// Steps shown in the student's order tracker.
export const ORDER_STEPS = [
  { key: 'PAYMENT_UNDER_CONFIRMATION', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way' },
  { key: 'DELIVERED_BY_DRIVER', label: 'Delivered' },
]

export function orderStepIndex(status) {
  if (status === 'COMPLETED') return ORDER_STEPS.length - 1
  return ORDER_STEPS.findIndex((step) => step.key === status)
}

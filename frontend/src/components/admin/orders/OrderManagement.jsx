import './OrderManagement.css'
import { useEffect, useState } from 'react'
import {
  loadAdminOrders,
  getPaymentProofUrl,
  updateOrderPaymentStatus,
  confirmOrderPayment,
  rejectOrderPayment,
  updateOrderStatus,
  deleteOrder,
  bulkUpdateOrderStatusByBatch,
} from '../../../services/adminOrderService'

function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [batchUpdatingId, setBatchUpdatingId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [contactStudent, setContactStudent] = useState(null)

  const [selectedBatch, setSelectedBatch] = useState('ALL')
  const [orderSearch, setOrderSearch] = useState('')

  const [paymentProofUrl, setPaymentProofUrl] = useState(null)
  const [paymentProofLoading, setPaymentProofLoading] = useState(false)
  const [paymentUpdating, setPaymentUpdating] = useState(false)

  const [editingOrder, setEditingOrder] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [editPaymentStatus, setEditPaymentStatus] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [deletingOrderId, setDeletingOrderId] = useState(null)

  const filteredOrders = orders.filter((order) => {
    const matchesBatch =
      selectedBatch === 'ALL' ||
      order.batch_id === selectedBatch

    const matchesSearch =
      order.order_number
        ?.toLowerCase()
        .includes(orderSearch.toLowerCase())

    return matchesBatch && matchesSearch
  })

  const batchOptions = [
    ...new Map(
      orders
        .filter((order) => order.delivery_batches)
        .map((order) => [
          order.batch_id,
          order.delivery_batches,
        ])
    ).entries(),
  ]

  useEffect(() => {
    async function loadOrders() {
      const { data, error } = await loadAdminOrders()

      if (error) {
        console.error('Admin orders error:', error)
        alert(error.message)
        setOrders([])
      } else {
        setOrders(data || [])
      }

      setLoading(false)
    }

    loadOrders()
  }, [])

  function openEditModal(order) {
  setEditingOrder(order)
  setEditStatus(order.status)
  setEditPaymentStatus(order.payment_status)
}

function closeEditModal() {
  if (editLoading) return

  setEditingOrder(null)
  setEditStatus('')
  setEditPaymentStatus('')
}


function getAllowedNextStatuses(status) {
  switch (status) {
    case 'PAYMENT_UNDER_CONFIRMATION':
      return [
        'PAYMENT_UNDER_CONFIRMATION',
        'CONFIRMED',
        'CANCELLED',
      ]

    case 'CONFIRMED':
      return [
        'CONFIRMED',
        'PREPARING',
        'CANCELLED',
      ]

    case 'PREPARING':
      return [
        'PREPARING',
        'OUT_FOR_DELIVERY',
        'CANCELLED',
      ]

    case 'OUT_FOR_DELIVERY':
      return [
        'OUT_FOR_DELIVERY',
        'DELIVERED_BY_DRIVER',
        'CANCELLED',
      ]

    case 'DELIVERED_BY_DRIVER':
      return [
        'DELIVERED_BY_DRIVER',
        'COMPLETED',
      ]

    case 'COMPLETED':
      return ['COMPLETED']

    case 'CANCELLED':
      return ['CANCELLED']

    default:
      return [status]
  }
}

function getStatusLabel(status) {
  const labels = {
    PAYMENT_UNDER_CONFIRMATION:
      'Payment Under Confirmation',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED_BY_DRIVER: 'Delivered by Driver',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }

  return labels[status] || status
}

async function handleSaveEdit() {
  if (!editingOrder) return

  setEditLoading(true)

  const statusChanged =
    editStatus !== editingOrder.status

  const paymentChanged =
    editPaymentStatus !== editingOrder.payment_status

  if (statusChanged) {
    const { error } = await updateOrderStatus(
      editingOrder.id,
      editStatus
    )

    if (error) {
      setEditLoading(false)
      alert(error.message)
      return
    }
  }

  if (paymentChanged) {
    const { error } =
      await updateOrderPaymentStatus(
        editingOrder.id,
        editPaymentStatus
      )

    if (error) {
      setEditLoading(false)
      alert(error.message)
      return
    }
  }

  setOrders((currentOrders) =>
    currentOrders.map((order) =>
      order.id === editingOrder.id
        ? {
            ...order,
            status: editStatus,
            payment_status: editPaymentStatus,
          }
        : order
    )
  )

  setEditLoading(false)
  closeEditModal()
}

 async function handlePaymentUpdate(
  orderId,
  paymentStatus
) {
  const message =
    paymentStatus === 'PAID'
      ? 'Confirm this payment?'
      : 'Reject this payment?'

  const confirmed = window.confirm(message)

  if (!confirmed) return

  setPaymentUpdating(true)

  const result =
    paymentStatus === 'PAID'
      ? await confirmOrderPayment(orderId)
      : await rejectOrderPayment(orderId)

  const { error } = result

  setPaymentUpdating(false)

  if (error) {
    alert(error.message)
    return
  }

  setOrders((currentOrders) =>
    currentOrders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            payment_status: paymentStatus,
            status:
              paymentStatus === 'PAID'
                ? 'CONFIRMED'
                : 'CANCELLED',
          }
        : order
    )
  )
}

  async function handleDeleteOrder(order) {
    const confirmed = window.confirm(
      `Delete order ${order.order_number}? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeletingOrderId(order.id)

    const { error } =
      await deleteOrder(order.id)

    setDeletingOrderId(null)

    if (error) {
      alert(error.message)
      return
    }

    setOrders((currentOrders) =>
      currentOrders.filter(
        (currentOrder) =>
          currentOrder.id !== order.id
      )
    )
  }

  async function handleBatchStatusUpdate(
  batchId,
  currentStatus,
  nextStatus,
  actionLabel
) {
  const batchOrders = orders.filter(
    (order) =>
      order.batch_id === batchId &&
      order.status === currentStatus
  )

  if (batchOrders.length === 0) {
    return
  }

  const confirmed = window.confirm(
    `${actionLabel}\n\n` +
      `This will update ${batchOrders.length} order(s) in this batch.\n\n` +
      `Do you want to continue?`
  )

  if (!confirmed) {
    return
  }

  setBatchUpdatingId(`${batchId}-${nextStatus}`)

  const { error } = await bulkUpdateOrderStatusByBatch(
    batchId,
    currentStatus,
    nextStatus
  )

  if (error) {
    console.error(error)
    alert(error.message || 'Failed to update batch orders.')
    setBatchUpdatingId(null)
    return
  }

  setOrders((currentOrders) =>
    currentOrders.map((order) => {
      if (
        order.batch_id === batchId &&
        order.status === currentStatus
      ) {
        return {
          ...order,
          status: nextStatus,
        }
      }

      return order
    })
  )

  setBatchUpdatingId(null)
}

  function getBatchAction(batchId) {
    const batchOrders = orders.filter(
      (order) => order.batch_id === batchId
    )

    const hasPendingPayment = batchOrders.some(
      (order) => order.status === 'PAYMENT_UNDER_CONFIRMATION'
    )

    const confirmedCount = batchOrders.filter(
      (order) => order.status === 'CONFIRMED'
    ).length

    const preparingCount = batchOrders.filter(
      (order) => order.status === 'PREPARING'
    ).length

    const outForDeliveryCount = batchOrders.filter(
      (order) => order.status === 'OUT_FOR_DELIVERY'
    ).length

    if (hasPendingPayment) {
      return {
        disabled: true,
        label: 'Waiting for Payment Confirmation',
        count: batchOrders.filter(
          (order) => order.status === 'PAYMENT_UNDER_CONFIRMATION'
        ).length,
      }
    }

    if (confirmedCount > 0) {
      return {
        disabled: false,
        currentStatus: 'CONFIRMED',
        nextStatus: 'PREPARING',
        label: 'Start Preparing',
        count: confirmedCount,
      }
    }

    if (preparingCount > 0) {
      return {
        disabled: false,
        currentStatus: 'PREPARING',
        nextStatus: 'OUT_FOR_DELIVERY',
        label: 'Send Out for Delivery',
        count: preparingCount,
      }
    }

    if (outForDeliveryCount > 0) {
      return {
        disabled: false,
        currentStatus: 'OUT_FOR_DELIVERY',
        nextStatus: 'DELIVERED_BY_DRIVER',
        label: 'Mark Delivered',
        count: outForDeliveryCount,
      }
    }

    return {
      disabled: true,
      label: 'No Action Needed',
      count: 0,
    }
  }

  if (loading) {
    return (
      <div className="admin-orders-page">
        <p>Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="admin-orders-page">

      <div className="admin-orders-header">

        <div>
          <h2>Orders</h2>
          <p>Manage and monitor student orders</p>
        </div>

        <div className="admin-orders-count">
          {filteredOrders.length} Orders
        </div>

      </div>

      <div className="admin-orders-search">
        <input
          type="text"
          placeholder="Search by order number..."
          value={orderSearch}
          onChange={(e) =>
            setOrderSearch(e.target.value)
          }
        />
      </div>

      <div className="admin-orders-filters">

        <button
          className={`admin-order-filter ${
            selectedBatch === 'ALL'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setSelectedBatch('ALL')
          }
        >
          All Orders
        </button>

        {batchOptions.map(
          ([batchId, batch]) => (
            <button
              key={batchId}
              className={`admin-order-filter ${
                selectedBatch === batchId
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setSelectedBatch(batchId)
              }
            >
              Batch {batch.batch_number}
            </button>
          )
        )}

      </div>

      {batchOptions.length > 0 && (
        <div className="admin-orders-filters">
          <strong style={{ width: '100%', display: 'block', marginBottom: '4px' }}>
            Batch Status Control
          </strong>

          {batchOptions.map(([batchId, batch]) => {
            const action = getBatchAction(batchId)
            const updating =
              action &&
              batchUpdatingId === `${batchId}-${action.nextStatus}`

            return (
              <div
                key={`action-${batchId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  Batch {batch.batch_number}
                </span>

                <button
                  type="button"
                  className="admin-order-filter"
                  disabled={action.disabled || updating}
                  onClick={() =>
                    !action.disabled &&
                    handleBatchStatusUpdate(
                      batchId,
                      action.currentStatus,
                      action.nextStatus,
                      `Batch ${batch.batch_number}: ${action.label}`
                    )
                  }
                >
                  {updating
                    ? 'Updating...'
                    : `${action.label}${
                        action.count > 0
                          ? ` (${action.count})`
                          : ''
                      }`}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="admin-orders-empty">
          <h3>No orders yet</h3>
          <p>
            Student orders will appear here.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-orders-empty">
          <h3>No matching orders</h3>
          <p>
            No orders match the selected batch
            or search.
          </p>
        </div>
      ) : (
        <div className="admin-orders-list">

          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="admin-order-card"
            >

              <div className="admin-order-top">

                <div>
                  <span>Order Number</span>
                  <strong>
                    {order.order_number}
                  </strong>
                </div>

                <div className="admin-order-status">
                  {order.status}
                </div>

              </div>

              <div className="admin-order-info">

                <div>
                  <span>Student</span>
                  <strong>
                    {order.student?.full_name ||
                      'Unknown Student'}
                  </strong>
                </div>

                <div>
                  <span>University ID</span>
                  <strong>
                    {order.student?.university_id ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>Restaurant</span>
                  <strong>
                    {order.restaurants?.name ||
                      'Unknown Restaurant'}
                  </strong>
                </div>

                <div>
                  <span>Batch</span>
                  <strong>
                    Batch{' '}
                    {order.delivery_batches
                      ?.batch_number || '—'}
                  </strong>
                </div>

              </div>

              <div className="admin-order-items">

                {order.order_items?.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="admin-order-item"
                    >

                      <div>
                        <strong>
                          {item.food_name_snapshot}
                        </strong>

                        <span>
                          × {item.quantity}
                        </span>
                      </div>

                      <strong>
                        {item.line_total} EGP
                      </strong>

                    </div>
                  )
                )}

              </div>

              <div className="admin-order-summary">

                <div>
                  <span>Delivery</span>
                  <strong>
                    {order.delivery_fee} EGP
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>
                    {order.total_amount} EGP
                  </strong>
                </div>

              </div>

              <div className="admin-order-payment">

                <div>
                  <span>Payment</span>
                  <strong>
                    {order.payment_status}
                  </strong>
                </div>

                <div className="admin-payment-actions">

                  {order.payment_screenshot_path && (
                    <button
                      className="admin-payment-proof-button"
                      disabled={
                        paymentProofLoading
                      }
                      onClick={async () => {
                        setPaymentProofLoading(
                          true
                        )

                        const {
                          data,
                          error,
                        } =
                          await getPaymentProofUrl(
                            order.payment_screenshot_path
                          )

                        setPaymentProofLoading(
                          false
                        )

                        if (error) {
                          alert(error.message)
                          return
                        }

                        setPaymentProofUrl(data)
                      }}
                    >
                      {paymentProofLoading
                        ? 'Loading...'
                        : 'View Payment Proof'}
                    </button>
                  )}

                  {order.payment_status ===
                    'UNDER_CONFIRMATION' && (
                    <>
                      <button
                        className="admin-payment-confirm-button"
                        disabled={
                          paymentUpdating
                        }
                        onClick={() =>
                          handlePaymentUpdate(
                            order.id,
                            'PAID'
                          )
                        }
                      >
                        Confirm Payment
                      </button>

                      <button
                        className="admin-payment-reject-button"
                        disabled={
                          paymentUpdating
                        }
                        onClick={() =>
                          handlePaymentUpdate(
                            order.id,
                            'REJECTED'
                          )
                        }
                      >
                        Reject Payment
                      </button>
                    </>
                  )}

                </div>

              </div>

              <div className="admin-order-actions">

                <button
                  className="admin-order-edit-button"
                  onClick={() =>
                    openEditModal(order)
                  }
                >
                  ✏️ Edit
                </button>

                {order.student?.phone && (
  <button
    className="admin-order-contact-button"
    onClick={() =>
      setContactStudent(order.student)
    }
  >
    📞 Contact Student
  </button>
)}

                <button
                  className="admin-order-delete-button"
                  disabled={
                    deletingOrderId === order.id
                  }
                  onClick={() =>
                    handleDeleteOrder(order)
                  }
                >
                  {deletingOrderId === order.id
                    ? 'Deleting...'
                    : '🗑️ Delete Order'}
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

      {paymentProofUrl && (
        <div
          className="admin-payment-proof-overlay"
          onClick={() =>
            setPaymentProofUrl(null)
          }
        >

          <div
            className="admin-payment-proof-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="admin-payment-proof-header">

              <h3>Payment Proof</h3>

              <button
                className="admin-payment-proof-close"
                onClick={() =>
                  setPaymentProofUrl(null)
                }
              >
                ×
              </button>

            </div>

            <div className="admin-payment-proof-image-container">

              <img
                src={paymentProofUrl}
                alt="Payment proof"
              />

            </div>

          </div>

        </div>
      )}

      {editingOrder && (
        <div
          className="admin-edit-order-overlay"
          onClick={closeEditModal}
        >

          <div
            className="admin-edit-order-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="admin-edit-order-header">

              <div>
                <h3>Edit Order</h3>
                <p>
                  {editingOrder.order_number}
                </p>
              </div>

              <button
                className="admin-payment-proof-close"
                onClick={closeEditModal}
              >
                ×
              </button>

            </div>

            <div className="admin-edit-order-body">

              <label>
                Order Status
              </label>

              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value)
                }
              >
                {getAllowedNextStatuses(editingOrder.status).map(
                  (status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  )
                )}
              </select>

              <label>
                Payment Status
              </label>

              <select
                value={editPaymentStatus}
                onChange={(e) =>
                  setEditPaymentStatus(e.target.value)
                }
              >
                {editPaymentStatus === 'UNDER_CONFIRMATION' && (
                  <option value="UNDER_CONFIRMATION">
                    Under Confirmation
                  </option>
                )}

                {editPaymentStatus === 'UNDER_CONFIRMATION' && (
                  <option value="PAID">
                    Paid
                  </option>
                )}

                {editPaymentStatus === 'UNDER_CONFIRMATION' && (
                  <option value="REJECTED">
                    Rejected
                  </option>
                )}

                {editPaymentStatus === 'PAID' && (
                  <option value="PAID">
                    Paid
                  </option>
                )}

                {editPaymentStatus === 'REJECTED' && (
                  <option value="REJECTED">
                    Rejected
                  </option>
                )}
              </select>

            </div>

            <div className="admin-edit-order-footer">

              <button
                className="admin-edit-cancel-button"
                disabled={editLoading}
                onClick={closeEditModal}
              >
                Cancel
              </button>

              <button
                className="admin-edit-save-button"
                disabled={editLoading}
                onClick={handleSaveEdit}
              >
                {editLoading
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </div>

        </div>
        
      )}
{contactStudent && (
  <div
    className="admin-contact-student-overlay"
    onClick={() => setContactStudent(null)}
  >
    <div
      className="admin-contact-student-modal"
      onClick={(e) => e.stopPropagation()}
    >

      <div className="admin-contact-student-header">
        <div>
          <h3>Contact Student</h3>
          <p>
            {contactStudent.full_name ||
              'Student'}
          </p>
        </div>

        <button
          className="admin-payment-proof-close"
          onClick={() =>
            setContactStudent(null)
          }
        >
          ×
        </button>
      </div>

      <div className="admin-contact-student-body">

        <div className="admin-contact-student-info">
          <span>University ID</span>
          <strong>
            {contactStudent.university_id || '—'}
          </strong>
        </div>

        <div className="admin-contact-student-info">
          <span>Phone</span>
          <strong>
            {contactStudent.phone}
          </strong>
        </div>

        <div className="admin-contact-student-actions">

          <a
            className="admin-contact-call-button"
            href={`tel:${contactStudent.phone}`}
          >
            📞 Call Student
          </a>

          <a
            className="admin-contact-whatsapp-button"
            href={`https://wa.me/2${contactStudent.phone.replace(/^0/, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            💬 WhatsApp
          </a>

        </div>

      </div>

    </div>
  </div>
)}
    </div>
  )
}

export default OrderManagement
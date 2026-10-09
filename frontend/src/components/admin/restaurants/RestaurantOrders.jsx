import { useEffect, useMemo, useState } from 'react'
import { loadRestaurantOrders } from '../../../services/restaurantOrderService'
import './RestaurantOrders.css'

function RestaurantOrders({ restaurants, batches }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const activeRestaurants = restaurants.filter(
    (restaurant) => restaurant.is_active
  )

  const activeBatches = batches.filter(
    (batch) => batch.is_active
  )

  useEffect(() => {
    async function loadOrders() {
      if (!selectedRestaurant || !selectedBatch) {
        setOrders([])
        return
      }

      setLoading(true)

      const { data, error } = await loadRestaurantOrders(
        selectedRestaurant,
        selectedBatch
      )

      if (error) {
        console.error('Restaurant orders error:', error)
        alert(error.message)
        setOrders([])
      } else {
        setOrders(data || [])
      }

      setLoading(false)
    }

    loadOrders()
  }, [selectedRestaurant, selectedBatch])

  const preparationOrders = useMemo(
    () => orders.filter((order) => order.status !== 'CANCELLED'),
    [orders]
  )

  const selectedRestaurantData = activeRestaurants.find(
    (restaurant) => restaurant.id === selectedRestaurant
  )

  const selectedBatchData = activeBatches.find(
    (batch) => batch.id === selectedBatch
  )

  const formatDate = (date) => {
    if (!date) return ''

    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusLabel = (status) => {
    const labels = {
      PAYMENT_UNDER_CONFIRMATION: 'Payment Pending',
      CONFIRMED: 'Confirmed',
      PREPARING: 'Preparing',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED_BY_DRIVER: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    }

    return labels[status] || status
  }

  if (!restaurants.length || !batches.length) {
    return (
      <div className="restaurant-orders-page">
        <div className="restaurant-orders-empty">
          <div className="restaurant-orders-empty-icon">🍽️</div>
          <h3>No Data Available</h3>
          <p>
            Restaurants or delivery batches are not available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="restaurant-orders-page">
      <div className="restaurant-orders-page-header">
        <div>
          <h2>Restaurant Orders</h2>
          <p>Prepare restaurant orders by delivery batch.</p>
        </div>

        {selectedRestaurantData && selectedBatchData && (
          <div className="restaurant-orders-header-badge">
            <span>🍽️</span>
            {selectedRestaurantData.name}
          </div>
        )}
      </div>

      <div className="restaurant-orders-filter-card">
        <div className="restaurant-orders-field">
          <label>Restaurant</label>

          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            <option value="">Select Restaurant</option>

            {activeRestaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="restaurant-orders-field">
          <label>Delivery Batch</label>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">Select Batch</option>

            {activeBatches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                Batch {batch.batch_number}
                {batch.delivery_date
                  ? ` — ${formatDate(batch.delivery_date)}`
                  : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedRestaurant || !selectedBatch ? (
        <div className="restaurant-orders-empty">
          <div className="restaurant-orders-empty-icon">📦</div>
          <h3>Select Restaurant &amp; Batch</h3>
          <p>
            Select a restaurant and delivery batch to view
            preparation orders.
          </p>
        </div>
      ) : loading ? (
        <div className="restaurant-orders-empty">
          <div className="restaurant-orders-loading">
            Loading orders...
          </div>
        </div>
      ) : (
        <>
          <div className="restaurant-orders-summary">
            <div className="restaurant-orders-summary-info">
              <div className="restaurant-orders-summary-icon">
                🍽️
              </div>

              <div>
                <h3>{selectedRestaurantData?.name}</h3>
                <p>
                  Batch {selectedBatchData?.batch_number}
                  {selectedBatchData?.delivery_date
                    ? ` • ${formatDate(
                        selectedBatchData.delivery_date
                      )}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="restaurant-orders-count">
              <strong>{preparationOrders.length}</strong>
              <span>Orders</span>
            </div>

            <button
              type="button"
              className="restaurant-orders-pdf-button"
              onClick={() => window.print()}
              disabled={preparationOrders.length === 0}
            >
              🖨 Generate PDF
            </button>
          </div>

          <div className="restaurant-orders-print-header">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="ANU Mosquito"
              className="restaurant-orders-print-logo"
            />

            <h1>ANU MOSQUITO</h1>
            <p>Restaurant Orders</p>

            <div className="restaurant-orders-print-info">
              <div>
                <strong>Restaurant:</strong>{' '}
                {selectedRestaurantData?.name}
              </div>

              <div>
                <strong>Batch:</strong>{' '}
                {selectedBatchData?.batch_number}
              </div>

              <div>
                <strong>Date:</strong>{' '}
                {selectedBatchData?.delivery_date
                  ? formatDate(selectedBatchData.delivery_date)
                  : formatDate(new Date())}
              </div>

              <div>
                <strong>Orders:</strong>{' '}
                {preparationOrders.length}
              </div>
            </div>
          </div>

          {preparationOrders.length === 0 ? (
            <div className="restaurant-orders-empty">
              <div className="restaurant-orders-empty-icon">✅</div>
              <h3>No Preparation Orders</h3>
              <p>
                There are no active orders for this restaurant
                and batch.
              </p>
            </div>
          ) : (
            <div className="restaurant-orders-list">
              {preparationOrders.map((order) => (
                <div
                  key={order.id}
                  className="restaurant-order-card"
                >
                  <div className="restaurant-order-card-header">
                    <div className="restaurant-order-number">
                      {order.order_number}
                    </div>

                    <div
                      className={`restaurant-order-status status-${order.status?.toLowerCase()}`}
                    >
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="restaurant-order-items">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="restaurant-order-item"
                      >
                        <div className="restaurant-order-item-name">
                          <span className="restaurant-order-quantity">
                            {item.quantity}
                          </span>

                          <span>{item.food_name_snapshot}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.order_items?.some(
                    (item) => item.notes
                  ) && (
                    <div className="restaurant-order-notes">
                      <div className="restaurant-order-notes-title">
                        📝 Notes
                      </div>

                      {order.order_items
                        .filter((item) => item.notes)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="restaurant-order-note"
                          >
                            <strong>
                              {item.food_name_snapshot}:
                            </strong>{' '}
                            {item.notes}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RestaurantOrders

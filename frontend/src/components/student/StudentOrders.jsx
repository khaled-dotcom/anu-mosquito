import './StudentOrders.css'
import { useEffect, useState } from 'react'
import { loadStudentOrders } from '../../services/studentOrderService'

function StudentOrders({ profile, setStudentPage }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      if (!profile?.id) {
        setOrders([])
        setLoading(false)
        return
      }

      const { data, error } = await loadStudentOrders(profile.id)

      if (error) {
        console.error('Student orders error:', error)
        alert(error.message)
        setOrders([])
      } else {
        setOrders(data || [])
      }

      setLoading(false)
    }

    loadOrders()
  }, [profile])

  if (loading) {
    return (
      <div className="student-orders-page">
        <div className="student-orders-container">
          <p>Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="student-orders-page">
      <div className="student-orders-container">

        <div className="student-orders-header">
          <button
            className="student-orders-back"
            onClick={() => setStudentPage('home')}
          >
            ← Back to Home
          </button>

          <h1>My Orders</h1>
          <p>Track your orders and payment status</p>
        </div>

        {orders.length === 0 ? (
          <div className="student-orders-empty">
            <h2>No orders yet</h2>
            <p>Your orders will appear here after you place an order.</p>
          </div>
        ) : (
          <div className="student-orders-list">

            {orders.map((order) => (
              <div
                key={order.id}
                className="student-order-card"
              >

                <div className="student-order-top">

                  <div>
                    <span>Order Number</span>
                    <strong>{order.order_number}</strong>
                  </div>

                  <div className="student-order-status">
                    {order.status}
                  </div>

                </div>

                <div className="student-order-items">

                  {Object.values(
                    (order.order_items || []).reduce((items, item) => {
                      const key = item.food_name_snapshot

                      if (!items[key]) {
                        items[key] = {
                          name: item.food_name_snapshot,
                          quantity: 0,
                          total: 0,
                        }
                      }

                      items[key].quantity += item.quantity
                      items[key].total += item.line_total

                      return items
                    }, {})
                  ).map((item) => (
                    <div
                      key={item.name}
                      className="student-order-item"
                    >
                      <div className="student-order-item-info">
                        <strong>{item.name}</strong>
                        <span>× {item.quantity}</span>
                      </div>

                      <strong>
                        {item.total} EGP
                      </strong>
                    </div>
                  ))}

                </div>

                <div className="student-order-summary">

                  <div>
                    <span>Delivery</span>
                    <strong>{order.delivery_fee} EGP</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>{order.total_amount} EGP</strong>
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  )
}

export default StudentOrders
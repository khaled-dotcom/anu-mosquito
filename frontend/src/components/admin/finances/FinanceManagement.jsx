import { useEffect, useMemo, useState } from 'react'
import './FinanceManagement.css'
import { loadFinanceOrders } from '../../../services/financeService'

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} EGP`
}

function formatDate(date) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getProfit(order) {
  const foodRevenue = Number(order.food_subtotal || 0)
  const foodCost = Number(order.food_cost_total || 0)

  const deliveryFee = Number(order.delivery_fee || 0)
  const driverCost = Number(order.driver_cost || 0)

  const foodProfit = foodRevenue - foodCost
  const deliveryProfit = deliveryFee - driverCost

  return foodProfit + deliveryProfit
}

function FinanceManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [restaurantFilter, setRestaurantFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadFinanceData()
  }, [])

  async function loadFinanceData() {
    setLoading(true)
    setError('')

    const { data, error } = await loadFinanceOrders()

    if (error) {
      console.error('Finance load error:', error)
      setError(error.message || 'Failed to load finance data')
      setOrders([])
      setLoading(false)
      return
    }

    setOrders(data || [])
    setLoading(false)
  }

  const restaurants = useMemo(() => {
    const map = new Map()

    orders.forEach((order) => {
      if (order.restaurant_id) {
        map.set(
          order.restaurant_id,
          order.restaurants?.name || 'Unknown Restaurant'
        )
      }
    })

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }))
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.created_at
        ? new Date(order.created_at)
        : null

      const matchesSearch =
        !search ||
        order.order_number
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        order.restaurants?.name
          ?.toLowerCase()
          .includes(search.toLowerCase())

      const matchesRestaurant =
        restaurantFilter === 'ALL' ||
        order.restaurant_id === restaurantFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        order.status === statusFilter

      const matchesFrom =
        !dateFrom ||
        (orderDate &&
          orderDate >= new Date(`${dateFrom}T00:00:00`))

      const matchesTo =
        !dateTo ||
        (orderDate &&
          orderDate <= new Date(`${dateTo}T23:59:59`))

      return (
        matchesSearch &&
        matchesRestaurant &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      )
    })
  }, [
    orders,
    search,
    restaurantFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ])

  const stats = useMemo(() => {
    let foodSales = 0
    let deliveryRevenue = 0
    let foodCost = 0
    let driverCost = 0
    let totalRevenue = 0
    let totalProfit = 0

    filteredOrders.forEach((order) => {
      foodSales += Number(order.food_subtotal || 0)
      deliveryRevenue += Number(order.delivery_fee || 0)
      foodCost += Number(order.food_cost_total || 0)
      driverCost += Number(order.driver_cost || 0)
      totalRevenue += Number(order.total_amount || 0)
      totalProfit += getProfit(order)
    })

    return {
      orders: filteredOrders.length,
      foodSales,
      deliveryRevenue,
      foodCost,
      driverCost,
      totalRevenue,
      totalProfit,
    }
  }, [filteredOrders])

  const restaurantSummary = useMemo(() => {
    const map = new Map()

    filteredOrders.forEach((order) => {
      const restaurantId = order.restaurant_id
      const restaurantName =
        order.restaurants?.name || 'Unknown Restaurant'

      if (!map.has(restaurantId)) {
        map.set(restaurantId, {
          id: restaurantId,
          name: restaurantName,
          orders: 0,
          foodSales: 0,
          foodCost: 0,
          profit: 0,
        })
      }

      const item = map.get(restaurantId)

      item.orders += 1
      item.foodSales += Number(order.food_subtotal || 0)
      item.foodCost += Number(order.food_cost_total || 0)
      item.profit += getProfit(order)
    })

    return Array.from(map.values())
  }, [filteredOrders])

  function clearFilters() {
    setSearch('')
    setRestaurantFilter('ALL')
    setStatusFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  if (loading) {
    return (
      <div className="finance-page">
        <div className="finance-loading">
          Loading finance data...
        </div>
      </div>
    )
  }

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div>
          <h2>Finance</h2>
          <p>
            Track sales, costs, delivery revenue and profit.
          </p>
        </div>

        <button
          className="finance-refresh-button"
          onClick={loadFinanceData}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="finance-error">
          {error}
        </div>
      )}

      <div className="finance-filters">
        <div className="finance-filter-group finance-search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Order number or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="finance-filter-group">
          <label>Restaurant</label>
          <select
            value={restaurantFilter}
            onChange={(e) =>
              setRestaurantFilter(e.target.value)
            }
          >
            <option value="ALL">All Restaurants</option>

            {restaurants.map((restaurant) => (
              <option
                key={restaurant.id}
                value={restaurant.id}
              >
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="finance-filter-group">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="OUT_FOR_DELIVERY">
              Out for Delivery
            </option>
            <option value="DELIVERED_BY_DRIVER">
              Delivered
            </option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="finance-filter-group">
          <label>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="finance-filter-group">
          <label>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button
          className="finance-clear-button"
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      <div className="finance-stats-grid">
        <div className="finance-stat-card">
          <span className="finance-stat-icon">📦</span>
          <div>
            <span className="finance-stat-label">
              Orders
            </span>
            <strong>{stats.orders}</strong>
          </div>
        </div>

        <div className="finance-stat-card">
          <span className="finance-stat-icon">🍔</span>
          <div>
            <span className="finance-stat-label">
              Food Sales
            </span>
            <strong>
              {formatMoney(stats.foodSales)}
            </strong>
          </div>
        </div>

        <div className="finance-stat-card">
          <span className="finance-stat-icon">🚚</span>
          <div>
            <span className="finance-stat-label">
              Delivery Revenue
            </span>
            <strong>
              {formatMoney(stats.deliveryRevenue)}
            </strong>
          </div>
        </div>

        <div className="finance-stat-card">
          <span className="finance-stat-icon">💰</span>
          <div>
            <span className="finance-stat-label">
              Total Revenue
            </span>
            <strong>
              {formatMoney(stats.totalRevenue)}
            </strong>
          </div>
        </div>

        <div className="finance-stat-card">
          <span className="finance-stat-icon">📉</span>
          <div>
            <span className="finance-stat-label">
              Food Cost
            </span>
            <strong>
              {formatMoney(stats.foodCost)}
            </strong>
          </div>
        </div>

        <div className="finance-stat-card">
          <span className="finance-stat-icon">🛵</span>
          <div>
            <span className="finance-stat-label">
              Driver Cost
            </span>
            <strong>
              {formatMoney(stats.driverCost)}
            </strong>
          </div>
        </div>

        <div className="finance-stat-card finance-profit-card">
          <span className="finance-stat-icon">📈</span>
          <div>
            <span className="finance-stat-label">
              Profit
            </span>
            <strong>
              {formatMoney(stats.totalProfit)}
            </strong>
          </div>
        </div>
      </div>

      <div className="finance-section">
        <div className="finance-section-header">
          <div>
            <h3>Restaurant Summary</h3>
            <p>
              Financial summary for each restaurant.
            </p>
          </div>
        </div>

        {restaurantSummary.length === 0 ? (
          <div className="finance-empty">
            No restaurant data found.
          </div>
        ) : (
          <div className="finance-table-wrapper">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Orders</th>
                  <th>Food Sales</th>
                  <th>Food Cost</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {restaurantSummary.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td>
                      <strong>{restaurant.name}</strong>
                    </td>

                    <td>
                      {restaurant.orders}
                    </td>

                    <td>
                      {formatMoney(
                        restaurant.foodSales
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        restaurant.foodCost
                      )}
                    </td>

                    <td className="finance-profit-value">
                      {formatMoney(
                        restaurant.profit
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="finance-section">
        <div className="finance-section-header">
          <div>
            <h3>Orders Financial Details</h3>
            <p>
              Detailed financial information for the
              selected orders.
            </p>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="finance-empty">
            No orders found.
          </div>
        ) : (
          <div className="finance-table-wrapper">
            <table className="finance-table finance-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Restaurant</th>
                  <th>Date</th>
                  <th>Food Sales</th>
                  <th>Delivery</th>
                  <th>Total</th>
                  <th>Food Cost</th>
                  <th>Driver Cost</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>
                        {order.order_number || '-'}
                      </strong>
                    </td>

                    <td>
                      {order.restaurants?.name || '-'}
                    </td>

                    <td>
                      {formatDate(order.created_at)}
                    </td>

                    <td>
                      {formatMoney(
                        order.food_subtotal
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        order.delivery_fee
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        order.total_amount
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        order.food_cost_total
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        order.driver_cost
                      )}
                    </td>

                    <td className="finance-profit-value">
                      {formatMoney(getProfit(order))}
                    </td>

                    <td>
                      <span
                        className={`finance-status finance-status-${String(
                          order.status || ''
                        ).toLowerCase()}`}
                      >
                        {String(
                          order.status || '-'
                        ).replaceAll('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default FinanceManagement
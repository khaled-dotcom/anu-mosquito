import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import './TokTokManagement.css'

const money = (value) => new Intl.NumberFormat('en-EG', {
  style: 'currency', currency: 'EGP', maximumFractionDigits: 2,
}).format(Number(value || 0))

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'stores', label: 'Stores', icon: '🏪' },
  { id: 'products', label: 'Products', icon: '🛍️' },
  { id: 'batches', label: 'Delivery batches', icon: '🛺' },
  { id: 'orders', label: 'Orders', icon: '📦' },
]

export default function TokTokManagement() {
  const [tab, setTab] = useState('overview')
  const [stores, setStores] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [storeResult, productResult, batchResult, orderResult] = await Promise.all([
        supabase.from('toktok_stores').select('id,name,description,is_active,is_open,sort_order').order('sort_order'),
        supabase.from('toktok_products').select('id,store_id,name,selling_price,is_available,stock_quantity').order('name'),
        supabase.from('toktok_batches').select('id,store_id,registration_start,registration_end,delivery_time,capacity,is_active').order('delivery_time', { ascending: false }).limit(100),
        supabase.from('toktok_orders').select('id,order_number,order_date,store_name_snapshot,delivery_address,items_subtotal,delivery_fee,total_amount,payment_status,status,created_at').order('created_at', { ascending: false }).limit(100),
      ])
      const failed = [storeResult, productResult, batchResult, orderResult].find((result) => result.error)
      if (failed) throw failed.error
      setStores(storeResult.data || [])
      setProducts(productResult.data || [])
      setBatches(batchResult.data || [])
      setOrders(orderResult.data || [])
    } catch (err) {
      console.error('TokTok admin load failed:', err)
      setError('Could not load TokTok management data. Check the TokTok admin database permissions and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function toggleRecord(table, id, field, currentValue, label) {
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      const { error: updateError } = await supabase.from(table).update({ [field]: !currentValue }).eq('id', id)
      if (updateError) throw updateError
      setNotice(`${label} updated.`)
      await refresh()
    } catch (err) {
      console.error('TokTok admin update failed:', err)
      setError(`Could not update ${label.toLowerCase()}. Verify the admin policy for ${table}.`)
    } finally {
      setBusyId('')
    }
  }

  const activeOrders = orders.filter((order) => !['delivered', 'cancelled', 'completed'].includes(String(order.status || '').toLowerCase())).length
  const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)

  return (
    <section className="toktok-admin">
      <header className="toktok-admin-hero">
        <div className="toktok-admin-brand"><span>🛺</span><div><p>ANU MOSQUITO · ADMIN</p><h2>ANU TokTok Control Center</h2><small>Manage TokTok stores, products, delivery batches and orders.</small></div></div>
        <button type="button" className="toktok-admin-refresh" onClick={refresh} disabled={loading}>↻ Refresh data</button>
      </header>

      {error && <div className="toktok-admin-alert error" role="alert">{error}</div>}
      {notice && <div className="toktok-admin-alert success" role="status">{notice}</div>}

      <nav className="toktok-admin-tabs" aria-label="TokTok management sections">
        {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>

      {loading ? <div className="toktok-admin-empty">Loading TokTok data…</div> : (
        <>
          {tab === 'overview' && <div className="toktok-admin-overview">
            <article><span>🏪</span><small>Total stores</small><strong>{stores.length}</strong><em>{stores.filter((store) => store.is_active && store.is_open).length} active and open</em></article>
            <article><span>🛍️</span><small>Products</small><strong>{products.length}</strong><em>{products.filter((product) => product.is_available).length} available</em></article>
            <article><span>📦</span><small>Orders needing attention</small><strong>{activeOrders}</strong><em>Across TokTok stores</em></article>
            <article><span>💰</span><small>Recent order total</small><strong>{money(revenue)}</strong><em>Latest {orders.length} orders loaded</em></article>
            <div className="toktok-admin-callout"><strong>Quick guide</strong><p>Use the tabs above to switch between TokTok stores, product availability, delivery batches, and incoming orders. Changes to availability are saved directly to the database.</p></div>
          </div>}

          {tab === 'stores' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok stores</h3><p>Control which stores are active and accepting orders.</p></div><span>{stores.length} stores</span></div>
            {stores.length === 0 ? <p className="toktok-admin-empty">No TokTok stores found.</p> : <div className="toktok-admin-list">{stores.map((store) => <article className="toktok-admin-row" key={store.id}><div className="toktok-admin-row-icon">🏪</div><div className="toktok-admin-row-main"><strong>{store.name}</strong><small>{store.description || 'No description'}</small><div className="toktok-admin-pills"><span className={store.is_active ? 'on' : 'off'}>{store.is_active ? 'Active' : 'Inactive'}</span><span className={store.is_open ? 'on' : 'off'}>{store.is_open ? 'Open for orders' : 'Closed'}</span></div></div><div className="toktok-admin-row-actions"><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_active', store.is_active, 'Store status')} type="button">{store.is_active ? 'Deactivate' : 'Activate'}</button><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_open', store.is_open, 'Store opening status')} type="button">{store.is_open ? 'Close store' : 'Open store'}</button></div></article>)}</div>}
          </div>}

          {tab === 'products' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>Product availability</h3><p>Quickly enable or disable products in the TokTok catalog.</p></div><span>{products.length} products</span></div>
            {products.length === 0 ? <p className="toktok-admin-empty">No TokTok products found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Product</th><th>Store</th><th>Price</th><th>Stock</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{stores.find((store) => store.id === product.store_id)?.name || '—'}</td><td>{money(product.selling_price)}</td><td>{product.stock_quantity ?? 'Not tracked'}</td><td><span className={product.is_available ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{product.is_available ? 'Available' : 'Unavailable'}</span></td><td><button className="toktok-admin-action" disabled={busyId === product.id} onClick={() => toggleRecord('toktok_products', product.id, 'is_available', product.is_available, 'Product availability')} type="button">{product.is_available ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div>}
          </div>}

          {tab === 'batches' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>Delivery batches</h3><p>Review batch timings and turn batches on or off.</p></div><span>{batches.length} batches</span></div>
            {batches.length === 0 ? <p className="toktok-admin-empty">No TokTok batches found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Store</th><th>Delivery time</th><th>Registration ends</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td>{stores.find((store) => store.id === batch.store_id)?.name || '—'}</td><td>{batch.delivery_time ? new Date(batch.delivery_time).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.registration_end ? new Date(batch.registration_end).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.capacity ?? '—'}</td><td><span className={batch.is_active ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{batch.is_active ? 'Active' : 'Inactive'}</span></td><td><button className="toktok-admin-action" disabled={busyId === batch.id} onClick={() => toggleRecord('toktok_batches', batch.id, 'is_active', batch.is_active, 'Batch status')} type="button">{batch.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
          </div>}

          {tab === 'orders' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok orders</h3><p>Recent orders across all stores. This view is read-only for order records.</p></div><span>{orders.length} recent orders</span></div>
            {orders.length === 0 ? <p className="toktok-admin-empty">No TokTok orders found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Order</th><th>Store</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th>Delivery location</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.order_number || String(order.id).slice(0, 8)}</strong></td><td>{order.store_name_snapshot || '—'}</td><td>{order.created_at ? new Date(order.created_at).toLocaleString('en-EG', { dateStyle: 'short', timeStyle: 'short' }) : order.order_date || '—'}</td><td><span className="toktok-admin-status">{order.status || '—'}</span></td><td>{order.payment_status || '—'}</td><td><strong>{money(order.total_amount)}</strong><small className="toktok-admin-fees">Items {money(order.items_subtotal)} · Delivery {money(order.delivery_fee)}</small></td><td>{order.delivery_address || '—'}</td></tr>)}</tbody></table></div>}
          </div>}
        </>
      )}
    </section>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import './TokTokPage.css'

const money = (value) => new Intl.NumberFormat('en-EG', {
  style: 'currency', currency: 'EGP', maximumFractionDigits: 2,
}).format(Number(value || 0))

export default function TokTokPage({ onBack, onOpenOrders }) {
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [showOrders, setShowOrders] = useState(false)
  const [myOrders, setMyOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: storeRows, error: storeError } = await supabase
      .from('toktok_stores')
      .select('id,name,description,image_url')
      .eq('is_active', true)
      .eq('is_open', true)
      .order('sort_order')
    if (storeError) {
      setError('Could not load TokTok stores. Please try again.')
      setLoading(false)
      return
    }
    const safeStores = storeRows || []
    setStores(safeStores)
    const nextStoreId = safeStores.some((store) => store.id === storeId) ? storeId : (safeStores[0]?.id || '')
    setStoreId(nextStoreId)
    if (!nextStoreId) {
      setCategories([])
      setProducts([])
      setBatches([])
      setLoading(false)
      return
    }
    const [categoryResult, productResult, batchResult] = await Promise.all([
      supabase.from('toktok_categories').select('id,name,sort_order').eq('store_id', nextStoreId).eq('is_active', true).order('sort_order'),
      supabase.from('toktok_products').select('id,store_id,category_id,name,description,image_url,selling_price,stock_quantity').eq('store_id', nextStoreId).eq('is_available', true).order('sort_order'),
      supabase.from('toktok_batches').select('id,store_id,registration_start,registration_end,delivery_time,capacity').eq('store_id', nextStoreId).eq('is_active', true).gte('registration_end', new Date().toISOString()).order('delivery_time'),
    ])
    if (categoryResult.error || productResult.error || batchResult.error) {
      setError('Could not load this store menu or delivery times.')
    } else {
      setCategories(categoryResult.data || [])
      setProducts(productResult.data || [])
      setBatches((batchResult.data || []).filter((batch) => new Date(batch.registration_start) <= new Date() && new Date(batch.registration_end) >= new Date()))
      setBatchId((current) => (batchResult.data || []).some((batch) => batch.id === current) ? current : ((batchResult.data || []).find((batch) => new Date(batch.registration_start) <= new Date() && new Date(batch.registration_end) >= new Date())?.id || ''))
      setCart({})
      setCategoryId('all')
    }
    setLoading(false)
  }, [storeId])

  useEffect(() => { loadCatalog() }, [loadCatalog]) // load when the TokTok screen opens

  async function switchStore(nextId) {
    setStoreId(nextId)
    setCart({})
    setCategoryId('all')
    setBatchId('')
    setLoading(true)
    setError('')
    const [categoryResult, productResult, batchResult] = await Promise.all([
      supabase.from('toktok_categories').select('id,name,sort_order').eq('store_id', nextId).eq('is_active', true).order('sort_order'),
      supabase.from('toktok_products').select('id,store_id,category_id,name,description,image_url,selling_price,stock_quantity').eq('store_id', nextId).eq('is_available', true).order('sort_order'),
      supabase.from('toktok_batches').select('id,store_id,registration_start,registration_end,delivery_time,capacity').eq('store_id', nextId).eq('is_active', true).gte('registration_end', new Date().toISOString()).order('delivery_time'),
    ])
    if (categoryResult.error || productResult.error || batchResult.error) setError('Could not load this store menu or delivery times.')
    else {
      setCategories(categoryResult.data || [])
      setProducts(productResult.data || [])
      const openBatches = (batchResult.data || []).filter((batch) => new Date(batch.registration_start) <= new Date() && new Date(batch.registration_end) >= new Date())
      setBatches(openBatches)
      setBatchId(openBatches[0]?.id || '')
    }
    setLoading(false)
  }

  const shownProducts = useMemo(() => categoryId === 'all' ? products : products.filter((product) => product.category_id === categoryId), [products, categoryId])
  const cartItems = useMemo(() => products.filter((product) => Number(cart[product.id] || 0) > 0).map((product) => ({ ...product, quantity: Number(cart[product.id]) })), [products, cart])
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0)
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  function changeQuantity(product, delta) {
    setCart((current) => {
      const next = Math.max(0, Math.min(99, Number(current[product.id] || 0) + delta))
      if (product.stock_quantity != null && next > product.stock_quantity) return current
      const updated = { ...current }
      if (next === 0) delete updated[product.id]
      else updated[product.id] = next
      return updated
    })
  }

  async function loadMyOrders() {
    setOrdersLoading(true)
    setError('')
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) {
      setError('Please sign in again to view your TokTok orders.')
      setOrdersLoading(false)
      return
    }
    const { data, error: ordersError } = await supabase
      .from('toktok_orders')
      .select('id,order_number,order_date,store_name_snapshot,delivery_address,delivery_fee,items_subtotal,total_amount,payment_status,status,notes,created_at')
      .eq('student_id', userResult.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (ordersError) setError('Could not load your TokTok orders. Please try again.')
    else setMyOrders(data || [])
    setOrdersLoading(false)
  }

  async function openTokTokOrders() {
    setShowOrders(true)
    await loadMyOrders()
  }

  async function placeOrder() {
    setError('')
    setNotice('')
    if (!cartItems.length) return setError('Add at least one product to your cart.')
    if (!batchId) return setError('There is no open delivery batch. Please check back soon.')
    setSubmitting(true)
    const { data, error: orderError } = await supabase.rpc('toktok_place_order', {
      p_store_id: storeId,
      p_batch_id: batchId,
      p_items: cartItems.map(({ id, quantity }) => ({ product_id: id, quantity })),
      p_delivery_address: address.trim() || null,
      p_notes: notes.trim() || null,
    })
    setSubmitting(false)
    if (orderError) {
      setError(orderError.message || 'Could not place the order. Please try again.')
      return
    }
    setCart({})
    setAddress('')
    setNotes('')
    setNotice(`Order ${data?.order_number || ''} placed successfully.`)
    await loadCatalog()
  }

  return (
    <div className="toktok-page">
      <header className="toktok-header">
        <button className="toktok-back" type="button" onClick={onBack}>← Back to Mosquito</button>
        <div className="toktok-brand"><span className="toktok-mark">🛺</span><div><strong>ANU TokTok</strong><small>Campus essentials, delivered</small></div></div>
        <button className="toktok-orders" type="button" onClick={openTokTokOrders}>My TokTok Orders</button>
      </header>

      <main className="toktok-main">
        <section className="toktok-hero"><span className="toktok-kicker">THE TOKTOK SERVICE</span><h1>Need something? We’ll bring it.</h1><p>Choose a store, add your items, and select an available delivery batch.</p></section>
        {error && <p className="toktok-message is-error" role="alert">{error}</p>}
        {notice && <p className="toktok-message is-success" role="status">{notice}</p>}

        {showOrders ? (
          <section className="toktok-my-orders">
            <div className="toktok-orders-heading"><h2>My TokTok Orders</h2><button type="button" onClick={() => setShowOrders(false)}>Back to stores</button></div>
            {ordersLoading ? <div className="toktok-empty">Loading your orders…</div> : myOrders.length === 0 ? <div className="toktok-empty">You haven't placed any TokTok orders yet.</div> : (
              <div className="toktok-order-list">{myOrders.map((order) => (
                <article className="toktok-order-card" key={order.id}>
                  <div><strong>{order.order_number}</strong><small>{order.store_name_snapshot} · {new Date(order.created_at).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
                  <span className="toktok-order-status">{order.status}</span>
                  <p>Total: <strong>{money(order.total_amount)}</strong> · Payment: {order.payment_status}</p>
                  {order.delivery_address && <small>Delivery: {order.delivery_address}</small>}
                  {order.notes && <small>Notes: {order.notes}</small>}
                </article>
              ))}</div>
            )}
            <button type="button" className="toktok-refresh-orders" onClick={loadMyOrders} disabled={ordersLoading}>Refresh orders</button>
          </section>
        ) : loading ? <div className="toktok-empty">Loading TokTok…</div> : stores.length === 0 ? (
          <div className="toktok-empty"><span>🛺</span><h2>TokTok is getting ready</h2><p>No stores are open yet. Please check back soon.</p></div>
        ) : (
          <>
            <section className="toktok-store-row" aria-label="Stores">
              {stores.map((store) => <button key={store.id} className={store.id === storeId ? 'toktok-store active' : 'toktok-store'} onClick={() => switchStore(store.id)} type="button">
                {store.image_url ? <img src={store.image_url} alt="" /> : <span className="toktok-store-icon">🛺</span>}
                <span><strong>{store.name}</strong><small>{store.description || 'Browse available items'}</small></span>
              </button>)}
            </section>

            {categories.length > 0 && <nav className="toktok-categories" aria-label="Product categories">
              <button className={categoryId === 'all' ? 'active' : ''} onClick={() => setCategoryId('all')} type="button">All items</button>
              {categories.map((category) => <button key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)} type="button">{category.name}</button>)}
            </nav>}

            {shownProducts.length === 0 ? <div className="toktok-empty">No available products in this category yet.</div> : <section className="toktok-product-grid">
              {shownProducts.map((product) => <article className="toktok-product" key={product.id}>
                {product.image_url ? <img className="toktok-product-image" src={product.image_url} alt="" loading="lazy" /> : <div className="toktok-product-placeholder">🛍️</div>}
                <div className="toktok-product-body"><h3>{product.name}</h3><p>{product.description || 'Available for campus delivery.'}</p><strong>{money(product.selling_price)}</strong>
                  {product.stock_quantity === 0 ? <small className="toktok-out-stock">Out of stock</small> : <div className="toktok-quantity"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product, -1)} disabled={!cart[product.id]}>−</button><span>{cart[product.id] || 0}</span><button type="button" aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product, 1)} disabled={product.stock_quantity != null && Number(cart[product.id] || 0) >= product.stock_quantity}>+</button></div>}
                </div>
              </article>)}
            </section>}

            <section className="toktok-checkout">
              <div><span className="toktok-kicker">YOUR CART</span><h2>{count} {count === 1 ? 'item' : 'items'}</h2><p>Subtotal: <strong>{money(subtotal)}</strong></p><small>Delivery fee is calculated by the server at checkout.</small></div>
              <div className="toktok-checkout-fields">
                <label>Delivery batch<select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">Choose an available batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{new Date(batch.delivery_time).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</option>)}</select></label>
                <label>Delivery location<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} placeholder="Where should we meet you on campus?" /></label>
                <label>Order notes (optional)<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Any instructions?" /></label>
                <button className="toktok-place-order" type="button" onClick={placeOrder} disabled={submitting || count === 0 || !batchId}>{submitting ? 'Placing order…' : `Place order · ${money(subtotal)} + delivery`}</button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

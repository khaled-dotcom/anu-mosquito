import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import './TokTokPage.css'

const money = (value) => new Intl.NumberFormat('en-EG', {
  style: 'currency', currency: 'EGP', maximumFractionDigits: 2,
}).format(Number(value || 0))

export default function TokTokPage({ onBack, onOpenOrders }) {
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [selectedStoreOpen, setSelectedStoreOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState('cart')
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [paymentProof, setPaymentProof] = useState(null)
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false)
  const [deliveryFeeTiers, setDeliveryFeeTiers] = useState([])
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(0)
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

  const loadCatalog = useCallback(async (requestedStoreId = '') => {
    setLoading(true)
    setError('')
    try {
      const { data: storeRows, error: storeError } = await supabase
        .from('toktok_stores')
        .select('id,name,description,image_url')
        .eq('is_active', true)
        .eq('is_open', true)
        .order('sort_order')
      if (storeError) throw storeError

      const safeStores = storeRows || []
      setStores(safeStores)
      const nextStoreId = safeStores.some((store) => store.id === requestedStoreId) ? requestedStoreId : (safeStores[0]?.id || '')
      setStoreId(nextStoreId)

      if (!nextStoreId) {
        setCategories([])
        setProducts([])
        setBatches([])
        setBatchId('')
        setCart({})
        return
      }

      const now = new Date()
      const [categoryResult, productResult, batchResult] = await Promise.all([
        supabase.from('toktok_categories').select('id,name,sort_order').eq('store_id', nextStoreId).eq('is_active', true).order('sort_order'),
        supabase.from('toktok_products').select('id,store_id,category_id,name,description,image_url,selling_price').eq('store_id', nextStoreId).eq('is_available', true).order('sort_order'),
        supabase.from('toktok_batches').select('id,store_id,registration_start,registration_end,delivery_time,capacity').eq('store_id', nextStoreId).eq('is_active', true).gte('registration_end', now.toISOString()).order('delivery_time'),
      ])
      if (categoryResult.error) throw categoryResult.error
      if (productResult.error) throw productResult.error
      if (batchResult.error) throw batchResult.error

      const openBatches = (batchResult.data || []).filter((batch) => new Date(batch.registration_end) >= now)
      setCategories(categoryResult.data || [])
      setProducts(productResult.data || [])
      setBatches(openBatches)
      setBatchId((current) => openBatches.some((batch) => batch.id === current) ? current : (openBatches[0]?.id || ''))
      setCart({})
      setCartOpen(false)
      setCategoryId('all')
    } catch (loadError) {
      console.error('TokTok catalog load failed:', loadError)
      setError('Could not load TokTok right now. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog]) // load when the TokTok screen opens

  useEffect(() => {
    let alive = true
    async function loadPaymentMethods() {
      setPaymentMethodsLoading(true)
      const [methodResult, settingsResult] = await Promise.all([
        supabase.from('payment_methods').select('id,name,type,account_number,instructions').eq('is_active', true).order('created_at'),
        supabase.from('toktok_settings').select('setting_key,setting_value').in('setting_key', ['delivery_fee_tiers', 'delivery_fee']),
      ])
      if (!alive) return
      if (methodResult.error) {
        console.error('TokTok payment methods failed:', methodResult.error)
        setError('Could not load payment methods. Please try again.')
      } else {
        setPaymentMethods(methodResult.data || [])
        setSelectedPaymentMethod(methodResult.data?.[0] || null)
      }
      const settings = settingsResult.data || []
      const tiersRow = settings.find((row) => row.setting_key === 'delivery_fee_tiers')
      const legacyRow = settings.find((row) => row.setting_key === 'delivery_fee')
      const tiers = Array.isArray(tiersRow?.setting_value) ? tiersRow.setting_value : []
      setDeliveryFeeTiers(tiers)
      setBaseDeliveryFee(Number(legacyRow?.setting_value ?? 0))
      setPaymentMethodsLoading(false)
    }
    loadPaymentMethods()
    return () => { alive = false }
  }, [])

  function switchStore(nextId) {
    setStoreId(nextId)
    setSelectedStoreOpen(true)
    setCart({})
    setCartOpen(false)
    setCategoryId('all')
    setBatchId('')
    setLoading(true)
    setError('')
    setNotice('')
    loadCatalog(nextId)
  }

  function backToStores() {
    setSelectedStoreOpen(false)
    setCategoryId('all')
    setCart({})
    setCartOpen(false)
    setError('')
    setNotice('')
  }

  const shownProducts = useMemo(() => categoryId === 'all' ? products : products.filter((product) => product.category_id === categoryId), [products, categoryId])
  const cartItems = useMemo(() => products.filter((product) => Number(cart[product.id] || 0) > 0).map((product) => ({ ...product, quantity: Number(cart[product.id]) })), [products, cart])
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0)
  const matchingDeliveryTier = [...deliveryFeeTiers].filter((tier) => Number(tier.min_order_total) <= subtotal).sort((a, b) => Number(b.min_order_total) - Number(a.min_order_total))[0]
  const deliveryFee = Number(matchingDeliveryTier?.fee ?? baseDeliveryFee)
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  function changeQuantity(product, delta) {
    setCart((current) => {
      const next = Math.max(0, Math.min(99, Number(current[product.id] || 0) + delta))
      const updated = { ...current }
      if (next === 0) delete updated[product.id]
      else updated[product.id] = next
      return updated
    })
  }

  async function loadMyOrders() {
    setOrdersLoading(true)
    setError('')
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userResult.user) {
        setMyOrders([])
        setError('Please sign in again to view your TokTok orders.')
        return
      }

      const { data, error: ordersError } = await supabase
        .from('toktok_orders')
        .select('id,order_number,order_date,store_name_snapshot,delivery_address,delivery_fee,items_subtotal,total_amount,payment_status,status,notes,created_at,batch_id,batch_time_snapshot,payment_method_snapshot,payment_proof_url')
        .eq('student_id', userResult.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (ordersError) throw ordersError

      const orders = data || []
      if (!orders.length) {
        setMyOrders([])
        return
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from('toktok_order_items')
        .select('order_id,product_name_snapshot,quantity,unit_price,line_total,notes')
        .in('order_id', orders.map((order) => order.id))
      if (itemsError) {
        setMyOrders(orders.map((order) => ({ ...order, items: [] })))
        setError('Orders loaded, but some item details could not be loaded. Please refresh.')
        return
      }

      const itemsByOrder = (itemRows || []).reduce((grouped, item) => {
        if (!grouped[item.order_id]) grouped[item.order_id] = []
        grouped[item.order_id].push(item)
        return grouped
      }, {})
      setMyOrders(orders.map((order) => ({ ...order, items: itemsByOrder[order.id] || [] })))
    } catch (loadError) {
      console.error('TokTok order history load failed:', loadError)
      setMyOrders([])
      setError('Could not load your TokTok orders. Please try again.')
    } finally {
      setOrdersLoading(false)
    }
  }

  async function openTokTokOrders() {
    setShowOrders(true)
    await loadMyOrders()
  }

  async function placeOrder() {
    setError('')
    setNotice('')
    if (!cartItems.length) return setError('Add at least one product to your cart.')
    if (!batchId) return setError('Choose a delivery batch before continuing.')
    if (!selectedPaymentMethod) return setError('Choose a payment method.')
    if (!paymentProof) return setError('Upload your payment screenshot.')
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) return setError('Please sign in again before placing your order.')
    setSubmitting(true)
    let uploadedPath = ''
    try {
      const file = paymentProof
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Upload a JPG, PNG, or WEBP screenshot.')
      if (file.size > 8 * 1024 * 1024) throw new Error('Payment screenshot must be 8 MB or smaller.')
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      uploadedPath = userResult.user.id + '/toktok-' + crypto.randomUUID() + '.' + extension
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(uploadedPath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { data, error: orderError } = await supabase.rpc('toktok_place_order_with_payment', {
        p_store_id: storeId, p_batch_id: batchId,
        p_items: cartItems.map(({ id, quantity }) => ({ product_id: id, quantity })),
        p_delivery_address: address.trim() || null,
        p_notes: notes.trim() || null,
        p_payment_method_id: selectedPaymentMethod.id,
        p_payment_proof_url: uploadedPath,
      })
      if (orderError) throw orderError
      const order = Array.isArray(data) ? data[0] : data
      setCart({})
      setCartOpen(false)
      setCheckoutStep('cart')
      setAddress('')
      setNotes('')
      setPaymentProof(null)
      setNotice('Order ' + order.order_number + ' submitted. Your payment proof is waiting for admin confirmation.')
      await loadCatalog()
      await loadMyOrders()
    } catch (orderError) {
      console.error('TokTok order placement failed:', orderError)
      if (uploadedPath) await supabase.storage.from('payment-proofs').remove([uploadedPath])
      const message = String(orderError?.message || '').toLowerCase()
      if (/stock|out of stock|quantity/.test(message)) setError('One or more items are no longer available. Refresh the menu and try again.')
      else if (/batch|capacity|registration|delivery time/.test(message)) setError('That delivery batch is no longer available. Refresh the menu and choose another batch.')
      else setError(orderError?.message || 'Could not place your order. Please refresh and try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="toktok-page">
      <header className="toktok-header">
        <button className="toktok-back" type="button" onClick={onBack}>← Back to Mosquito</button>
        <div className="toktok-brand"><span className="toktok-mark">🛺</span><div><strong>ANU TokTok</strong><small>Campus essentials, delivered</small></div></div>
        <button className="toktok-orders" type="button" onClick={openTokTokOrders}>My TokTok Orders</button>
      </header>
      <main className="toktok-main">
        {!selectedStoreOpen && !showOrders && <section className="toktok-hero"><span className="toktok-kicker">THE TOKTOK SERVICE</span><h1>Need something? We’ll bring it.</h1><p>Choose a store, add your items, and select an available delivery batch.</p></section>}
        {error && <p className="toktok-message is-error" role="alert">{error}</p>}
        {notice && <p className="toktok-message is-success" role="status">{notice}</p>}

        {showOrders && (
          <section className="toktok-my-orders">
            <div className="toktok-orders-heading"><h2>My TokTok Orders</h2><button type="button" onClick={() => setShowOrders(false)}>Back to stores</button></div>
            {ordersLoading && <div className="toktok-empty">Loading your orders…</div>}
            {!ordersLoading && myOrders.length === 0 && <div className="toktok-empty">You haven't placed any TokTok orders yet.</div>}
            {!ordersLoading && myOrders.length > 0 && <div className="toktok-order-list">{myOrders.map((order) => (
              <article className="toktok-order-card" key={order.id}>
                <div><strong>{order.order_number}</strong><small>{order.store_name_snapshot} · {new Date(order.created_at).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
                <span className="toktok-order-status">{order.status}</span>
                <p>Total: <strong>{money(order.total_amount)}</strong> · Payment: {order.payment_status}</p>
                {order.items?.length > 0 && <ul className="toktok-order-items">{order.items.map((item, index) => <li key={order.id + '-' + index}><span>{item.product_name_snapshot} × {item.quantity}</span><strong>{money(item.line_total)}</strong></li>)}</ul>}
                {order.delivery_address && <small>Delivery: {order.delivery_address}</small>}
                {order.notes && <small>Notes: {order.notes}</small>}
                <small>Payment method: {order.payment_method_snapshot || '—'} · Payment status: {order.payment_status || 'pending'}</small>
                {order.batch_time_snapshot && <small>Delivery batch: {new Date(order.batch_time_snapshot).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</small>}
              </article>
            ))}</div>}
            <button type="button" className="toktok-refresh-orders" onClick={loadMyOrders} disabled={ordersLoading}>Refresh orders</button>
          </section>
        )}

        {!showOrders && loading && <div className="toktok-empty">Loading TokTok…</div>}
        {!showOrders && !loading && stores.length === 0 && <div className="toktok-empty"><span>🛺</span><h2>TokTok is getting ready</h2><p>No stores are open yet. Please check back soon.</p></div>}

        {!showOrders && !loading && stores.length > 0 && !selectedStoreOpen && (
          <section className="toktok-store-directory" aria-label="Choose a store">
            <div className="toktok-directory-heading"><span className="toktok-kicker">SHOP BY STORE</span><h2>What are you looking for?</h2><p>Choose a store to explore its menu.</p></div>
            <div className="toktok-store-row">
              {stores.map((store) => <button key={store.id} className="toktok-store" onClick={() => switchStore(store.id)} type="button" style={store.image_url ? { backgroundImage: 'linear-gradient(90deg, rgba(5,18,35,.82), rgba(5,18,35,.18)), url("' + store.image_url + '")' } : undefined}>
                <span className="toktok-store-copy"><strong>{store.name}</strong><small>{store.description || 'Explore store'}</small><em>Explore menu <span aria-hidden="true">→</span></em></span>
              </button>)}
            </div>
          </section>
        )}

        {!showOrders && !loading && stores.length > 0 && selectedStoreOpen && (
          <div className="toktok-store-content">
            <div className="toktok-inside-store-heading">
              <button type="button" onClick={backToStores}>← All stores</button>
              <div className="toktok-current-store">
                {stores.find((store) => store.id === storeId)?.image_url && <img src={stores.find((store) => store.id === storeId)?.image_url} alt="" />}
                <div><span className="toktok-kicker">NOW SHOPPING AT</span><h2>{stores.find((store) => store.id === storeId)?.name || 'Store menu'}</h2></div>
              </div>
            </div>
            {categories.length > 0 && <nav className="toktok-categories" aria-label="Product categories">
              <button className={categoryId === 'all' ? 'active' : ''} onClick={() => setCategoryId('all')} type="button">All items</button>
              {categories.map((category) => <button key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)} type="button">{category.name}</button>)}
            </nav>}
            {shownProducts.length === 0 && <div className="toktok-empty">No available products in this category yet.</div>}
            {shownProducts.length > 0 && <section className="toktok-product-grid">
              {shownProducts.map((product) => <article className="toktok-product" key={product.id}>
                {product.image_url ? <img className="toktok-product-image" src={product.image_url} alt="" loading="lazy" /> : <div className="toktok-product-placeholder">🛍️</div>}
                <div className="toktok-product-body"><h3>{product.name}</h3><strong className="toktok-product-price">{money(product.selling_price)}</strong>
                  <div className="toktok-quantity"><button type="button" aria-label={'Remove one ' + product.name} onClick={() => changeQuantity(product, -1)} disabled={!cart[product.id]}>−</button><span>{cart[product.id] || 0}</span><button type="button" aria-label={'Add one ' + product.name} onClick={() => changeQuantity(product, 1)}>+</button></div>
                </div>
              </article>)}
            </section>}

            {cartOpen && (
              <div className="toktok-cart-backdrop" role="presentation" onClick={() => setCartOpen(false)}>
                <section className="toktok-checkout toktok-cart-panel" role="dialog" aria-modal="true" aria-label="Cart and checkout" onClick={(event) => event.stopPropagation()}>
                  <div className="toktok-cart-panel-heading">
                    <div><span className="toktok-kicker">CHECKOUT · {checkoutStep === 'cart' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}</span><h2>{checkoutStep === 'cart' ? 'Review & delivery' : 'Payment'}</h2><p>{count} {count === 1 ? 'item' : 'items'} · <strong>{money(subtotal)}</strong> subtotal</p></div>
                    <button type="button" className="toktok-cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button>
                  </div>
                  {checkoutStep === 'cart' && (
                    <div className="toktok-checkout-fields">
                      <div className="toktok-cart-lines">{cartItems.map((item) => <div key={item.id} className="toktok-cart-line"><span>{item.name} × {item.quantity}</span><strong>{money(Number(item.selling_price) * item.quantity)}</strong></div>)}</div>
                      <h3>Choose a delivery batch</h3>
                      {batches.length === 0 && <p>No delivery batches are accepting orders right now.</p>}
                      {batches.length > 0 && <div className="toktok-batch-options">{batches.map((batch) => <button key={batch.id} type="button" disabled={new Date(batch.registration_start) > new Date()} className={batchId === batch.id ? 'selected' : ''} onClick={() => setBatchId(batch.id)}><span><strong>{new Date(batch.delivery_time).toLocaleDateString('en-EG', { weekday: 'short', month: 'short', day: 'numeric' })}</strong><small>{new Date(batch.delivery_time).toLocaleTimeString('en-EG', { hour: 'numeric', minute: '2-digit' })}</small>{new Date(batch.registration_start) > new Date() && <small>Opens at {new Date(batch.registration_start).toLocaleTimeString('en-EG', { hour: 'numeric', minute: '2-digit' })}</small>}</span><span>{batchId === batch.id ? '✓' : '○'}</span></button>)}</div>}
                      <label>Delivery location<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} placeholder="Where should we meet you on campus?" /></label>
                      <label>Order notes (optional)<input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Any instructions?" /></label>
                      <button className="toktok-place-order" type="button" onClick={() => setCheckoutStep('payment')} disabled={count === 0 || !batchId}>Continue to payment →</button>
                    </div>
                  )}
                  {checkoutStep === 'payment' && (
                    <div className="toktok-checkout-fields">
                      <div className="toktok-payment-total"><span>Items subtotal</span><strong>{money(subtotal)}</strong><span>Delivery fee</span><strong>{money(deliveryFee)}</strong><span>Total to pay</span><strong>{money(subtotal + deliveryFee)}</strong></div>
                      <h3>Choose payment method</h3>
                      {paymentMethodsLoading && <p>Loading payment methods…</p>}
                      {!paymentMethodsLoading && paymentMethods.length === 0 && <p>No active payment methods are available. Contact TokTok administration.</p>}
                      {!paymentMethodsLoading && paymentMethods.length > 0 && <div className="toktok-payment-methods">{paymentMethods.map((method) => <button key={method.id} type="button" className={selectedPaymentMethod?.id === method.id ? 'selected' : ''} onClick={() => setSelectedPaymentMethod(method)}><strong>{method.name}</strong><small>{method.type}</small><span>{selectedPaymentMethod?.id === method.id ? '✓' : '○'}</span></button>)}</div>}
                      {selectedPaymentMethod && <div className="toktok-payment-instructions"><span>Transfer to</span><strong>{selectedPaymentMethod.account_number}</strong>{selectedPaymentMethod.instructions && <p>{selectedPaymentMethod.instructions}</p>}</div>}
                      <label className="toktok-proof-upload">Payment screenshot<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPaymentProof(event.target.files?.[0] || null)} /><small>{paymentProof ? paymentProof.name : 'JPG, PNG or WEBP · up to 8 MB'}</small></label>
                      {paymentProof && <div className="toktok-proof-preview-name">{paymentProof.name}</div>}
                      <div className="toktok-checkout-step-actions"><button type="button" onClick={() => setCheckoutStep('cart')}>← Back</button><button className="toktok-place-order" type="button" onClick={placeOrder} disabled={submitting || !selectedPaymentMethod || !paymentProof || !batchId}>{submitting ? 'Submitting…' : 'Confirm order & send payment proof'}</button></div>
                      <small className="toktok-payment-pending-note">Your order will wait for the TokTok admin to confirm your payment.</small>
                    </div>
                  )}
                </section>
              </div>
            )}
            <div className="toktok-cart-bar"><div><strong>{count} {count === 1 ? 'item' : 'items'}</strong><span>{money(subtotal)} subtotal</span></div><button type="button" onClick={() => { setCheckoutStep('cart'); setCartOpen(true) }} disabled={count === 0}>View cart &amp; checkout →</button></div>
          </div>
        )}
      </main>
    </div>
  )
}

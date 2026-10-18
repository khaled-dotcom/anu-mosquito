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
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', store_id: '', selling_price: '', cost_price: '', stock_quantity: '', registration_start: '', registration_end: '', delivery_time: '', capacity: '' })

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

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function openAddForm() {
    setError('')
    setNotice('')
    setForm({ name: '', slug: '', description: '', store_id: stores[0]?.id || '', selling_price: '', cost_price: '', stock_quantity: '', registration_start: '', registration_end: '', delivery_time: '', capacity: '' })
    setShowAdd(true)
  }

  async function addRecord(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const table = tab === 'stores' ? 'toktok_stores' : tab === 'products' ? 'toktok_products' : 'toktok_batches'
    let payload
    if (tab === 'stores') {
      const slug = (form.slug || form.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      payload = { name: form.name.trim(), slug, description: form.description.trim() || null, is_active: true, is_open: true }
    } else if (tab === 'products') {
      if (!form.store_id) { setError('Choose a store before adding a product.'); return }
      if (!(form.name || '').trim()) { setError('Enter a product name.'); return }
      if (!form.name.trim()) { setError('Enter a product name.'); return }
      if (form.selling_price === '' || !Number.isFinite(Number(form.selling_price)) || Number(form.selling_price) < 0) { setError('Enter a valid selling price.'); return }
      payload = { store_id: form.store_id, name: form.name.trim(), description: form.description.trim() || null, selling_price: Number(form.selling_price), cost_price: form.cost_price === '' ? null : Number(form.cost_price), stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity), is_available: true }
    } else {
      if (!form.store_id) { setError('Choose a store before adding a batch.'); return }
      if (form.capacity !== '' && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1)) { setError('Capacity must be a positive whole number.'); return }
      const start = new Date(form.registration_start)
      const end = new Date(form.registration_end)
      const delivery = new Date(form.delivery_time)
      if (![start, end, delivery].every((date) => Number.isFinite(date.getTime()))) { setError('Enter all batch dates and times.'); return }
      if (end <= start) { setError('Registration closing time must be after opening time.'); return }
      if (delivery < end) { setError('Delivery time must be at or after registration closes.'); return }
      payload = { store_id: form.store_id, registration_start: start.toISOString(), registration_end: end.toISOString(), delivery_time: delivery.toISOString(), capacity: form.capacity === '' ? null : Number(form.capacity), is_active: editing ? editing.is_active : true }
    }
    try {
      const { error: insertError } = await supabase.from(table).insert(payload)
      if (insertError) throw insertError
      setShowAdd(false)
      setNotice(tab === 'stores' ? 'Store added successfully.' : tab === 'products' ? 'Product added successfully.' : 'Delivery batch added successfully.')
      await refresh()
    } catch (err) {
      console.error('TokTok admin insert failed:', err)
      setError(err?.message || 'Could not add this record. Check the required fields and admin permissions.')
    }
  }

  function openEditRecord(kind, record) {
    setError('')
    setNotice('')
    setEditing(record)
    setForm({
      ...emptyForm, ...record,
      store_id: record.store_id || stores[0]?.id || '',
      category_id: record.category_id || '',
      selling_price: record.selling_price ?? '',
      cost_price: record.cost_price ?? '',
      stock_quantity: record.stock_quantity ?? '',
      capacity: record.capacity ?? '',
      sort_order: String(record.sort_order ?? 0),
      registration_start: record.registration_start ? new Date(record.registration_start).toISOString().slice(0, 16) : '',
      registration_end: record.registration_end ? new Date(record.registration_end).toISOString().slice(0, 16) : '',
      delivery_time: record.delivery_time ? new Date(record.delivery_time).toISOString().slice(0, 16) : '',
    })
    setTab(kind)
    setShowAdd(true)
  }

  async function deleteRecord(table, record, label) {
    if (!window.confirm('Delete ' + label + '? Linked records may prevent deletion to protect order history.')) return
    setError('')
    setNotice('')
    setBusyId(record.id)
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq('id', record.id)
      if (deleteError) throw deleteError
      setNotice(label + ' deleted.')
      await refresh()
    } catch (err) {
      setError(err?.message || 'Could not delete ' + label + '. Linked records may need to be retained.')
    } finally { setBusyId('') }
  }

  async function saveCategory(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!categoryForm.store_id || !categoryForm.name.trim()) { setError('Choose a store and enter a category name.'); return }
    try {
      const payload = { store_id: categoryForm.store_id, name: categoryForm.name.trim(), description: categoryForm.description.trim() || null, sort_order: Number(categoryForm.sort_order) || 0, is_active: true }
      const result = categoryForm.id
        ? await supabase.from('toktok_categories').update(payload).eq('id', categoryForm.id)
        : await supabase.from('toktok_categories').insert(payload)
      if (result.error) throw result.error
      setShowCategoryForm(false)
      setCategoryForm({ store_id: stores[0]?.id || '', name: '', description: '', sort_order: '0' })
      setNotice('Category saved.')
      await refresh()
    } catch (err) { setError(err?.message || 'Could not save category.') }
  }

  async function updateOrder(order, patch) {
    setError('')
    setNotice('')
    setBusyId(order.id)
    try {
      const { error: updateError } = await supabase.from('toktok_orders').update(patch).eq('id', order.id)
      if (updateError) throw updateError
      setNotice('Order ' + order.order_number + ' updated.')
      await refresh()
    } catch (err) { setError(err?.message || 'Could not update order. Check order-management permissions.') }
    finally { setBusyId('') }
  }

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

          {tab === 'stores' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok stores</h3><p>Control which stores are active and accepting orders.</p></div><div className="toktok-admin-heading-actions"><span>{stores.length} stores</span><button type="button" className="toktok-admin-add" onClick={openAddForm}>+ Add store</button></div></div>
            {showAdd && tab === 'stores' && <form className="toktok-admin-form" onSubmit={addRecord}><h4>{editing ? 'Edit TokTok store' : 'Add a TokTok store'}</h4><label>Store name *<input name="name" value={form.name} onChange={updateForm} required placeholder="e.g. Campus Market" /></label><label>Slug (optional)<input name="slug" value={form.slug} onChange={updateForm} placeholder="campus-market" /></label><label>Description<textarea name="description" value={form.description} onChange={updateForm} rows="2" /></label><label>Image URL<input name="image_url" value={form.image_url} onChange={updateForm} placeholder="https://…" /></label><label>Display order<input name="sort_order" type="number" value={form.sort_order} onChange={updateForm} /></label><div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save store'}</button></div></form>}
            {stores.length === 0 ? <p className="toktok-admin-empty">No TokTok stores found.</p> : <div className="toktok-admin-list">{stores.map((store) => <article className="toktok-admin-row" key={store.id}><div className="toktok-admin-row-icon">🏪</div><div className="toktok-admin-row-main"><strong>{store.name}</strong><small>{store.description || 'No description'}</small><div className="toktok-admin-pills"><span className={store.is_active ? 'on' : 'off'}>{store.is_active ? 'Active' : 'Inactive'}</span><span className={store.is_open ? 'on' : 'off'}>{store.is_open ? 'Open for orders' : 'Closed'}</span></div></div><div className="toktok-admin-row-actions"><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_active', store.is_active, 'Store status')} type="button">{store.is_active ? 'Deactivate' : 'Activate'}</button><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_open', store.is_open, 'Store opening status')} type="button">{store.is_open ? 'Close store' : 'Open store'}</button><button disabled={busyId === store.id} onClick={() => openEditRecord('stores', store)} type="button">Edit</button><button disabled={busyId === store.id} onClick={() => deleteRecord('toktok_stores', store, 'store ' + store.name)} type="button">Delete</button></div></article>)}</div>}
          </div>}

          {tab === 'products' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>Product availability</h3><p>Quickly enable or disable products in the TokTok catalog.</p></div><div className="toktok-admin-heading-actions"><span>{products.length} products</span><button type="button" className="toktok-admin-add" onClick={openAddForm} disabled={stores.length === 0}>+ Add product</button></div></div>
            {showAdd && tab === 'products' && <form className="toktok-admin-form" onSubmit={addRecord}><h4>{editing ? 'Edit product' : 'Add a product'}</h4><label>Store *<select name="store_id" value={form.store_id} onChange={updateForm} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><label>Product name *<input name="name" value={form.name} onChange={updateForm} required /></label><label>Category<select name="category_id" value={form.category_id} onChange={updateForm}><option value="">No category</option>{categories.filter((c) => c.store_id === form.store_id && c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="toktok-admin-form-grid"><label>Selling price (EGP) *<input name="selling_price" type="number" min="0" step="0.01" value={form.selling_price} onChange={updateForm} required /></label><label>Cost price (EGP)<input name="cost_price" type="number" min="0" step="0.01" value={form.cost_price} onChange={updateForm} /></label><label>Stock quantity<input name="stock_quantity" type="number" min="0" step="1" value={form.stock_quantity} onChange={updateForm} /></label></div><label>Description<textarea name="description" value={form.description} onChange={updateForm} rows="2" /></label><label>Image URL<input name="image_url" value={form.image_url} onChange={updateForm} placeholder="https://…" /></label><label>Display order<input name="sort_order" type="number" value={form.sort_order} onChange={updateForm} /></label><div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save product'}</button></div></form>}
            {products.length === 0 ? <p className="toktok-admin-empty">No TokTok products found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Product</th><th>Store</th><th>Price</th><th>Stock</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{stores.find((store) => store.id === product.store_id)?.name || '—'}</td><td>{money(product.selling_price)}</td><td>{product.stock_quantity ?? 'Not tracked'}</td><td><span className={product.is_available ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{product.is_available ? 'Available' : 'Unavailable'}</span></td><td><button className="toktok-admin-action" disabled={busyId === product.id} onClick={() => toggleRecord('toktok_products', product.id, 'is_available', product.is_available, 'Product availability')} type="button">{product.is_available ? 'Disable' : 'Enable'}</button> <button className="toktok-admin-action" onClick={() => openEditRecord('products', product)} type="button">Edit</button> <button className="toktok-admin-action" disabled={busyId === product.id} onClick={() => deleteRecord('toktok_products', product, 'product ' + product.name)} type="button">Delete</button></td></tr>)}</tbody></table></div>}
          </div>}

          {tab === 'batches' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>Delivery batches</h3><p>Review batch timings and turn batches on or off.</p></div><div className="toktok-admin-heading-actions"><span>{batches.length} batches</span><button type="button" className="toktok-admin-add" onClick={openAddForm} disabled={stores.length === 0}>+ Add batch</button></div></div>
            {showAdd && tab === 'batches' && <form className="toktok-admin-form" onSubmit={addRecord}><h4>{editing ? 'Edit delivery batch' : 'Create a delivery batch'}</h4><label>Store *<select name="store_id" value={form.store_id} onChange={updateForm} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><div className="toktok-admin-form-grid"><label>Registration opens *<input type="datetime-local" name="registration_start" value={form.registration_start} onChange={updateForm} required /></label><label>Registration closes *<input type="datetime-local" name="registration_end" value={form.registration_end} onChange={updateForm} required /></label><label>Delivery time *<input type="datetime-local" name="delivery_time" value={form.delivery_time} onChange={updateForm} required /></label><label>Order capacity<input type="number" min="1" step="1" name="capacity" value={form.capacity} onChange={updateForm} /></label></div><div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save batch'}</button></div></form>}
            {batches.length === 0 ? <p className="toktok-admin-empty">No TokTok batches found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Store</th><th>Delivery time</th><th>Registration ends</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td>{stores.find((store) => store.id === batch.store_id)?.name || '—'}</td><td>{batch.delivery_time ? new Date(batch.delivery_time).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.registration_end ? new Date(batch.registration_end).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.capacity ?? '—'}</td><td><span className={batch.is_active ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{batch.is_active ? 'Active' : 'Inactive'}</span></td><td><button className="toktok-admin-action" disabled={busyId === batch.id} onClick={() => toggleRecord('toktok_batches', batch.id, 'is_active', batch.is_active, 'Batch status')} type="button">{batch.is_active ? 'Deactivate' : 'Activate'}</button> <button className="toktok-admin-action" onClick={() => openEditRecord('batches', batch)} type="button">Edit</button> <button className="toktok-admin-action" disabled={busyId === batch.id} onClick={() => deleteRecord('toktok_batches', batch, 'delivery batch')} type="button">Delete</button></td></tr>)}</tbody></table></div>}
          </div>}

          {tab === 'categories' && <div className="toktok-admin-panel">
            <div className="toktok-admin-panel-heading"><div><h3>Product categories</h3><p>Organize TokTok products by store and display order.</p></div><button type="button" className="toktok-admin-add" onClick={() => { setCategoryForm({ store_id: stores[0]?.id || '', name: '', description: '', sort_order: '0' }); setShowCategoryForm(true) }} disabled={!stores.length}>+ Add category</button></div>
            {showCategoryForm && <form className="toktok-admin-form" onSubmit={saveCategory}><h4>{categoryForm.id ? 'Edit category' : 'Add category'}</h4><label>Store *<select value={categoryForm.store_id} onChange={(e) => setCategoryForm({ ...categoryForm, store_id: e.target.value })} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><label>Name *<input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required /></label><label>Description<textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></label><label>Display order<input type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })} /></label><div className="toktok-admin-form-actions"><button type="button" onClick={() => setShowCategoryForm(false)}>Cancel</button><button type="submit">Save category</button></div></form>}
            <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Category</th><th>Store</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td><strong>{category.name}</strong><small>{category.description || ''}</small></td><td>{stores.find((store) => store.id === category.store_id)?.name || '—'}</td><td>{category.sort_order}</td><td>{category.is_active ? 'Active' : 'Inactive'}</td><td><button type="button" className="toktok-admin-action" onClick={() => { setCategoryForm({ ...category, sort_order: String(category.sort_order ?? 0), description: category.description || '' }); setShowCategoryForm(true) }}>Edit</button> <button type="button" className="toktok-admin-action" onClick={() => toggleRecord('toktok_categories', category.id, 'is_active', category.is_active, 'Category status')}>{category.is_active ? 'Disable' : 'Enable'}</button> <button type="button" className="toktok-admin-action" onClick={() => deleteRecord('toktok_categories', category, 'category')}>Delete</button></td></tr>)}</tbody></table></div>
          </div>}

          {tab === 'finance' && <div className="toktok-admin-overview">
            <article><span>💰</span><small>Loaded orders gross total</small><strong>{money(orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0))}</strong><em>Latest {orders.length} orders only</em></article>
            <article><span>🛒</span><small>Items subtotal</small><strong>{money(orders.reduce((sum, order) => sum + Number(order.items_subtotal || 0), 0))}</strong><em>Before delivery fees</em></article>
            <article><span>🛺</span><small>Delivery fees</small><strong>{money(orders.reduce((sum, order) => sum + Number(order.delivery_fee || 0), 0))}</strong><em>Collected delivery charges</em></article>
            <article><span>📋</span><small>Orders loaded</small><strong>{orders.length}</strong><em>Latest orders only</em></article>
            <div className="toktok-admin-callout"><strong>Net profit is not calculated yet</strong><p>TokTok order records do not currently store a historical driver-cost snapshot per order. This summary avoids presenting gross sales as profit. A proper net-profit report needs a verified cost source for each completed order.</p></div>
          </div>}

          {tab === 'orders' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok orders</h3><p>Search orders, inspect item details, and update status/payment.</p></div><span>{orders.length} recent orders</span></div><label className="toktok-admin-search">Search orders<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order number, store, location, status…" /></label>
            {orders.length === 0 ? <p className="toktok-admin-empty">No TokTok orders found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Order</th><th>Store</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th>Delivery location</th><th>Items</th><th>Update status / payment</th></tr></thead><tbody>{orders.filter((order) => [order.order_number, order.store_name_snapshot, order.delivery_address, order.status, order.payment_status].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))).map((order) => <tr key={order.id}><td><strong>{order.order_number || String(order.id).slice(0, 8)}</strong></td><td>{order.store_name_snapshot || '—'}</td><td>{order.created_at ? new Date(order.created_at).toLocaleString('en-EG', { dateStyle: 'short', timeStyle: 'short' }) : order.order_date || '—'}</td><td><span className="toktok-admin-status">{order.status || '—'}</span></td><td>{order.payment_status || '—'}</td><td><strong>{money(order.total_amount)}</strong><small className="toktok-admin-fees">Items {money(order.items_subtotal)} · Delivery {money(order.delivery_fee)}</small></td><td>{order.delivery_address || '—'}</td><td>{orderItems.filter((item) => item.order_id === order.id).map((item) => item.product_name_snapshot + ' × ' + item.quantity).join(', ') || '—'}</td><td><select aria-label={'Status for ' + order.order_number} value={order.status || 'pending'} disabled={busyId === order.id} onChange={(e) => updateOrder(order, { status: e.target.value })}>{['pending','confirmed','preparing','ready','out_for_delivery','delivered','completed','cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select><select aria-label={'Payment for ' + order.order_number} value={order.payment_status || 'pending'} disabled={busyId === order.id} onChange={(e) => updateOrder(order, { payment_status: e.target.value })}>{['pending','paid','failed','refunded'].map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>}
          </div>}
        </>
      )}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import ImageUploader from '../../common/ImageUploader'
import './TokTokManagement.css'

const toLocalDateTimeInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const money = (value) => new Intl.NumberFormat('en-EG', {
  style: 'currency', currency: 'EGP', maximumFractionDigits: 2,
}).format(Number(value || 0))

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'stores', label: 'Stores', icon: '🏪' },
  { id: 'products', label: 'Products', icon: '🛍️' },
  { id: 'categories', label: 'Categories', icon: '🏷️' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'batches', label: 'Delivery batches', icon: '🛺' },
  { id: 'delivery-fee', label: 'Delivery price', icon: '💳' },
  { id: 'orders', label: 'Orders', icon: '📦' },
]

export default function TokTokManagement() {
  const [tab, setTab] = useState('overview')
  const [stores, setStores] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [deliveryTiers, setDeliveryTiers] = useState([{ min_order_total: '0', fee: '25' }, { min_order_total: '500', fee: '30' }])
  const [savedDeliveryTiers, setSavedDeliveryTiers] = useState([{ min_order_total: 0, fee: 25 }, { min_order_total: 500, fee: 30 }])
  const [savingDeliveryTiers, setSavingDeliveryTiers] = useState(false)
  const [toktokEnabled, setToktokEnabled] = useState(true)
  const [savingToktokEnabled, setSavingToktokEnabled] = useState(false)
  const [search, setSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [paymentProofPreview, setPaymentProofPreview] = useState(null)
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [editing, setEditing] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ store_id: '', name: '', description: '', sort_order: '0' })
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const emptyForm = { name: '', code: '', slug: '', description: '', image_url: '', store_id: '', category_id: '', selling_price: '', cost_price: '', sort_order: '0', registration_start: '', registration_end: '', delivery_time: '', capacity: '' }
  const [form, setForm] = useState(emptyForm)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [storeResult, productResult, batchResult, orderResult] = await Promise.all([
        supabase.from('toktok_stores').select('id,name,code,slug,description,image_url,is_active,is_open,sort_order').order('sort_order'),
        supabase.from('toktok_products').select('id,store_id,category_id,name,description,image_url,selling_price,cost_price,is_available,sort_order').order('sort_order').order('name'),
        supabase.from('toktok_batches').select('id,store_id,registration_start,registration_end,delivery_time,capacity,is_active').order('delivery_time', { ascending: false }).limit(100),
        supabase.from('toktok_orders').select('id,order_number,order_date,store_id,batch_id,student_id,student_name_snapshot,student_phone_snapshot,store_name_snapshot,delivery_address,items_subtotal,delivery_fee,total_amount,payment_status,status,payment_method_snapshot,payment_proof_url,batch_time_snapshot,created_at').order('created_at', { ascending: false }).limit(100),
      ])
      const [categoryResult, deliveryFeeResult] = await Promise.all([
        supabase.from('toktok_categories').select('id,store_id,name,description,image_url,is_active,sort_order').order('sort_order').order('name'),
        supabase.from('toktok_settings').select('setting_key,setting_value').in('setting_key', ['delivery_fee_tiers', 'delivery_fee', 'toktok_enabled']),
      ])
      const failed = [storeResult, productResult, batchResult, orderResult, categoryResult, deliveryFeeResult].find((result) => result.error)
      if (failed) throw failed.error
      setStores(storeResult.data || [])
      setProducts(productResult.data || [])
      setBatches(batchResult.data || [])
      const orderRows = orderResult.data || []
      const ordersWithProof = await Promise.all(orderRows.map(async (order) => {
        if (!order.payment_proof_url) return order
        const { data: signed, error: signedError } = await supabase.storage.from('payment-proofs').createSignedUrl(order.payment_proof_url, 60 * 30)
        return { ...order, payment_proof_signed_url: signedError ? '' : signed?.signedUrl || '' }
      }))
      setOrders(ordersWithProof)
      setCategories(categoryResult.data || [])
      const settingsRows = deliveryFeeResult.data || []
      const toktokEnabledRow = settingsRows.find((row) => row.setting_key === 'toktok_enabled')
      setToktokEnabled(toktokEnabledRow ? (toktokEnabledRow.setting_value === true || toktokEnabledRow.setting_value === 'true') : true)
      const tiersRow = settingsRows.find((row) => row.setting_key === 'delivery_fee_tiers')
      const legacyFeeRow = settingsRows.find((row) => row.setting_key === 'delivery_fee')
      const rawTiers = Array.isArray(tiersRow?.setting_value) ? tiersRow.setting_value : [{ min_order_total: 0, fee: Number(legacyFeeRow?.setting_value ?? 0) }]
      const normalizedTiers = rawTiers.map((tier) => ({ min_order_total: Number(tier.min_order_total), fee: Number(tier.fee) })).filter((tier) => Number.isFinite(tier.min_order_total) && tier.min_order_total >= 0 && Number.isFinite(tier.fee) && tier.fee >= 0).sort((a, b) => a.min_order_total - b.min_order_total)
      const finalTiers = normalizedTiers.length && normalizedTiers[0].min_order_total === 0 ? normalizedTiers : [{ min_order_total: 0, fee: Number(legacyFeeRow?.setting_value ?? 0) }]
      setDeliveryTiers(finalTiers.map((tier) => ({ min_order_total: String(tier.min_order_total), fee: String(tier.fee) })))
      setSavedDeliveryTiers(finalTiers)
      if ((orderResult.data || []).length) {
        const itemsResult = await supabase.from('toktok_order_items').select('id,order_id,product_name_snapshot,quantity,unit_price,unit_cost_snapshot,line_total,notes').in('order_id', orderResult.data.map((o) => o.id))
        setOrderItems(itemsResult.error ? [] : (itemsResult.data || []))
      } else setOrderItems([])
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
    setForm((current) => ({ ...current, [name]: value, ...(name === 'store_id' ? { category_id: '' } : {}) }))
  }

  function openAddForm() {
    setError('')
    setNotice('')
    setEditing(null)
    setForm({ ...emptyForm, store_id: tab === 'products' ? selectedStoreId : stores[0]?.id || '' })
    setShowAdd(true)
  }

  async function addRecord(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const table = tab === 'stores' ? 'toktok_stores' : tab === 'products' ? 'toktok_products' : 'toktok_batches'
    let payload
    if (tab === 'stores') {
      const slug = String(form.slug || form.name || '').trim().toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
      if (!(form.name || '').trim() || !slug) { setError('Enter a valid store name.'); return }
      if (!(form.code || '').trim()) { setError('Enter a store code.'); return }
      payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), slug, description: (form.description || '').trim() || null, image_url: (form.image_url || '').trim() || null, sort_order: Number(form.sort_order) || 0, is_active: editing ? editing.is_active : true, is_open: editing ? editing.is_open : true }
    } else if (tab === 'products') {
      if (!form.store_id) { setError('Choose a store before adding a product.'); return }
      if (!(form.name || '').trim()) { setError('Enter a product name.'); return }
      if (form.selling_price === '' || !Number.isFinite(Number(form.selling_price)) || Number(form.selling_price) < 0) { setError('Enter a valid selling price.'); return }
      if (form.cost_price !== '' && (!Number.isFinite(Number(form.cost_price)) || Number(form.cost_price) < 0)) { setError('Enter a valid cost price.'); return }
      payload = { store_id: form.store_id, category_id: form.category_id || null, name: form.name.trim(), description: (form.description || '').trim() || null, image_url: (form.image_url || '').trim() || null, selling_price: Number(form.selling_price), cost_price: form.cost_price === '' ? null : Number(form.cost_price), sort_order: Number(form.sort_order) || 0, is_available: editing ? editing.is_available : true }
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
      const result = editing ? await supabase.from(table).update(payload).eq('id', editing.id) : await supabase.from(table).insert(payload)
      if (result.error) throw result.error
      setShowAdd(false)
      setEditing(null)
      setNotice(editing ? 'Changes saved successfully.' : tab === 'stores' ? 'Store added successfully.' : tab === 'products' ? 'Product added successfully.' : 'Delivery batch added successfully.')
      await refresh()
    } catch (err) {
      console.error('TokTok admin save failed:', err)
      setError(err?.message || 'Could not save this record. Check the required fields and admin permissions.')
    }
  }

  function openEditRecord(kind, record) {
    setError('')
    setNotice('')
    setEditing(record)
    if (kind === 'products') setSelectedStoreId(record.store_id || '')
    setForm({
      ...emptyForm, ...record,
      name: record.name || '',
      code: record.code || '',
      slug: record.slug || '',
      description: record.description || '',
      image_url: record.image_url || '',
      store_id: record.store_id || stores[0]?.id || '',
      category_id: record.category_id || '',
      selling_price: record.selling_price ?? '',
      cost_price: record.cost_price ?? '',
      capacity: record.capacity ?? '',
      sort_order: String(record.sort_order ?? 0),
      registration_start: toLocalDateTimeInput(record.registration_start),
      registration_end: toLocalDateTimeInput(record.registration_end),
      delivery_time: toLocalDateTimeInput(record.delivery_time),
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

  async function toggleToktokVisibility() {
    const nextValue = !toktokEnabled
    setSavingToktokEnabled(true)
    setError('')
    setNotice('')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const { error: saveError } = await supabase.from('toktok_settings').upsert({
        setting_key: 'toktok_enabled', setting_value: nextValue,
        updated_by: authData.user?.id || null, updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })
      if (saveError) throw saveError
      setToktokEnabled(nextValue)
      setNotice(nextValue ? 'ANU TokTok is now visible to students on the home page.' : 'ANU TokTok is hidden from students on the home page.')
    } catch (err) {
      console.error('TokTok visibility update failed:', err)
      setError(err?.message || 'Could not update TokTok visibility. Check admin permissions and try again.')
    } finally { setSavingToktokEnabled(false) }
  }
  async function saveDeliveryTiers(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const normalized = deliveryTiers.map((tier) => ({ min_order_total: Number(tier.min_order_total), fee: Number(tier.fee) })).sort((a, b) => a.min_order_total - b.min_order_total)
    if (!normalized.length || normalized.some((tier) => !Number.isFinite(tier.min_order_total) || tier.min_order_total < 0 || !Number.isFinite(tier.fee) || tier.fee < 0 || tier.min_order_total > 1000000 || tier.fee > 100000)) { setError('Enter valid minimum order totals and delivery prices. Values cannot be negative.'); return }
    if (normalized[0].min_order_total !== 0 || normalized.some((tier, index) => index > 0 && tier.min_order_total === normalized[index - 1].min_order_total)) { setError('The first range must start at EGP 0, and each minimum order total must be unique.'); return }
    setSavingDeliveryTiers(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const { error: saveError } = await supabase.from('toktok_settings').upsert({ setting_key: 'delivery_fee_tiers', setting_value: normalized, updated_by: authData.user?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
      if (saveError) throw saveError
      setSavedDeliveryTiers(normalized)
      setDeliveryTiers(normalized.map((tier) => ({ min_order_total: String(tier.min_order_total), fee: String(tier.fee) })))
      setNotice('TokTok delivery ranges saved. New orders will use the matching range; existing orders remain unchanged.')
    } catch (err) { console.error('TokTok delivery ranges save failed:', err); setError(err?.message || 'Could not save TokTok delivery ranges. Make sure you are signed in as an admin.') }
    finally { setSavingDeliveryTiers(false) }
  }

  function updateDeliveryTier(index, field, value) { setDeliveryTiers((current) => current.map((tier, i) => i === index ? { ...tier, [field]: value } : tier)) }
  function addDeliveryTier() { setDeliveryTiers((current) => [...current, { min_order_total: '', fee: '' }]) }
  function removeDeliveryTier(index) { setDeliveryTiers((current) => current.filter((_, i) => i !== index)) }

  async function saveCategory(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!categoryForm.store_id || !categoryForm.name.trim()) { setError('Choose a store and enter a category name.'); return }
    try {
      const payload = { store_id: categoryForm.store_id, name: categoryForm.name.trim(), description: (categoryForm.description || '').trim() || null, sort_order: Number(categoryForm.sort_order) || 0, is_active: categoryForm.id ? categoryForm.is_active : true }
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
      const { error: updateError } = await supabase
        .from('toktok_orders')
        .update(patch)
        .eq('id', order.id)
      if (updateError) throw updateError
      setNotice('Order ' + order.order_number + ' updated.')
      await refresh()
    } catch (err) {
      setError(err?.message || 'Could not update order. Check order-management permissions.')
    } finally {
      setBusyId('')
    }
  }

  async function confirmOrderPayment(order) {
    if (String(order.status || '').toLowerCase() === 'cancelled') {
      setError('A cancelled order cannot have its payment confirmed.')
      return
    }
    if (String(order.payment_status || '').toLowerCase() === 'confirmed') return
    if (!window.confirm('Confirm payment for order ' + order.order_number + '?')) return
    const currentStatus = String(order.status || 'pending').toLowerCase()
    await updateOrder(order, {
      payment_status: 'confirmed',
      status: currentStatus === 'pending' ? 'confirmed' : order.status,
    })
  }

  async function cancelOrder(order) {
    const currentStatus = String(order.status || '').toLowerCase()
    if (['delivered', 'completed', 'cancelled'].includes(currentStatus)) {
      setError('This order is already completed or cancelled and cannot be cancelled again.')
      return
    }
    const paymentStatus = String(order.payment_status || '').toLowerCase()
    const nextPaymentStatus = paymentStatus === 'confirmed' ? 'refunded' : 'pending'
    const prompt = paymentStatus === 'confirmed'
      ? 'Payment was confirmed. Cancel order ' + order.order_number + ' and mark payment as refunded?'
      : 'Cancel order ' + order.order_number + ' and reject its pending payment?'
    if (!window.confirm(prompt)) return
    await updateOrder(order, { status: 'cancelled', payment_status: nextPaymentStatus })
  }

  async function prepareAllPaidOrders() {
    setError('')
    setNotice('')
    setBusyId('prepare-all')
    try {
      const eligible = orders.filter((order) =>
        String(order.payment_status || '').toLowerCase() === 'confirmed' &&
        ['pending', 'confirmed'].includes(String(order.status || '').toLowerCase())
      )
      if (!eligible.length) {
        setNotice('No paid orders are waiting to be prepared.')
        return
      }
      const { error: prepareError } = await supabase
        .from('toktok_orders')
        .update({ status: 'preparing' })
        .in('id', eligible.map((order) => order.id))
      if (prepareError) throw prepareError
      setNotice(eligible.length + ' paid order(s) moved to Preparing.')
      await refresh()
    } catch (err) {
      setError(err?.message || 'Could not prepare the TokTok orders.')
    } finally {
      setBusyId('')
    }
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

  const costCoverageComplete = orderItems.length > 0 && orderItems.every((item) => item.unit_cost_snapshot !== null && item.unit_cost_snapshot !== undefined)
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
            <article className="toktok-admin-visibility-card"><span>👁️</span><small>Student home page</small><strong>{toktokEnabled ? 'TokTok is visible' : 'TokTok is hidden'}</strong><em>{toktokEnabled ? 'Students can open ANU TokTok' : 'Students will not see the TokTok entry'}</em><button type="button" onClick={toggleToktokVisibility} disabled={savingToktokEnabled} className={toktokEnabled ? 'is-enabled' : 'is-disabled'}>{savingToktokEnabled ? 'Saving…' : toktokEnabled ? 'Hide from students' : 'Show to students'}</button></article>
            <div className="toktok-admin-callout"><strong>Quick guide</strong><p>Use the tabs above to switch between TokTok stores, product availability, delivery batches, and incoming orders. Changes to availability are saved directly to the database.</p></div>
          </div>}

          {tab === 'stores' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok stores</h3><p>Control which stores are active and accepting orders.</p></div><div className="toktok-admin-heading-actions"><span>{stores.length} stores</span><button type="button" className="toktok-admin-add" onClick={openAddForm}>+ Add store</button></div></div><label className="toktok-admin-search">Search stores<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Store name or description…" /></label>
            {showAdd && tab === 'stores' && <form className="toktok-admin-form" onSubmit={addRecord}><h4>{editing ? 'Edit TokTok store' : 'Add a TokTok store'}</h4><label>Store name *<input name="name" value={form.name} onChange={updateForm} required placeholder="e.g. Campus Market" /></label><label>Store code *<input name="code" value={form.code} onChange={updateForm} required maxLength="12" placeholder="e.g. CM" /></label><label>Slug (optional)<input name="slug" value={form.slug} onChange={updateForm} placeholder="campus-market" /></label><label>Description<textarea name="description" value={form.description} onChange={updateForm} rows="2" /></label><div className="toktok-admin-store-image"><ImageUploader label="Store photo" folder="restaurant" value={form.image_url} onChange={(url) => setForm((current) => ({ ...current, image_url: url }))} shape="wide" /><p>الصورة بتتصغّر وبتتضغط تلقائيًا قبل الرفع.</p></div><label>Display order<input name="sort_order" type="number" value={form.sort_order} onChange={updateForm} /></label><div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save store'}</button></div></form>}
            {stores.length === 0 ? <p className="toktok-admin-empty">No TokTok stores found.</p> : <div className="toktok-admin-list">{stores.filter((store) => [store.name, store.slug, store.description].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))).map((store) => <article className="toktok-admin-row" key={store.id}><div className="toktok-admin-row-icon">{store.image_url ? <img src={store.image_url} alt="" /> : '🏪'}</div><div className="toktok-admin-row-main"><strong>{store.name}</strong><small className="toktok-admin-store-code">Code: {store.code || '—'}</small><small>{store.description || 'No description'}</small><div className="toktok-admin-pills"><span className={store.is_active ? 'on' : 'off'}>{store.is_active ? 'Active' : 'Inactive'}</span><span className={store.is_open ? 'on' : 'off'}>{store.is_open ? 'Open for orders' : 'Closed'}</span></div></div><div className="toktok-admin-row-actions"><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_active', store.is_active, 'Store status')} type="button">{store.is_active ? 'Deactivate' : 'Activate'}</button><button disabled={busyId === store.id} onClick={() => toggleRecord('toktok_stores', store.id, 'is_open', store.is_open, 'Store opening status')} type="button">{store.is_open ? 'Close store' : 'Open store'}</button><button disabled={busyId === store.id} onClick={() => openEditRecord('stores', store)} type="button">Edit</button><button disabled={busyId === store.id} onClick={() => deleteRecord('toktok_stores', store, 'store ' + store.name)} type="button">Delete</button></div></article>)}</div>}
          </div>}

          {tab === 'products' && <div className="toktok-admin-panel">
            <div className="toktok-admin-panel-heading">
              <div><h3>TokTok products</h3><p>Manage product details, pricing, photos and availability.</p></div>
              <div className="toktok-admin-heading-actions"><span>{selectedStoreId ? products.filter((product) => product.store_id === selectedStoreId).length + ' products' : 'Choose a store first'}</span><button type="button" className="toktok-admin-add" onClick={openAddForm} disabled={!selectedStoreId}>+ Add product</button></div>
            </div>
            <label className="toktok-admin-store-filter">Choose store to manage products *<select value={selectedStoreId} onChange={(e) => { setSelectedStoreId(e.target.value); setSearch(''); setShowAdd(false); setEditing(null); setError(''); setNotice('') }}><option value="">Select a TokTok store…</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
            {selectedStoreId && <label className="toktok-admin-search">Search products<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name or description…" /></label>}
            {showAdd && tab === 'products' && <form className="toktok-admin-form toktok-product-form" onSubmit={addRecord}>
              <h4>{editing ? 'Edit product' : 'Add a product'}</h4>
              <h5 className="toktok-product-selected-store">Store: {stores.find((store) => store.id === selectedStoreId)?.name || '—'}</h5>
              <label>Product name *<input name="name" value={form.name} onChange={updateForm} required placeholder="Enter product name" /></label>
              <div className="toktok-admin-form-grid">
                <label>Category<select name="category_id" value={form.category_id} onChange={updateForm}><option value="">No category</option>{categories.filter((c) => c.store_id === selectedStoreId && c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Selling price (EGP) *<input name="selling_price" type="number" min="0" step="0.01" value={form.selling_price} onChange={updateForm} required /></label>
                <label>Cost price (EGP)<input name="cost_price" type="number" min="0" step="0.01" value={form.cost_price} onChange={updateForm} /></label>
              </div>
              <label>Description<textarea name="description" value={form.description} onChange={updateForm} rows="3" placeholder="Describe the product…" /></label>
              <div className="toktok-admin-store-image toktok-product-image">
                <ImageUploader label="Product photo" folder="restaurant" value={form.image_url} onChange={(url) => setForm((current) => ({ ...current, image_url: url }))} shape="wide" />
                <p>Choose an image from your device. It will be compressed automatically before upload.</p>
              </div>
              <label>Display order<input name="sort_order" type="number" value={form.sort_order} onChange={updateForm} /></label>
              <div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save product'}</button></div>
            </form>}
            {!selectedStoreId ? <p className="toktok-admin-empty">Choose a TokTok store above to view and manage only its products.</p> : products.filter((product) => product.store_id === selectedStoreId).length === 0 ? <p className="toktok-admin-empty">No products found for this store yet. Use “Add product” to create the first one.</p> : <div className="toktok-product-grid">
              {products.filter((product) => product.store_id === selectedStoreId && [product.name, product.description, categories.find((category) => category.id === product.category_id)?.name].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))).map((product) => <article className="toktok-product-card" key={product.id}>
                <div className="toktok-product-card-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span>🍽️</span>}<span className={product.is_available ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{product.is_available ? 'Available' : 'Unavailable'}</span></div>
                <div className="toktok-product-card-body"><small className="toktok-product-store">{stores.find((store) => store.id === product.store_id)?.name || 'No store'}{categories.find((category) => category.id === product.category_id)?.name ? ' · ' + categories.find((category) => category.id === product.category_id)?.name : ''}</small><h4>{product.name}</h4><p>{product.description || 'No description added.'}</p><div className="toktok-product-prices"><strong>{money(product.selling_price)}</strong>{product.cost_price != null && <small>Cost {money(product.cost_price)}</small>}</div><div className="toktok-product-actions"><button type="button" onClick={() => openEditRecord('products', product)}>Edit</button><button type="button" disabled={busyId === product.id} onClick={() => toggleRecord('toktok_products', product.id, 'is_available', product.is_available, 'Product availability')}>{product.is_available ? 'Disable' : 'Enable'}</button><button type="button" className="danger" disabled={busyId === product.id} onClick={() => deleteRecord('toktok_products', product, 'product ' + product.name)}>Delete</button></div></div>
              </article>)}
            </div>}
          </div>}
          {tab === 'delivery-fee' && <div className="toktok-admin-panel toktok-delivery-fee-panel">
            <div className="toktok-admin-panel-heading"><div><h3>TokTok delivery price ranges</h3><p>Set delivery fees based on the items subtotal, just like Mosquito. This configuration is TokTok-only.</p></div><span className="toktok-admin-status on">TokTok only</span></div>
            <div className="toktok-delivery-fee-summary"><span className="toktok-delivery-fee-icon">🛺</span><div><small>Configured ranges</small><strong>{savedDeliveryTiers.length} ranges</strong><p>The matching range is selected automatically for each new order.</p></div></div>
            <form className="toktok-admin-form toktok-delivery-fee-form" onSubmit={saveDeliveryTiers}>
              <div className="toktok-delivery-tiers-heading"><strong>Order subtotal range rules</strong><span>EGP</span></div>
              {deliveryTiers.map((tier, index) => <div className="toktok-delivery-tier-row" key={index}>
                <label>Minimum order subtotal<input aria-label={'Minimum order subtotal for range ' + (index + 1)} type="number" min="0" max="1000000" step="0.01" value={tier.min_order_total} onChange={(event) => updateDeliveryTier(index, 'min_order_total', event.target.value)} required /></label>
                <label>Delivery fee<input aria-label={'Delivery fee for range ' + (index + 1)} type="number" min="0" max="100000" step="0.01" value={tier.fee} onChange={(event) => updateDeliveryTier(index, 'fee', event.target.value)} required /></label>
                <button type="button" className="toktok-tier-remove" disabled={deliveryTiers.length <= 1} onClick={() => removeDeliveryTier(index)}>Remove</button>
              </div>)}
              <button type="button" className="toktok-tier-add" onClick={addDeliveryTier}>+ Add range</button>
              <p className="toktok-delivery-fee-note">Each minimum marks where that fee starts and continues until the next minimum. The first range must start at EGP 0. New orders only; existing orders are unchanged.</p>
              <div className="toktok-delivery-tiers-preview"><strong>Current rules</strong>{savedDeliveryTiers.map((tier, index) => <div key={index}><span>{money(tier.min_order_total)}{index + 1 < savedDeliveryTiers.length ? ' and above until ' + money(savedDeliveryTiers[index + 1].min_order_total) : ' and above'}</span><strong>{money(tier.fee)}</strong></div>)}</div>
              <div className="toktok-admin-form-actions"><button type="button" disabled={savingDeliveryTiers} onClick={() => setDeliveryTiers(savedDeliveryTiers.map((tier) => ({ min_order_total: String(tier.min_order_total), fee: String(tier.fee) })))}>Reset</button><button type="submit" disabled={savingDeliveryTiers}>{savingDeliveryTiers ? 'Saving…' : 'Save delivery ranges'}</button></div>
            </form>
          </div>}

          {tab === 'batches' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>Delivery batches</h3><p>Review batch timings and turn batches on or off.</p></div><div className="toktok-admin-heading-actions"><span>{batches.length} batches</span><button type="button" className="toktok-admin-add" onClick={openAddForm} disabled={stores.length === 0}>+ Add batch</button></div></div><label className="toktok-admin-search">Search batches<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Store, status or date…" /></label>
            {showAdd && tab === 'batches' && <form className="toktok-admin-form" onSubmit={addRecord}><h4>{editing ? 'Edit delivery batch' : 'Create a delivery batch'}</h4><label>Store *<select name="store_id" value={form.store_id} onChange={updateForm} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><div className="toktok-admin-form-grid"><label>Registration opens *<input type="datetime-local" name="registration_start" value={form.registration_start} onChange={updateForm} required /></label><label>Registration closes *<input type="datetime-local" name="registration_end" value={form.registration_end} onChange={updateForm} required /></label><label>Delivery time *<input type="datetime-local" name="delivery_time" value={form.delivery_time} onChange={updateForm} required /></label><label>Order capacity<input type="number" min="1" step="1" name="capacity" value={form.capacity} onChange={updateForm} /></label></div><div className="toktok-admin-form-actions"><button type="button" onClick={() => {setShowAdd(false);setEditing(null)}}>Cancel</button><button type="submit">{editing ? 'Save changes' : 'Save batch'}</button></div></form>}
            {batches.length === 0 ? <p className="toktok-admin-empty">No TokTok batches found.</p> : <div className="toktok-admin-table-wrap"><table className="toktok-admin-table"><thead><tr><th>Store</th><th>Delivery time</th><th>Registration ends</th><th>Capacity</th><th>Status</th><th>Action</th></tr></thead><tbody>{batches.filter((batch) => [stores.find((store) => store.id === batch.store_id)?.name, batch.is_active ? 'active' : 'inactive', batch.delivery_time].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))).map((batch) => <tr key={batch.id}><td>{stores.find((store) => store.id === batch.store_id)?.name || '—'}</td><td>{batch.delivery_time ? new Date(batch.delivery_time).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.registration_end ? new Date(batch.registration_end).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td>{batch.capacity ?? '—'}</td><td><span className={batch.is_active ? 'toktok-admin-status on' : 'toktok-admin-status off'}>{batch.is_active ? 'Active' : 'Inactive'}</span></td><td><button className="toktok-admin-action" disabled={busyId === batch.id} onClick={() => toggleRecord('toktok_batches', batch.id, 'is_active', batch.is_active, 'Batch status')} type="button">{batch.is_active ? 'Deactivate' : 'Activate'}</button> <button className="toktok-admin-action" onClick={() => openEditRecord('batches', batch)} type="button">Edit</button> <button className="toktok-admin-action" disabled={busyId === batch.id} onClick={() => deleteRecord('toktok_batches', batch, 'delivery batch')} type="button">Delete</button></td></tr>)}</tbody></table></div>}
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
            <article><span>📉</span><small>Product cost snapshots</small><strong>{money(orderItems.reduce((sum, item) => sum + Number(item.unit_cost_snapshot || 0) * Number(item.quantity || 0), 0))}</strong><em>For loaded orders only</em></article>
            <article><span>📈</span><small>Product gross margin</small><strong>{costCoverageComplete ? money(orders.reduce((sum, order) => sum + Number(order.items_subtotal || 0), 0) - orderItems.reduce((sum, item) => sum + Number(item.unit_cost_snapshot || 0) * Number(item.quantity || 0), 0)) : 'Incomplete'}</strong><em>{costCoverageComplete ? 'Before driver costs, discounts and other expenses' : 'Missing historical product cost snapshots'}</em></article>
            <article><span>📋</span><small>Orders loaded</small><strong>{orders.length}</strong><em>Latest orders only</em></article>
            <div className="toktok-admin-callout"><strong>Net profit still needs driver-cost history</strong><p>Product gross margin uses cost snapshots saved on TokTok order items. Net profit is not shown because driver costs are not currently saved as a historical per-order snapshot. Totals cover the latest loaded orders, not lifetime figures.</p></div>
          </div>}

          {tab === 'orders' && <div className="toktok-admin-panel"><div className="toktok-admin-panel-heading"><div><h3>TokTok orders & payment review</h3><p>Review proof, confirm or cancel orders, contact students, and prepare paid orders.</p></div><span>{orders.length} recent orders</span></div>
            <div className="toktok-admin-order-toolbar">
              <label className="toktok-admin-search">Search orders<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, student, or store…" /></label>
              <label className="toktok-admin-order-filter">Order status<select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}><option value="all">All statuses</option>{['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="toktok-admin-order-filter">Payment<select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}><option value="all">All payments</option>{['pending', 'confirmed', 'refunded', 'failed'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <button className="toktok-admin-action" type="button" onClick={prepareAllPaidOrders} disabled={busyId !== ''}>🧾 Mark paid orders as Preparing</button>
              <button className="toktok-admin-action" type="button" onClick={refresh} disabled={busyId !== '' || loading}>↻ Refresh</button>
            </div>
            <div className="toktok-admin-order-summary">
              <div><span>All loaded</span><strong>{orders.length}</strong></div>
              <div><span>Needs attention</span><strong>{orders.filter((order) => String(order.payment_status || 'pending').toLowerCase() === 'pending' || ['pending', 'confirmed'].includes(String(order.status || 'pending').toLowerCase())).length}</strong></div>
              <div><span>Preparing</span><strong>{orders.filter((order) => String(order.status || '').toLowerCase() === 'preparing').length}</strong></div>
              <div><span>Completed</span><strong>{orders.filter((order) => ['delivered', 'completed'].includes(String(order.status || '').toLowerCase())).length}</strong></div>
            </div>
            {orders.length === 0 ? <p className="toktok-admin-empty">No TokTok orders found.</p> : <div className="toktok-admin-order-cards">{orders.filter((order) => {
              const query = search.trim().toLowerCase()
              const matchesSearch = !query || [order.order_number, order.student_name_snapshot, order.student_phone_snapshot, order.store_name_snapshot, order.status, order.payment_status, order.payment_method_snapshot].some((value) => String(value || '').toLowerCase().includes(query))
              const matchesOrderStatus = orderStatusFilter === 'all' || String(order.status || 'pending').toLowerCase() === orderStatusFilter
              const matchesPaymentStatus = paymentStatusFilter === 'all' || String(order.payment_status || 'pending').toLowerCase() === paymentStatusFilter
              return matchesSearch && matchesOrderStatus && matchesPaymentStatus
            }).map((order) => <article className="toktok-admin-order-card" key={order.id}>
              <div className="toktok-admin-order-top"><div><strong>{order.order_number || String(order.id).slice(0, 8)}</strong><small>{order.store_name_snapshot || 'TokTok order'} · {new Date(order.created_at).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })}</small><div className="toktok-admin-order-badges"><span className={'order-badge status-' + String(order.status || 'pending').toLowerCase().replaceAll('_', '-')}>{String(order.status || 'pending').replaceAll('_', ' ')}</span><span className={'order-badge payment-' + String(order.payment_status || 'pending').toLowerCase()}>{String(order.payment_status || 'pending').toLowerCase() === 'pending' ? 'Payment under confirmation' : 'Payment: ' + String(order.payment_status || 'pending')}</span></div></div><strong className="toktok-admin-order-total">{money(order.total_amount)}</strong></div>
              <div className="toktok-admin-order-meta"><span><small>Student</small><b>{order.student_name_snapshot || '—'}</b></span><span><small>Phone</small><b>{order.student_phone_snapshot || '—'}</b></span><span><small>Payment method</small><b>{order.payment_method_snapshot || 'Not specified'}</b></span><span><small>Delivery batch</small><b>{order.batch_time_snapshot ? new Date(order.batch_time_snapshot).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : batches.find((batch) => batch.id === order.batch_id) ? new Date(batches.find((batch) => batch.id === order.batch_id).delivery_time).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</b></span></div>
              <div className="toktok-admin-order-items"><strong>Order items</strong><p>{orderItems.filter((item) => item.order_id === order.id).map((item) => item.product_name_snapshot + ' × ' + item.quantity).join(', ') || '—'}</p><small>Items: {orderItems.filter((item) => item.order_id === order.id).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</small></div>
              <div className="toktok-admin-proof">{order.payment_proof_signed_url ? <button type="button" onClick={() => setPaymentProofPreview({ url: order.payment_proof_signed_url, orderNumber: order.order_number || String(order.id).slice(0, 8) })}>View payment proof <span>↗</span></button> : <span>{order.payment_proof_url ? 'Payment proof unavailable (permissions)' : 'No payment proof uploaded'}</span>}</div>
              <div className="toktok-admin-order-actions">
                <button type="button" onClick={() => confirmOrderPayment(order)} disabled={busyId === order.id || String(order.payment_status || '').toLowerCase() === 'confirmed' || String(order.status || '').toLowerCase() === 'cancelled'}>✓ Confirm payment</button>
                <button type="button" onClick={() => cancelOrder(order)} disabled={busyId === order.id || ['delivered', 'completed', 'cancelled'].includes(String(order.status || '').toLowerCase())}>✕ Cancel order</button>
                {order.student_phone_snapshot && <a href={'https://wa.me/' + (String(order.student_phone_snapshot).replace(/\\D/g, '').startsWith('0') ? '2' + String(order.student_phone_snapshot).replace(/\\D/g, '') : String(order.student_phone_snapshot).replace(/\\D/g, ''))} target="_blank" rel="noreferrer">Contact student ↗</a>}

              </div>
            </article>)}</div>}
          </div>}
        </>
      )}
      {paymentProofPreview && <div className="toktok-payment-preview-backdrop" role="presentation" onClick={() => setPaymentProofPreview(null)}>
        <div className="toktok-payment-preview" role="dialog" aria-modal="true" aria-label={'Payment proof for order ' + paymentProofPreview.orderNumber} onClick={(event) => event.stopPropagation()}>
          <div className="toktok-payment-preview-heading"><div><strong>Payment proof</strong><small>Order {paymentProofPreview.orderNumber}</small></div><button type="button" aria-label="Close payment proof" onClick={() => setPaymentProofPreview(null)}>✕</button></div>
          <img src={paymentProofPreview.url} alt={'Payment proof for order ' + paymentProofPreview.orderNumber} />
        </div>
      </div>}
    </section>
  )
}

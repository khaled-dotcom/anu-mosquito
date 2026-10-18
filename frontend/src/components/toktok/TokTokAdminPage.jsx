import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import './TokTokAdminPage.css'

const money = (value) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(Number(value || 0))
const blankStore = { name: '', slug: '', description: '', image_url: '', is_active: false, is_open: false, sort_order: 0 }
const blankProduct = { name: '', description: '', image_url: '', selling_price: '', cost_price: '', stock_quantity: '', category_id: '', is_available: true, sort_order: 0 }
const blankCategory = { name: '', description: '', sort_order: 0, is_active: true }
const blankBatch = { registration_start: '', registration_end: '', delivery_time: '', capacity: '', is_active: true }

export default function TokTokAdminPage() {
  const [tab, setTab] = useState('stores')
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [orders, setOrders] = useState([])
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [storeForm, setStoreForm] = useState(blankStore)
  const [categoryForm, setCategoryForm] = useState(blankCategory)
  const [productForm, setProductForm] = useState(blankProduct)
  const [batchForm, setBatchForm] = useState(blankBatch)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [storeRes, orderRes, feeRes] = await Promise.all([
      supabase.from('toktok_stores').select('*').order('sort_order').order('name'),
      supabase.from('toktok_orders').select('id,order_number,order_date,student_name_snapshot,student_phone_snapshot,store_name_snapshot,delivery_address,delivery_fee,items_subtotal,total_amount,payment_status,status,notes,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('toktok_settings').select('setting_value').eq('setting_key', 'delivery_fee').maybeSingle(),
    ])
    if (storeRes.error) setError('Could not load TokTok data. Check the TokTok admin RLS policies.')
    const safeStores = storeRes.data || []
    setStores(safeStores)
    setStoreId((current) => safeStores.some((s) => s.id === current) ? current : (safeStores[0]?.id || ''))
    if (orderRes.error) setError((current) => current || 'Orders could not be loaded with current permissions.')
    else setOrders(orderRes.data || [])
    if (!feeRes.error && feeRes.data?.setting_value != null) setDeliveryFee(String(feeRes.data.setting_value?.amount ?? feeRes.data.setting_value))
    setLoading(false)
  }, [])

  const loadStoreData = useCallback(async (id) => {
    if (!id) { setCategories([]); setProducts([]); setBatches([]); return }
    const [c, p, b] = await Promise.all([
      supabase.from('toktok_categories').select('*').eq('store_id', id).order('sort_order'),
      supabase.from('toktok_products').select('*').eq('store_id', id).order('sort_order'),
      supabase.from('toktok_batches').select('*').eq('store_id', id).order('delivery_time', { ascending: false }),
    ])
    if (c.error || p.error || b.error) setError('Some store settings could not be loaded. Check TokTok admin policies.')
    setCategories(c.data || [])
    setProducts(p.data || [])
    setBatches(b.data || [])
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadStoreData(storeId) }, [storeId, loadStoreData])

  function beginEdit(kind, row) {
    setEditing({ kind, id: row.id })
    if (kind === 'store') setStoreForm({ ...blankStore, ...row })
    if (kind === 'category') setCategoryForm({ ...blankCategory, ...row })
    if (kind === 'product') setProductForm({ ...blankProduct, ...row, selling_price: String(row.selling_price), cost_price: row.cost_price == null ? '' : String(row.cost_price), stock_quantity: row.stock_quantity == null ? '' : String(row.stock_quantity) })
    if (kind === 'batch') setBatchForm({ ...blankBatch, ...row, registration_start: row.registration_start?.slice(0, 16) || '', registration_end: row.registration_end?.slice(0, 16) || '', delivery_time: row.delivery_time?.slice(0, 16) || '', capacity: row.capacity == null ? '' : String(row.capacity) })
  }

  function resetForms() {
    setEditing(null); setStoreForm(blankStore); setCategoryForm(blankCategory); setProductForm(blankProduct); setBatchForm(blankBatch)
  }

  async function saveRow(table, form, kind) {
    setSaving(true); setError(''); setMessage('')
    let payload = { ...form }
    if (kind === 'store') {
      payload.name = payload.name.trim()
      payload.slug = (payload.slug.trim() || payload.name.toLowerCase()).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      payload.sort_order = Number(payload.sort_order || 0)
    }
    if (kind === 'category') payload = { ...payload, store_id: storeId, name: payload.name.trim(), sort_order: Number(payload.sort_order || 0) }
    if (kind === 'product') payload = { ...payload, store_id: storeId, category_id: payload.category_id || null, name: payload.name.trim(), selling_price: Number(payload.selling_price), cost_price: payload.cost_price === '' ? null : Number(payload.cost_price), stock_quantity: payload.stock_quantity === '' ? null : Number(payload.stock_quantity), sort_order: Number(payload.sort_order || 0) }
    if (kind === 'batch') payload = { ...payload, store_id: storeId, registration_start: new Date(payload.registration_start).toISOString(), registration_end: new Date(payload.registration_end).toISOString(), delivery_time: new Date(payload.delivery_time).toISOString(), capacity: payload.capacity === '' ? null : Number(payload.capacity) }
    const query = editing?.kind === kind ? supabase.from(table).update(payload).eq('id', editing.id) : supabase.from(table).insert(payload)
    const { error: saveError } = await query
    setSaving(false)
    if (saveError) { setError(saveError.message || 'Save failed.'); return }
    setMessage('Saved successfully.')
    resetForms()
    if (kind === 'store') await load()
    else await loadStoreData(storeId)
  }

  async function removeRow(table, row, label) {
    if (!window.confirm(`Delete ${label}? This action may be blocked if related records exist.`)) return
    setError(''); setMessage('')
    const { error: deleteError } = await supabase.from(table).delete().eq('id', row.id)
    if (deleteError) setError(deleteError.message)
    else { setMessage('Deleted.'); if (table === 'toktok_stores') await load(); else await loadStoreData(storeId) }
  }

  async function toggleStore(store, field) {
    setError(''); setMessage('')
    const { error: updateError } = await supabase.from('toktok_stores').update({ [field]: !store[field] }).eq('id', store.id)
    if (updateError) setError(updateError.message)
    else { setMessage('Store updated.'); await load() }
  }

  async function saveFee(event) {
    event.preventDefault()
    const amount = Number(deliveryFee)
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid non-negative delivery fee.'); return }
    setSaving(true); setError(''); setMessage('')
    const { data: userData } = await supabase.auth.getUser()
    const { error: feeError } = await supabase.from('toktok_settings').upsert({ setting_key: 'delivery_fee', setting_value: { amount }, updated_by: userData.user?.id }, { onConflict: 'setting_key' })
    setSaving(false)
    if (feeError) setError(feeError.message)
    else setMessage('Delivery fee saved.')
  }

  const field = (label, value, onChange, props = {}) => <label className="toktok-admin-field">{label}<input value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} /></label>
  const checkbox = (label, value, onChange) => <label className="toktok-admin-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  const editButton = (kind, row) => <button type="button" className="tt-admin-small" onClick={() => beginEdit(kind, row)}>Edit</button>
  const deleteButton = (table, row, label) => <button type="button" className="tt-admin-small danger" onClick={() => removeRow(table, row, label)}>Delete</button>

  return <div className="toktok-admin-page">
    <header className="toktok-admin-head"><div><span>🛺 ANU TOKTOK</span><h1>TokTok Management</h1><p>Separate management workspace. Mosquito restaurant settings are not changed here.</p></div><button className="tt-admin-refresh" onClick={() => { load(); loadStoreData(storeId) }} type="button">Refresh data</button></header>
    {error && <p className="tt-admin-message error" role="alert">{error}</p>}
    {message && <p className="tt-admin-message success" role="status">{message}</p>}
    <nav className="tt-admin-tabs">{[['stores','Stores'],['categories','Categories'],['products','Products'],['batches','Delivery batches'],['orders','Orders'],['settings','Settings']].map(([key,label]) => <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => { setTab(key); resetForms() }}>{label}</button>)}</nav>
    {loading ? <div className="tt-admin-empty">Loading TokTok management…</div> : <>
      {tab === 'stores' && <section className="tt-admin-panel"><div className="tt-admin-section-head"><h2>Stores</h2><button type="button" className="tt-admin-primary" onClick={() => { resetForms(); setEditing({ kind: 'store', id: null }) }}>+ Add store</button></div>
        <div className="tt-admin-list">{stores.map((s) => <article className="tt-admin-card" key={s.id}><div><strong>{s.name}</strong><small>{s.slug} · {s.is_open ? 'Open' : 'Closed'} · {s.is_active ? 'Active' : 'Inactive'}</small><p>{s.description}</p></div><div className="tt-admin-actions">{editButton('store',s)}<button className="tt-admin-small" type="button" onClick={() => toggleStore(s,'is_open')}>{s.is_open ? 'Close' : 'Open'}</button><button className="tt-admin-small" type="button" onClick={() => toggleStore(s,'is_active')}>{s.is_active ? 'Deactivate' : 'Activate'}</button>{deleteButton('toktok_stores',s,s.name)}</div></article>)}</div>
        {editing?.kind === 'store' && <form className="tt-admin-form" onSubmit={(e) => { e.preventDefault(); saveRow('toktok_stores',storeForm,'store') }}><h3>{editing.id ? 'Edit store' : 'New store'}</h3>{field('Store name',storeForm.name,v=>setStoreForm({...storeForm,name:v}),{required:true,maxLength:100})}{field('Slug (unique)',storeForm.slug,v=>setStoreForm({...storeForm,slug:v}),{maxLength:100})}{field('Description',storeForm.description,v=>setStoreForm({...storeForm,description:v}),{maxLength:500})}{field('Image URL',storeForm.image_url,v=>setStoreForm({...storeForm,image_url:v}),{type:'url'})}{field('Sort order',storeForm.sort_order,v=>setStoreForm({...storeForm,sort_order:v}),{type:'number',min:0})}{checkbox('Active',storeForm.is_active,v=>setStoreForm({...storeForm,is_active:v}))}{checkbox('Open for orders',storeForm.is_open,v=>setStoreForm({...storeForm,is_open:v}))}<FormButtons saving={saving} cancel={resetForms}/></form>}
      </section>}
      {tab !== 'stores' && tab !== 'settings' && tab !== 'orders' && <div className="tt-admin-store-select"><label>Store<select value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">Select store</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
      {tab === 'categories' && <section className="tt-admin-panel"><div className="tt-admin-section-head"><h2>Categories</h2><button type="button" className="tt-admin-primary" disabled={!storeId} onClick={() => { resetForms(); setEditing({kind:'category',id:null}) }}>+ Add category</button></div><div className="tt-admin-list">{categories.map(c => <article className="tt-admin-card" key={c.id}><div><strong>{c.name}</strong><small>{c.is_active ? 'Active' : 'Inactive'} · order {c.sort_order}</small></div><div className="tt-admin-actions">{editButton('category',c)}{deleteButton('toktok_categories',c,c.name)}</div></article>)}</div>{editing?.kind === 'category' && <form className="tt-admin-form" onSubmit={e=>{e.preventDefault();saveRow('toktok_categories',categoryForm,'category')}}><h3>{editing.id ? 'Edit category' : 'New category'}</h3>{field('Name',categoryForm.name,v=>setCategoryForm({...categoryForm,name:v}),{required:true})}{field('Description',categoryForm.description,v=>setCategoryForm({...categoryForm,description:v}))}{field('Sort order',categoryForm.sort_order,v=>setCategoryForm({...categoryForm,sort_order:v}),{type:'number',min:0})}{checkbox('Active',categoryForm.is_active,v=>setCategoryForm({...categoryForm,is_active:v}))}<FormButtons saving={saving} cancel={resetForms}/></form>}</section>}
      {tab === 'products' && <section className="tt-admin-panel"><div className="tt-admin-section-head"><h2>Products</h2><button type="button" className="tt-admin-primary" disabled={!storeId} onClick={()=>{resetForms();setEditing({kind:'product',id:null})}}>+ Add product</button></div><div className="tt-admin-list">{products.map(p=><article className="tt-admin-card" key={p.id}><div><strong>{p.name}</strong><small>{money(p.selling_price)} · {p.stock_quantity == null ? 'Unlimited stock' : `Stock: ${p.stock_quantity}`} · {p.is_available ? 'Available' : 'Hidden'}</small><p>{p.description}</p></div><div className="tt-admin-actions">{editButton('product',p)}{deleteButton('toktok_products',p,p.name)}</div></article>)}</div>{editing?.kind === 'product' && <form className="tt-admin-form" onSubmit={e=>{e.preventDefault();saveRow('toktok_products',productForm,'product')}}><h3>{editing.id ? 'Edit product' : 'New product'}</h3>{field('Name',productForm.name,v=>setProductForm({...productForm,name:v}),{required:true})}{field('Description',productForm.description,v=>setProductForm({...productForm,description:v}))}{field('Image URL',productForm.image_url,v=>setProductForm({...productForm,image_url:v}),{type:'url'})}<label className="toktok-admin-field">Category<select value={productForm.category_id} onChange={e=>setProductForm({...productForm,category_id:e.target.value})}><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{field('Selling price (EGP)',productForm.selling_price,v=>setProductForm({...productForm,selling_price:v}),{type:'number',min:0,step:'0.01',required:true})}{field('Cost price (EGP)',productForm.cost_price,v=>setProductForm({...productForm,cost_price:v}),{type:'number',min:0,step:'0.01'})}{field('Stock quantity (blank = unlimited)',productForm.stock_quantity,v=>setProductForm({...productForm,stock_quantity:v}),{type:'number',min:0,step:1})}{field('Sort order',productForm.sort_order,v=>setProductForm({...productForm,sort_order:v}),{type:'number',min:0})}{checkbox('Available for ordering',productForm.is_available,v=>setProductForm({...productForm,is_available:v}))}<FormButtons saving={saving} cancel={resetForms}/></form>}</section>}
      {tab === 'batches' && <section className="tt-admin-panel"><div className="tt-admin-section-head"><h2>Delivery batches</h2><button type="button" className="tt-admin-primary" disabled={!storeId} onClick={()=>{resetForms();setEditing({kind:'batch',id:null})}}>+ Add batch</button></div><div className="tt-admin-list">{batches.map(b=><article className="tt-admin-card" key={b.id}><div><strong>{new Date(b.delivery_time).toLocaleString('en-EG',{dateStyle:'medium',timeStyle:'short'})}</strong><small>Registration: {new Date(b.registration_start).toLocaleString()} – {new Date(b.registration_end).toLocaleString()}</small><p>{b.capacity == null ? 'No capacity limit' : `Capacity: ${b.capacity}`} · {b.is_active ? 'Active' : 'Inactive'}</p></div><div className="tt-admin-actions">{editButton('batch',b)}{deleteButton('toktok_batches',b,'delivery batch')}</div></article>)}</div>{editing?.kind === 'batch' && <form className="tt-admin-form" onSubmit={e=>{e.preventDefault();saveRow('toktok_batches',batchForm,'batch')}}><h3>{editing.id ? 'Edit batch' : 'New batch'}</h3>{field('Registration opens',batchForm.registration_start,v=>setBatchForm({...batchForm,registration_start:v}),{type:'datetime-local',required:true})}{field('Registration closes',batchForm.registration_end,v=>setBatchForm({...batchForm,registration_end:v}),{type:'datetime-local',required:true})}{field('Delivery time',batchForm.delivery_time,v=>setBatchForm({...batchForm,delivery_time:v}),{type:'datetime-local',required:true})}{field('Capacity (blank = unlimited)',batchForm.capacity,v=>setBatchForm({...batchForm,capacity:v}),{type:'number',min:1,step:1})}{checkbox('Active',batchForm.is_active,v=>setBatchForm({...batchForm,is_active:v}))}<FormButtons saving={saving} cancel={resetForms}/></form>}</section>}
      {tab === 'orders' && <section className="tt-admin-panel"><div className="tt-admin-section-head"><h2>Recent TokTok orders</h2><span className="tt-admin-muted">Latest 100 · read-only in this iteration</span></div>{orders.length===0 ? <div className="tt-admin-empty">No orders yet, or orders are not readable with the current policy.</div> : <div className="tt-admin-table-wrap"><table className="tt-admin-table"><thead><tr><th>Order</th><th>Student</th><th>Store</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.order_number}</strong><small>{o.order_date}</small></td><td>{o.student_name_snapshot || 'Student'}<small>{o.student_phone_snapshot || ''}</small></td><td>{o.store_name_snapshot}</td><td>{money(o.total_amount)}<small>Items {money(o.items_subtotal)} + delivery {money(o.delivery_fee)}</small></td><td><span className="tt-admin-status">{o.status}</span><small>Payment: {o.payment_status}</small></td><td>{new Date(o.created_at).toLocaleString('en-EG')}</td></tr>)}</tbody></table></div>}</section>}
      {tab === 'settings' && <section className="tt-admin-panel"><h2>TokTok settings</h2><form className="tt-admin-form" onSubmit={saveFee}>{field('Delivery fee (EGP)',deliveryFee,setDeliveryFee,{type:'number',min:0,step:'0.01',required:true})}<p className="tt-admin-muted">Applied by the server when a new TokTok order is placed. Existing orders keep their saved fee.</p><button className="tt-admin-primary" type="submit" disabled={saving}>{saving?'Saving…':'Save delivery fee'}</button></form></section>}
    </>}
  </div>
}

function FormButtons({ saving, cancel }) {
  return <div className="tt-admin-form-actions"><button type="submit" className="tt-admin-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button><button type="button" className="tt-admin-small" onClick={cancel}>Cancel</button></div>
}

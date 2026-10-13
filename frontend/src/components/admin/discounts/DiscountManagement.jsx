import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabase'
import './DiscountManagement.css'

const EMPTY_FORM = {
  code: '',
  discount_type: 'PERCENTAGE',
  value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  usage_limit: '',
  usage_per_student: '',
  starts_at: '',
  expires_at: '',
  target_type: 'ALL',
  target_team_id: '',
  target_restaurant_id: '',
  is_active: false,
}

function DiscountManagement() {
  const [discounts, setDiscounts] = useState([])
  const [teams, setTeams] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [usageRows, setUsageRows] = useState([])
  const [usageDetails, setUsageDetails] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    const [discountResult, teamResult, restaurantResult, usageResult] = await Promise.all([
      supabase.from('discounts').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('id,name,is_active').order('name'),
      supabase.from('restaurants').select('id,name,is_active').order('name'),
      supabase.from('discount_usages').select('*').order('used_at', { ascending: false }),
    ])

    if (discountResult.error) {
      alert(discountResult.error.message)
    } else {
      setDiscounts(discountResult.data || [])
    }

    if (!teamResult.error) setTeams(teamResult.data || [])
    if (!restaurantResult.error) setRestaurants(restaurantResult.data || [])
    if (usageResult.error) alert('Could not load discount usage statistics: ' + usageResult.error.message)
    else setUsageRows(usageResult.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const usageStats = useMemo(() => {
    const stats = new Map()
    for (const row of usageRows) {
      const current = stats.get(row.discount_id) || { count: 0, total: 0, students: new Set() }
      current.count += 1
      current.total += Number(row.discount_amount || 0)
      current.students.add(row.student_id)
      stats.set(row.discount_id, current)
    }
    return stats
  }, [usageRows])

  const filteredDiscounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return discounts

    return discounts.filter((discount) =>
      discount.code?.toLowerCase().includes(query)
    )
  }, [discounts, search])

  function openCreate() {
    setEditingDiscount(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(discount) {
    setEditingDiscount(discount)
    setForm({
      code: discount.code || '',
      discount_type: discount.discount_type || 'PERCENTAGE',
      value: discount.value ?? '',
      min_order_amount: discount.min_order_amount ?? '0',
      max_discount_amount: discount.max_discount_amount ?? '',
      usage_limit: discount.usage_limit ?? '',
      usage_per_student: discount.usage_per_student ?? '',
      starts_at: discount.starts_at ? discount.starts_at.slice(0, 16) : '',
      expires_at: discount.expires_at ? discount.expires_at.slice(0, 16) : '',
      target_type: discount.target_type || 'ALL',
      target_team_id: discount.target_team_id || '',
      target_restaurant_id: discount.target_restaurant_id || '',
      is_active: discount.is_active,
    })
    setShowForm(true)
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveDiscount() {
    const code = form.code.trim().toUpperCase()
    const value = Number(form.value)

    if (!code) return alert('Discount code is required.')
    if (!/^[A-Z0-9_-]+$/.test(code)) return alert('Use only A-Z, 0-9, underscore or hyphen.')
    if (!Number.isFinite(value) || value <= 0) return alert('Discount value must be greater than 0.')
    if (form.discount_type === 'PERCENTAGE' && value > 100) return alert('Percentage cannot exceed 100.')
    if (form.target_type === 'TEAM' && !form.target_team_id) return alert('Select a team.')
    if (form.target_type === 'RESTAURANT' && !form.target_restaurant_id) return alert('Select a restaurant.')

    setSaving(true)

    const payload = {
      code,
      discount_type: form.discount_type,
      value,
      min_order_amount: Number(form.min_order_amount || 0),
      max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      usage_per_student: form.usage_per_student === '' ? null : Number(form.usage_per_student),
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      target_type: form.target_type,
      target_team_id: form.target_type === 'TEAM' ? form.target_team_id : null,
      target_restaurant_id: form.target_type === 'RESTAURANT' ? form.target_restaurant_id : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    const result = editingDiscount
      ? await supabase.from('discounts').update(payload).eq('id', editingDiscount.id).select().single()
      : await supabase.from('discounts').insert(payload).select().single()

    setSaving(false)

    if (result.error) return alert(result.error.message)

    setDiscounts((current) => {
      if (editingDiscount) return current.map((item) => item.id === result.data.id ? result.data : item)
      return [result.data, ...current]
    })

    setShowForm(false)
  }

  async function openUsageDetails(discount) {
    setUsageLoading(true)
    setUsageDetails({ discount, rows: [] })
    const rows = usageRows.filter((row) => row.discount_id === discount.id)
    const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))]
    const orderIds = [...new Set(rows.map((row) => row.order_id).filter(Boolean))]
    const [studentsResult, ordersResult] = await Promise.all([
      studentIds.length ? supabase.from('profiles').select('id,full_name,university_id').in('id', studentIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? supabase.from('orders').select('id,order_number,total_amount,created_at').in('id', orderIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (studentsResult.error || ordersResult.error) {
      setUsageLoading(false)
      return alert(studentsResult.error?.message || ordersResult.error?.message)
    }
    const students = new Map((studentsResult.data || []).map((student) => [student.id, student]))
    const orders = new Map((ordersResult.data || []).map((order) => [order.id, order]))
    setUsageDetails({ discount, rows: rows.map((row) => ({ ...row, student: students.get(row.student_id), order: orders.get(row.order_id) })) })
    setUsageLoading(false)
  }

  async function deleteDiscount(discount) {
    const uses = usageStats.get(discount.id)?.count || 0
    const message = uses > 0
      ? `This discount has been used ${uses} time(s). It will be deactivated instead of permanently deleted so historical finance records remain accurate. Continue?`
      : `Permanently delete unused discount ${discount.code}?`

    if (!window.confirm(message)) return

    if (uses > 0) {
      const { data, error } = await supabase
        .from('discounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', discount.id)
        .select()
        .single()

      if (error) return alert(error.message)
      setDiscounts((current) => current.map((item) => item.id === data.id ? data : item))
      return
    }

    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discount.id)

    if (error) return alert(error.message)
    setDiscounts((current) => current.filter((item) => item.id !== discount.id))
  }

  async function toggleActive(discount) {
    const { data, error } = await supabase
      .from('discounts')
      .update({ is_active: !discount.is_active, updated_at: new Date().toISOString() })
      .eq('id', discount.id)
      .select()
      .single()

    if (error) return alert(error.message)
    setDiscounts((current) => current.map((item) => item.id === data.id ? data : item))
  }

  return (
    <div className="discounts-management">
      <section className="discounts-header">
        <div>
          <span className="discounts-eyebrow">Promotions</span>
          <h2>Discounts</h2>
          <p>Create and manage discount codes without changing the current ordering flow.</p>
        </div>
        <button type="button" className="discounts-primary" onClick={openCreate}>+ Add Discount</button>
      </section>

      <section className="discounts-toolbar-card">
        <div className="discounts-search">
          <span>🔎</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search discount code..." />
        </div>
        <button type="button" className="discounts-refresh" onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </section>

      <section className="discounts-list-card">
        {loading ? (
          <div className="discounts-empty">Loading discounts...</div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="discounts-empty"><strong>No discounts yet.</strong><span>Create your first discount code.</span></div>
        ) : (
          <div className="discounts-grid">
            {filteredDiscounts.map((discount) => (
              <article className="discount-card" key={discount.id}>
                <div className="discount-card-top">
                  <strong>{discount.code}</strong>
                  <span className={discount.is_active ? 'discount-status active' : 'discount-status'}>
                    {discount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="discount-value">
                  {discount.discount_type === 'PERCENTAGE' ? `${discount.value}% OFF` : `${discount.value} EGP OFF`}
                </div>
                <div className="discount-details">
                  <span>Min order: {discount.min_order_amount} EGP</span>
                  <span>Target: {discount.target_type}</span>
                  {discount.max_discount_amount != null && <span>Max discount: {discount.max_discount_amount} EGP</span>}
                  {discount.usage_limit != null && <span>Usage limit: {discount.usage_limit}</span>}
                </div>
                <div className="discount-stats-grid">
                  <div><span>Times used</span><strong>{usageStats.get(discount.id)?.count || 0}</strong></div>
                  <div><span>Total discount</span><strong>{(usageStats.get(discount.id)?.total || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 })} EGP</strong></div>
                  <div><span>Unique students</span><strong>{usageStats.get(discount.id)?.students.size || 0}</strong></div>
                  {discount.usage_limit != null && <div><span>Remaining uses</span><strong>{Math.max(0, discount.usage_limit - (usageStats.get(discount.id)?.count || 0))}</strong></div>}
                </div>
                <div className="discount-actions">
                  <button type="button" onClick={() => openUsageDetails(discount)}>📊 Usage details</button>
                  <button type="button" onClick={() => openEdit(discount)}>✏️ Edit</button>
                  <button type="button" onClick={() => toggleActive(discount)}>
                    {discount.is_active ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                  <button type="button" className="discount-delete-button" onClick={() => deleteDiscount(discount)}>🗑 Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {usageDetails && (
        <div className="discount-modal-overlay" role="presentation">
          <div className="discount-modal discount-usage-modal">
            <div className="discount-modal-header">
              <div><span>Discount analytics</span><h3>{usageDetails.discount.code} — Usage details</h3></div>
              <button type="button" onClick={() => setUsageDetails(null)}>×</button>
            </div>
            <div className="discount-usage-content">
              {usageLoading ? <div className="discounts-empty">Loading usage details...</div> : usageDetails.rows.length === 0 ? <div className="discounts-empty"><strong>No uses recorded yet.</strong><span>Usage details will appear here after successful discounted orders are recorded.</span></div> : (
                <div className="discount-usage-table-wrap"><table className="discount-usage-table"><thead><tr><th>Student</th><th>University ID</th><th>Order</th><th>Discount</th><th>Order total</th><th>Used at</th></tr></thead><tbody>
                  {usageDetails.rows.map((row) => <tr key={row.id}><td>{row.student?.full_name || 'Unknown student'}</td><td>{row.student?.university_id || '—'}</td><td>{row.order?.order_number || row.order_id?.slice(0, 8) || '—'}</td><td>{Number(row.discount_amount || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 })} EGP</td><td>{row.order?.total_amount != null ? Number(row.order.total_amount).toLocaleString('en-EG', { maximumFractionDigits: 2 }) + ' EGP' : '—'}</td><td>{row.used_at ? new Date(row.used_at).toLocaleString() : '—'}</td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="discount-modal-overlay">
          <div className="discount-modal">
            <div className="discount-modal-header">
              <div><span>{editingDiscount ? 'Edit Discount' : 'Create Discount'}</span><h3>{editingDiscount ? editingDiscount.code : 'New Discount'}</h3></div>
              <button type="button" onClick={() => setShowForm(false)} disabled={saving}>×</button>
            </div>

            <div className="discount-form">
              <label>Code<input value={form.code} onChange={(e) => updateField('code', e.target.value.toUpperCase())} placeholder="e.g. IEEE10" /></label>

              <div className="discount-form-grid">
                <label>Type<select value={form.discount_type} onChange={(e) => updateField('discount_type', e.target.value)}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed Amount</option></select></label>
                <label>Value<input type="number" min="0" step="0.01" value={form.value} onChange={(e) => updateField('value', e.target.value)} /></label>
                <label>Minimum Order<input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => updateField('min_order_amount', e.target.value)} /></label>
                <label>Maximum Discount<input type="number" min="0" step="0.01" value={form.max_discount_amount} onChange={(e) => updateField('max_discount_amount', e.target.value)} placeholder="Optional" /></label>
                <label>Usage Limit<input type="number" min="1" step="1" value={form.usage_limit} onChange={(e) => updateField('usage_limit', e.target.value)} placeholder="Unlimited" /></label>
                <label>Usage per Student<input type="number" min="1" step="1" value={form.usage_per_student} onChange={(e) => updateField('usage_per_student', e.target.value)} placeholder="Unlimited" /></label>
                <label>Starts At<input type="datetime-local" value={form.starts_at} onChange={(e) => updateField('starts_at', e.target.value)} /></label>
                <label>Expires At<input type="datetime-local" value={form.expires_at} onChange={(e) => updateField('expires_at', e.target.value)} /></label>
              </div>

              <div className="discount-target">
                <label>Target<select value={form.target_type} onChange={(e) => updateField('target_type', e.target.value)}><option value="ALL">Everyone</option><option value="TEAM">Specific Team</option><option value="RESTAURANT">Specific Restaurant</option></select></label>
                {form.target_type === 'TEAM' && <label>Team<select value={form.target_team_id} onChange={(e) => updateField('target_team_id', e.target.value)}><option value="">Select team...</option>{teams.filter((team) => team.is_active).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
                {form.target_type === 'RESTAURANT' && <label>Restaurant<select value={form.target_restaurant_id} onChange={(e) => updateField('target_restaurant_id', e.target.value)}><option value="">Select restaurant...</option>{restaurants.filter((restaurant) => restaurant.is_active).map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></label>}
              </div>

              <label className="discount-checkbox"><input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} /> Active discount</label>
            </div>

            <div className="discount-modal-footer">
              <button type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button type="button" className="discounts-primary" onClick={saveDiscount} disabled={saving}>{saving ? 'Saving...' : 'Save Discount'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DiscountManagement

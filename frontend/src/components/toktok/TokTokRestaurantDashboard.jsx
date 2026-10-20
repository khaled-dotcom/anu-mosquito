import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import './TokTokRestaurant.css'

const ACTIVE_STATUSES = ['confirmed', 'preparing', 'ready', 'out_for_delivery']
const FINISHED_STATUSES = ['delivered', 'completed']

function cairoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return values.year + '-' + values.month + '-' + values.day
}
function money(value) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(Number(value || 0))
}
function formatTime(value, withDate = false) {
  if (!value) return 'موعد غير محدد'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'موعد غير محدد'
  return new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', ...(withDate ? { day: 'numeric', month: 'short' } : {}), hour: 'numeric', minute: '2-digit' }).format(date)
}
function statusLabel(status) {
  return ({ confirmed: 'طلب جديد', preparing: 'جاري التجهيز', ready: 'جاهز للتسليم', out_for_delivery: 'تم التسليم للمندوب', delivered: 'مكتمل', completed: 'مكتمل' })[status] || 'طلب جديد'
}
function statusTone(status) {
  if (status === 'confirmed') return 'new'
  if (status === 'preparing') return 'preparing'
  if (status === 'ready') return 'ready'
  if (status === 'out_for_delivery') return 'handoff'
  return 'completed'
}
function optionsLabel(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join('، ')
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => key + ': ' + (typeof item === 'string' ? item : JSON.stringify(item))).join('، ')
  return String(value)
}
function isLate(order, dueTime) {
  if (!dueTime || !ACTIVE_STATUSES.includes(order.status)) return false
  const due = new Date(dueTime).getTime()
  return Number.isFinite(due) && Date.now() > due
}
function getBatchStatus(orders) {
  const statuses = orders.map((order) => order.status)
  if (statuses.length && statuses.every((status) => FINISHED_STATUSES.includes(status))) return 'completed'
  if (statuses.length && statuses.every((status) => ['out_for_delivery', 'delivered', 'completed'].includes(status))) return 'out_for_delivery'
  if (statuses.length && statuses.every((status) => ['ready', 'out_for_delivery', 'delivered', 'completed'].includes(status))) return 'ready'
  if (statuses.some((status) => ['preparing', 'ready', 'out_for_delivery'].includes(status))) return 'preparing'
  return 'confirmed'
}

export default function TokTokRestaurantDashboard({ profile, handleLogout }) {
  const [page, setPage] = useState('overview')
  const [orders, setOrders] = useState([])
  const [batches, setBatches] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const storeId = profile?.toktok_store_id
  const today = cairoDate()

  const loadOrders = useCallback(async (silent = false) => {
    if (!storeId) {
      setOrders([]); setBatches([]); setItemsByOrder({}); setLoading(false)
      return
    }
    if (!silent) { setLoading(true); setError('') }
    try {
      const [orderResult, batchResult] = await Promise.all([
        supabase.from('toktok_restaurant_order_feed')
          .select('id,order_number,order_date,store_id,batch_id,status,payment_status,items_subtotal,delivery_fee,total_amount,notes,created_at,batch_time_snapshot,updated_at')
          .eq('store_id', storeId)
          .order('order_date', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(500),
        supabase.from('toktok_batches').select('id,delivery_time').eq('store_id', storeId).order('delivery_time', { ascending: true }),
      ])
      if (orderResult.error) throw orderResult.error
      if (batchResult.error) throw batchResult.error
      const rows = orderResult.data || []
      const currentOrders = rows.filter((order) => {
        if (order.payment_status !== 'confirmed') return false
        if (ACTIVE_STATUSES.includes(order.status)) return true
        return FINISHED_STATUSES.includes(order.status) && order.order_date === today
      })
      const orderIds = currentOrders.map((order) => order.id)
      let itemRows = []
      if (orderIds.length) {
        const { data, error: itemError } = await supabase.from('toktok_restaurant_order_item_feed')
          .select('id,order_id,product_name_snapshot,quantity,unit_price,options_snapshot,notes,line_total')
          .in('order_id', orderIds)
        if (itemError) throw itemError
        itemRows = data || []
      }
      const groupedItems = itemRows.reduce((result, item) => {
        if (!result[item.order_id]) result[item.order_id] = []
        result[item.order_id].push(item)
        return result
      }, {})
      setOrders(currentOrders)
      setBatches(batchResult.data || [])
      setItemsByOrder(groupedItems)
    } catch (loadError) {
      console.error('TokTok restaurant orders failed to load:', loadError)
      if (!silent) setError('مش قادرين نحمّل الطلبات دلوقتي. حاول تفتح الصفحة تاني.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [storeId, today])

  useEffect(() => { loadOrders(false) }, [loadOrders])
  useEffect(() => {
    if (!storeId) return undefined
    const channel = supabase.channel('toktok-restaurant-orders-' + storeId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'toktok_restaurant_order_feed', filter: 'store_id=eq.' + storeId }, () => loadOrders(true))
      .subscribe((status) => { if (status === 'SUBSCRIBED') loadOrders(true) })
    return () => { supabase.removeChannel(channel) }
  }, [storeId, loadOrders])

  const batchGroups = useMemo(() => {
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]))
    const groupsByKey = new Map()
    orders.forEach((order) => {
      const key = order.order_date + ':' + (order.batch_id || order.batch_time_snapshot || 'no-batch')
      if (!groupsByKey.has(key)) {
        const batch = batchMap.get(order.batch_id)
        groupsByKey.set(key, { key, date: order.order_date, batchId: order.batch_id, dueTime: batch?.delivery_time || order.batch_time_snapshot, orders: [] })
      }
      const group = groupsByKey.get(key)
      if (!group.dueTime) group.dueTime = order.batch_time_snapshot
      group.orders.push(order)
    })
    const grouped = Array.from(groupsByKey.values()).map((group) => ({
      ...group,
      orders: group.orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      completed: group.orders.length > 0 && group.orders.every((order) => FINISHED_STATUSES.includes(order.status)),
    }))
    grouped.sort((a, b) => new Date(a.dueTime || a.date || 0).getTime() - new Date(b.dueTime || b.date || 0).getTime())
    const sequenceByDate = {}
    return grouped.map((group) => {
      sequenceByDate[group.date] = (sequenceByDate[group.date] || 0) + 1
      return { ...group, label: 'Batch ' + sequenceByDate[group.date], status: getBatchStatus(group.orders) }
    })
  }, [orders, batches])

  const activeGroups = batchGroups.filter((group) => !group.completed)
  const todayGroups = batchGroups.filter((group) => group.completed && group.date === today)
  const lateOrders = activeGroups.flatMap((group) => group.orders.filter((order) => isLate(order, group.dueTime)).map((order) => ({ ...order, groupKey: group.key })))
  const newCount = orders.filter((order) => order.status === 'confirmed').length
  const preparingCount = orders.filter((order) => order.status === 'preparing').length
  const readyCount = orders.filter((order) => order.status === 'ready').length
  const completedTodayCount = orders.filter((order) => order.order_date === today && FINISHED_STATUSES.includes(order.status)).length
  const closestBatch = activeGroups.find((group) => group.dueTime) || activeGroups[0] || null
  const closestRemaining = closestBatch ? closestBatch.orders.filter((order) => ['confirmed', 'preparing'].includes(order.status)).length : 0

  const pageGroups = useMemo(() => {
    if (page === 'new') return activeGroups.filter((group) => group.orders.some((order) => order.status === 'confirmed'))
    if (page === 'preparing') return activeGroups.filter((group) => group.orders.some((order) => order.status === 'preparing'))
    if (page === 'ready') return activeGroups.filter((group) => group.orders.some((order) => ['ready', 'out_for_delivery'].includes(order.status)))
    if (page === 'today') return todayGroups
    if (page === 'late') {
      const lateKeys = new Set(lateOrders.map((order) => order.groupKey))
      return activeGroups.filter((group) => lateKeys.has(group.key))
    }
    return []
  }, [page, activeGroups, todayGroups, lateOrders])

  async function updateOrderStatus(order, nextStatus) {
    setBusyId(order.id); setError('')
    try {
      const { data, error: updateError } = await supabase.functions.invoke('toktok-restaurant-order-status', {
        body: { order_id: order.id, status: nextStatus },
      })
      if (updateError || !data?.success) {
        let message = data?.error || updateError?.message || 'ماقدرناش نحدّث حالة الطلب.'
        if (updateError?.context) {
          try { const body = await updateError.context.json(); if (body?.error) message = body.error } catch { /* Keep original message. */ }
        }
        throw new Error(message)
      }
      await loadOrders(true)
    } catch (updateError) {
      console.error('TokTok restaurant status update failed:', updateError)
      setError(updateError?.message || 'ماقدرناش نحدّث حالة الطلب.')
    } finally { setBusyId('') }
  }

  function nextAction(order) {
    if (order.status === 'confirmed') return { label: 'بدء التجهيز', next: 'preparing' }
    if (order.status === 'preparing') return { label: 'جاهز للتسليم', next: 'ready' }
    if (order.status === 'ready') return { label: 'تسليم للمندوب', next: 'out_for_delivery' }
    return null
  }

  function renderOrder(order, group) {
    const items = itemsByOrder[order.id] || []
    const action = nextAction(order)
    const late = isLate(order, group.dueTime)
    return (
      <article className="tt-restaurant-order-card" key={order.id}>
        <div className="tt-restaurant-order-top">
          <div><span className="tt-restaurant-order-number">{order.order_number || '—'}</span><span className={'tt-restaurant-status tt-status-' + statusTone(order.status)}>{statusLabel(order.status)}</span></div>
          {late && <span className="tt-restaurant-late-pill">متأخر</span>}
        </div>
        <div className="tt-restaurant-items">
          {items.length ? items.map((item) => (
            <div className="tt-restaurant-item" key={item.id}>
              <div className="tt-restaurant-item-main">
                <strong>{item.quantity} × {item.product_name_snapshot}</strong>
                {optionsLabel(item.options_snapshot) && <small>{optionsLabel(item.options_snapshot)}</small>}
                {item.notes && <small>ملاحظة الصنف: {item.notes}</small>}
              </div>
              <span>{money(item.line_total)}</span>
            </div>
          )) : <p className="tt-restaurant-muted">تفاصيل الأصناف غير متاحة حاليًا.</p>}
        </div>
        {order.notes && <p className="tt-restaurant-order-notes"><strong>ملاحظات الطلب:</strong> {order.notes}</p>}
        <div className="tt-restaurant-order-meta"><span>وصل {formatTime(order.created_at)}</span><strong>الإجمالي: {money(order.total_amount)}</strong></div>
        <div className="tt-restaurant-order-bottom">
          <span className="tt-restaurant-muted">موعد التوصيل: {formatTime(group.dueTime, true)}</span>
          {action ? <button type="button" onClick={() => updateOrderStatus(order, action.next)} disabled={busyId === order.id}>{busyId === order.id ? 'جاري الحفظ…' : action.label}</button> : <span className="tt-restaurant-action-done">{order.status === 'out_for_delivery' ? 'تم التسليم للمندوب' : 'مكتمل عند الطالب'}</span>}
        </div>
      </article>
    )
  }

  function renderBatch(group) {
    const remaining = group.orders.filter((order) => ['confirmed', 'preparing'].includes(order.status)).length
    const lateCount = group.orders.filter((order) => isLate(order, group.dueTime)).length
    return (
      <section className="tt-restaurant-batch" key={group.key}>
        <header className="tt-restaurant-batch-header">
          <div><span className="tt-restaurant-batch-label">{group.label}</span><h3>{formatTime(group.dueTime, true)}</h3><p>{group.orders.length} طلب · {remaining} لسه محتاج تجهيز</p></div>
          <div className="tt-restaurant-batch-summary"><span className={'tt-restaurant-status tt-status-' + statusTone(group.status)}>{statusLabel(group.status)}</span>{lateCount > 0 && <span className="tt-restaurant-late-pill">{lateCount} متأخر</span>}</div>
        </header>
        <div className="tt-restaurant-order-grid">{group.orders.map((order) => renderOrder(order, group))}</div>
      </section>
    )
  }

  const navItems = [
    { id: 'overview', label: 'نظرة عامة', icon: '⌂' },
    { id: 'new', label: 'الطلبات الجديدة', icon: '＋', count: newCount },
    { id: 'preparing', label: 'قيد التجهيز', icon: '◷' },
    { id: 'ready', label: 'جاهزة للتسليم', icon: '▣' },
    { id: 'late', label: 'الطلبات المتأخرة', icon: '!' },
    { id: 'today', label: 'طلبات اليوم', icon: '✓' },
  ]
  function renderOverview() {
    const cards = [
      { id: 'new', label: 'الطلبات الجديدة', count: newCount, icon: '＋' },
      { id: 'preparing', label: 'قيد التجهيز', count: preparingCount, icon: '◷' },
      { id: 'ready', label: 'جاهزة للتسليم', count: readyCount, icon: '▣' },
      { id: 'today', label: 'مكتملة اليوم', count: completedTodayCount, icon: '✓' },
    ]
    return (
      <div className="tt-restaurant-overview">
        <div className="tt-restaurant-stat-grid">
          {cards.map((card) => <button className="tt-restaurant-stat-card" type="button" key={card.id} onClick={() => setPage(card.id)}><span className="tt-restaurant-stat-icon">{card.icon}</span><span className="tt-restaurant-stat-label">{card.label}</span><strong>{card.count}</strong><span className="tt-restaurant-stat-link">عرض التفاصيل <b>←</b></span></button>)}
        </div>
        <section className="tt-restaurant-closest">
          <div><span className="tt-restaurant-eyebrow">NEXT DELIVERY BATCH</span><h2>{closestBatch ? closestBatch.label : 'مفيش باتش نشط حاليًا'}</h2><p>{closestBatch ? formatTime(closestBatch.dueTime, true) + ' · ' + closestBatch.orders.length + ' طلب · ' + closestRemaining + ' محتاج تجهيز' : 'هتظهر هنا أقرب دفعة توصيل فيها طلبات نشطة.'}</p></div>
          {closestBatch && <button type="button" onClick={() => setPage(closestBatch.orders.some((order) => order.status === 'confirmed') ? 'new' : closestBatch.orders.some((order) => order.status === 'preparing') ? 'preparing' : 'ready')}>عرض الباتش</button>}
        </section>
        {closestBatch && renderBatch(closestBatch)}
      </div>
    )
  }

  const pageTitles = {
    overview: ['نظرة عامة', 'متابعة سريعة لطلبات مطعمك والباتش الأقرب.'],
    new: ['الطلبات الجديدة', 'الطلبات اللي اتأكد دفعها ولسه ما بدأش تجهيزها.'],
    preparing: ['قيد التجهيز', 'تابع الأصناف وعلّم الأوردر جاهز لما يخلص.'],
    ready: ['جاهزة للتسليم', 'راجع كل أوردر وسجّل تسليمه للمندوب.'],
    late: ['الطلبات المتأخرة', 'الطلبات اللي عدّى موعد توصيلها ولسه ما اتسلّمتش للمندوب.'],
    today: ['طلبات اليوم', 'الباتشات اللي كل طلباتها اكتملت عند الطلاب.'],
  }
  const [title, subtitle] = pageTitles[page] || pageTitles.overview

  if (!storeId) return <main className="tt-restaurant-unassigned" dir="rtl"><h1>الحساب غير مربوط بمطعم</h1><p>تواصل مع إدارة ANU TokTok لربط الحساب بالمطعم الصحيح.</p><button type="button" onClick={handleLogout}>تسجيل الخروج</button></main>

  return (
    <div className="tt-restaurant-app" dir="rtl">
      <aside className="tt-restaurant-sidebar">
        <div className="tt-restaurant-logo"><span className="tt-restaurant-brand-mark">TT</span><div><strong>TokTok</strong><small>لوحة المطعم</small></div></div>
        <nav aria-label="قائمة المطعم">
          {navItems.map((item) => <button type="button" key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><span className="tt-restaurant-nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === 'new' && item.count > 0 && <b className="tt-restaurant-nav-count">{item.count}</b>}</button>)}
        </nav>
        <div className="tt-restaurant-sidebar-bottom"><span>{profile.full_name || 'حساب المطعم'}</span><button type="button" onClick={handleLogout}>↪ تسجيل الخروج</button></div>
      </aside>
      <main className="tt-restaurant-main">
        <header className="tt-restaurant-topbar"><div><span className="tt-restaurant-eyebrow">ANU TOKTOK · RESTAURANT</span><h1>{title}</h1><p>{subtitle}</p></div><div className="tt-restaurant-topbar-actions"><div className="tt-restaurant-topbar-mark">TT</div><button className="tt-restaurant-logout" type="button" onClick={handleLogout}>↪ تسجيل الخروج</button></div></header>
        {error && <div className="tt-restaurant-error" role="alert">{error}</div>}
        {!loading && page === 'overview' && renderOverview()}
        {!loading && page !== 'overview' && <div className="tt-restaurant-page-content">{pageGroups.length ? pageGroups.map(renderBatch) : <div className="tt-restaurant-empty"><span>{page === 'today' ? '✓' : page === 'late' ? '!' : '📦'}</span><h2>{page === 'today' ? 'لسه مفيش باتشات مكتملة' : page === 'late' ? 'مفيش طلبات متأخرة' : 'مفيش طلبات في القسم ده'}</h2><p>{page === 'today' ? 'الباتش هيظهر هنا لما كل طلباته توصل للطلاب.' : page === 'late' ? 'كل الطلبات لسه ضمن مواعيدها أو اتسلّمت للمندوب.' : 'الطلبات الجديدة هتظهر هنا تلقائيًا أول ما توصل.'}</p></div>}</div>}
        {loading && <div className="tt-restaurant-empty"><span className="tt-restaurant-spinner" /><p>جاري تحميل الطلبات…</p></div>}
        <footer className="tt-restaurant-footer">تحديث الطلبات لحظي · ANU TokTok</footer>
      </main>
    </div>
  )
}

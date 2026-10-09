// In-memory stand-in for the Supabase client, used only by the end-to-end
// tests (wired in by vite.e2e.config.js). It mimics the database rules the
// screens rely on: prices from the menu, fee tiers, batch drivers.

const params = new URLSearchParams(window.location.search)
const ROLE = params.get('role') || 'none' // none | student | driver | admin
const EMPTY = params.get('empty') === '1'

window.__mockCalls = []

function svgImage(emoji, from, to) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><text x="300" y="250" font-size="170" text-anchor="middle">${emoji}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const now = new Date()
const iso = (d) => d.toISOString()
const inMinutes = (m) => new Date(now.getTime() + m * 60000)
const todayStr = now.toISOString().split('T')[0]

const home_categories = [
  { id: 'h1', name: 'Burgers', icon: '🍔', image_url: null, sort_order: 1, is_active: true },
  { id: 'h2', name: 'Pizza', icon: '🍕', image_url: null, sort_order: 2, is_active: true },
  { id: 'h3', name: 'Drinks', icon: '🥤', image_url: null, sort_order: 3, is_active: true },
  { id: 'h4', name: 'Desserts', icon: '🍰', image_url: null, sort_order: 4, is_active: false },
]

const restaurants = EMPTY ? [] : [
  { id: 'r1', name: 'Burger Hub', code: 'B', description: 'Smash burgers, loaded fries and shakes made fresh on campus.', image_url: svgImage('🍔', '#fde68a', '#f59e0b'), is_active: true },
  { id: 'r2', name: 'Pizza Corner', code: 'P', description: 'Stone-baked pizza by the slice or whole pie.', image_url: svgImage('🍕', '#fecaca', '#ef4444'), is_active: true },
  { id: 'r3', name: 'Juice Bar', code: 'J', description: 'Fresh juices and iced coffee.', image_url: null, is_active: false },
]

const food_categories = [
  { id: 'c1', restaurant_id: 'r1', name: 'Burgers', sort_order: 1, is_active: true },
  { id: 'c2', restaurant_id: 'r1', name: 'Sides', sort_order: 2, is_active: true },
  { id: 'c3', restaurant_id: 'r2', name: 'Pizza', sort_order: 1, is_active: true },
  { id: 'c4', restaurant_id: 'r2', name: 'Drinks', sort_order: 2, is_active: true },
]

const food_item_sizes = [
  { id: 's1', food_item_id: 'f4', name: 'M', selling_price: 120, cost_price: 70, sort_order: 1, is_available: true },
  { id: 's2', food_item_id: 'f4', name: 'L', selling_price: 160, cost_price: 90, sort_order: 2, is_available: true },
  { id: 's3', food_item_id: 'f4', name: 'XL', selling_price: 210, cost_price: 120, sort_order: 3, is_available: true },
]

const food_items = [
  { id: 'f1', restaurant_id: 'r1', category_id: 'c1', home_category_id: 'h1', name: 'Classic Smash Burger', description: 'Double beef patty, cheddar, pickles and house sauce.', image_url: svgImage('🍔', '#fef3c7', '#fbbf24'), selling_price: 145, cost_price: 90, is_available: true },
  { id: 'f2', restaurant_id: 'r1', category_id: 'c1', home_category_id: 'h1', name: 'Spicy Chicken Burger', description: 'Crispy chicken, jalapeños and chipotle mayo.', image_url: svgImage('🌶️', '#fee2e2', '#f87171'), selling_price: 130, cost_price: 80, is_available: true },
  { id: 'f3', restaurant_id: 'r1', category_id: 'c2', home_category_id: null, name: 'Loaded Fries', description: 'Cheese sauce and spring onions.', image_url: svgImage('🍟', '#fef9c3', '#facc15'), selling_price: 65, cost_price: 30, is_available: true },
  { id: 'f4', restaurant_id: 'r2', category_id: 'c3', home_category_id: 'h2', name: 'Margherita', description: 'Tomato, mozzarella and basil.', image_url: svgImage('🍕', '#ffe4e6', '#fb7185'), selling_price: 120, cost_price: 70, is_available: true },
  { id: 'f5', restaurant_id: 'r2', category_id: 'c4', home_category_id: 'h3', name: 'Iced Latte', description: null, image_url: null, selling_price: 55, cost_price: 20, is_available: true },
  { id: 'f6', restaurant_id: 'r1', category_id: 'c2', home_category_id: null, name: 'Brownie', description: 'Sold out today.', image_url: null, selling_price: 50, cost_price: 18, is_available: false },
]

const delivery_batches = [
  { id: 'b1', batch_number: 1, registration_start: iso(inMinutes(-90)), registration_end: iso(inMinutes(42)), delivery_time: iso(inMinutes(100)), delivery_date: todayStr, maximum_orders: 40, is_active: true },
  { id: 'b2', batch_number: 2, registration_start: iso(inMinutes(120)), registration_end: iso(inMinutes(200)), delivery_time: iso(inMinutes(260)), delivery_date: todayStr, maximum_orders: 40, is_active: true },
  { id: 'b0', batch_number: 0, registration_start: iso(inMinutes(-300)), registration_end: iso(inMinutes(-10)), delivery_time: iso(inMinutes(20)), delivery_date: todayStr, maximum_orders: 40, is_active: true },
]

const profiles = [
  { id: 'u-student', full_name: 'Omar Hassan Ali', university_id: '2210345', driver_id: null, phone: '01012345678', role: 'student', admin_id: null, created_at: iso(inMinutes(-9000)) },
  { id: 'u-driver', full_name: 'Ahmed Samir', university_id: null, driver_id: '7000012', phone: '01234567890', role: 'driver', admin_id: null, created_at: iso(inMinutes(-9000)) },
  { id: 'u-admin', full_name: 'Khaled Ghalwash', university_id: null, driver_id: null, phone: '01000000000', role: 'admin', admin_id: '9000001', created_at: iso(inMinutes(-9000)) },
]

const driver_profiles = [{ id: 'u-driver', is_active: true, created_at: iso(now), profiles: profiles[1] }]
const driver_batch_assignments = [{ id: 'a1', driver_id: 'u-driver', batch_id: 'b1', assigned_at: iso(now), delivery_batches: delivery_batches[0] }]

const payment_methods = [
  { id: 'p1', name: 'Vodafone Cash', type: 'Mobile wallet', account_number: '0101 234 5678', instructions: 'Send the exact total and screenshot the confirmation.', is_active: true, created_at: iso(now) },
]

const delivery_settings = [{ id: 's1', delivery_fee: 25, updated_at: iso(now) }]
const delivery_fee_tiers = [
  { id: 't1', min_order_total: 0, fee: 25 },
  { id: 't2', min_order_total: 300, fee: 40 },
]

function orderRow(i, status, extra = {}) {
  return {
    id: `o${i}`, order_number: `B-${String(100 + i)}`, student_id: 'u-student', restaurant_id: 'r1', batch_id: 'b1',
    assigned_driver_id: null, food_subtotal: 290, delivery_fee: 25, driver_cost: 0, total_amount: 315,
    payment_status: status === 'PAYMENT_UNDER_CONFIRMATION' ? 'UNDER_CONFIRMATION' : 'PAID', status,
    payment_screenshot_path: 'u-student/x.png', order_date: todayStr, created_at: iso(inMinutes(-i * 7)),
    student_name_snapshot: 'Omar Hassan Ali', student_phone_snapshot: '01012345678', university_id_snapshot: '2210345',
    ...extra,
  }
}

// Orders 1–3 sit in the driver's batch but were placed after assignment, so
// assigned_driver_id is null: the driver must still see them.
const orders = EMPTY ? [] : [
  orderRow(1, 'PREPARING'),
  orderRow(2, 'CONFIRMED'),
  orderRow(3, 'OUT_FOR_DELIVERY', { assigned_driver_id: 'u-driver' }),
  orderRow(4, 'DELIVERED_BY_DRIVER', { assigned_driver_id: 'u-driver' }),
  orderRow(5, 'PAYMENT_UNDER_CONFIRMATION'),
  orderRow(6, 'PREPARING', { batch_id: 'b2' }),
]

const order_items = orders.flatMap((o) => [
  { id: `${o.id}-1`, order_id: o.id, food_item_id: 'f1', food_name_snapshot: 'Classic Smash Burger', quantity: 2, unit_selling_price: 145, line_total: 290, unit_cost_price: 90, line_cost_total: 180, notes: null, size_name: null },
])

const db = { home_categories, restaurants, food_categories, food_items, food_item_sizes, delivery_batches, profiles, driver_profiles, driver_batch_assignments, payment_methods, delivery_settings, delivery_fee_tiers, orders, order_items }

// Embedded relations used by the app's selects.
const RELATIONS = {
  food_items: { food_item_sizes: (r) => db.food_item_sizes.filter((s) => s.food_item_id === r.id) },
  orders: {
    restaurants: (r) => db.restaurants.find((x) => x.id === r.restaurant_id) || null,
    delivery_batches: (r) => db.delivery_batches.find((x) => x.id === r.batch_id) || null,
    order_items: (r) => db.order_items.filter((x) => x.order_id === r.id),
  },
  driver_batch_assignments: { delivery_batches: (r) => db.delivery_batches.find((x) => x.id === r.batch_id) || null },
}

function withRelations(table, row) {
  const rel = RELATIONS[table]
  if (!rel) return row
  const out = { ...row }
  for (const [name, fn] of Object.entries(rel)) out[name] = fn(row)
  return out
}

function parseList(v) {
  return String(v).replace(/^\(|\)$/g, '').split(',').map((x) => x.trim())
}

function matchCond(row, cond) {
  const [col, op, ...rest] = cond.split('.')
  const val = rest.join('.')
  if (op === 'eq') return String(row[col]) === val
  if (op === 'in') return parseList(val).includes(String(row[col]))
  if (op === 'is') return val === 'null' ? row[col] == null : String(row[col]) === val
  return true
}

let idSeq = 1000

class Query {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orders = []
    this.mode = 'select'
    this.payload = null
    this.opts = {}
    this.singleMode = null
  }
  select(_c, opts) { if (this.mode === 'select') this.opts = opts || {}; return this }
  insert(rows) { this.mode = 'insert'; this.payload = rows; return this }
  upsert(rows, opts) { this.mode = 'upsert'; this.payload = rows; this.conflict = opts?.onConflict; return this }
  update(values) { this.mode = 'update'; this.payload = values; return this }
  delete() { this.mode = 'delete'; return this }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this }
  not(c, op, v) {
    if (op === 'is') this.filters.push((r) => r[c] != null)
    if (op === 'in') { const list = parseList(v); this.filters.push((r) => !list.includes(String(r[c]))) }
    return this
  }
  or(expr) { const conds = expr.split(/,(?![^(]*\))/); this.filters.push((r) => conds.some((c) => matchCond(r, c))); return this }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this }
  order(c, o = {}) { this.orders.push([c, o.ascending !== false]); return this }
  limit() { return this }
  single() { this.singleMode = 'single'; return this }
  maybeSingle() { this.singleMode = 'maybe'; return this }
  run() {
    window.__mockCalls.push({ table: this.table, mode: this.mode, payload: this.payload })
    const rows = db[this.table] || (db[this.table] = [])
    let result
    if (this.mode === 'insert' || this.mode === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload]
      result = list.map((r) => {
        if (this.mode === 'upsert' && this.conflict) {
          const existing = rows.find((x) => String(x[this.conflict]) === String(r[this.conflict]))
          if (existing) return Object.assign(existing, r)
        }
        const row = { id: `${this.table}-${idSeq++}`, created_at: iso(new Date()), ...r }
        rows.push(row)
        return row
      })
    } else {
      let matched = rows.filter((r) => this.filters.every((f) => f(r)))
      if (this.mode === 'update') matched.forEach((r) => Object.assign(r, this.payload))
      if (this.mode === 'delete') db[this.table] = rows.filter((r) => !matched.includes(r))
      for (const [c, asc] of [...this.orders].reverse()) {
        matched = [...matched].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
      }
      result = matched.map((r) => withRelations(this.table, r))
    }
    if (this.opts.head) return { data: null, count: result.length, error: null }
    if (this.singleMode === 'single') return result[0] ? { data: result[0], error: null } : { data: null, error: { message: 'Row not found' } }
    if (this.singleMode === 'maybe') return { data: result[0] || null, error: null }
    return { data: result, count: result.length, error: null }
  }
  then(resolve, reject) {
    return new Promise((r) => setTimeout(r, 60)).then(() => this.run()).then(resolve, reject)
  }
}

function feeFor(subtotal) {
  const tiers = [...db.delivery_fee_tiers].sort((a, b) => b.min_order_total - a.min_order_total)
  return (tiers.find((t) => t.min_order_total <= subtotal) || { fee: db.delivery_settings[0].delivery_fee }).fee
}

// Same rules as the database function place_student_order.
function placeOrder(args) {
  const items = args.p_items || []
  if (!items.length) return { data: null, error: { message: 'Your cart is empty.' } }
  let subtotal = 0
  const lines = []
  for (const line of items) {
    const item = db.food_items.find((f) => f.id === line.food_item_id)
    if (!item || !item.is_available) return { data: null, error: { message: 'An item in your cart is not available right now.' } }
    const sizes = db.food_item_sizes.filter((s) => s.food_item_id === item.id && s.is_available)
    const size = line.size_id ? sizes.find((s) => s.id === line.size_id) : null
    if (sizes.length && !size) return { data: null, error: { message: `Please choose a size for ${item.name}.` } }
    const unit = size ? size.selling_price : item.selling_price
    subtotal += unit * line.quantity
    lines.push({ name: size ? `${item.name} (${size.name})` : item.name, unit, quantity: line.quantity, size })
  }
  const fee = feeFor(subtotal)
  const order = {
    ...orderRow(idSeq++, 'PAYMENT_UNDER_CONFIRMATION', { restaurant_id: args.p_restaurant_id, batch_id: args.p_batch_id }),
    food_subtotal: subtotal, delivery_fee: fee, total_amount: subtotal + fee, created_at: iso(new Date()),
  }
  order.order_number = `B-${String(idSeq).slice(-3)}`
  db.orders.unshift(order)
  lines.forEach((l, i) => db.order_items.push({ id: `${order.id}-${i}`, order_id: order.id, food_item_id: null, food_name_snapshot: l.name, quantity: l.quantity, unit_selling_price: l.unit, line_total: l.unit * l.quantity, size_name: l.size?.name || null }))
  window.__lastOrder = { args, order, lines }
  return { data: { id: order.id, order_number: order.order_number, food_subtotal: subtotal, delivery_fee: fee, total_amount: subtotal + fee, status: order.status, payment_status: order.payment_status }, error: null }
}

const userId = { student: 'u-student', driver: 'u-driver', admin: 'u-admin' }[ROLE]
const session = userId ? { user: { id: userId }, access_token: 'x' } : null

export const supabase = {
  from: (t) => new Query(t),
  rpc: async (fn, args) => {
    window.__mockCalls.push({ rpc: fn, args })
    await new Promise((r) => setTimeout(r, 80))
    if (fn === 'place_student_order') return placeOrder(args)
    if (fn === 'driver_update_order_status') {
      const order = db.orders.find((o) => o.id === args.p_order_id)
      const ok = order && ((args.p_new_status === 'OUT_FOR_DELIVERY' && ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(order.status)) || (args.p_new_status === 'DELIVERED_BY_DRIVER' && order.status === 'OUT_FOR_DELIVERY'))
      if (ok) order.status = args.p_new_status
      return { data: { success: !!ok, message: ok ? 'ok' : 'Invalid status transition' }, error: null }
    }
    return { data: null, error: null }
  },
  functions: { invoke: async () => ({ data: null, error: { message: 'Not available in tests' } }) },
  storage: {
    from: () => ({
      upload: async (path, blob) => { window.__lastUpload = { path, size: blob?.size, type: blob?.type }; return { data: { path }, error: null } },
      getPublicUrl: (path) => ({ data: { publicUrl: svgImage('📷', '#e0f2fe', '#38bdf8') + '#' + path } }),
      createSignedUrl: async () => ({ data: { signedUrl: svgImage('🧾', '#e0f2fe', '#38bdf8') }, error: null }),
    }),
  },
  auth: {
    onAuthStateChange(cb) {
      setTimeout(() => cb('INITIAL_SESSION', session), 0)
      return { data: { subscription: { unsubscribe() {} } } }
    },
    signInWithPassword: async () => ({ data: null, error: { message: 'Invalid login credentials' } }),
    signOut: async () => ({ error: null }),
    setSession: async () => ({ data: null, error: null }),
  },
}

window.__db = db

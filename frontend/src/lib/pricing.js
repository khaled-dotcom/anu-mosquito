// Pure pricing helpers shared by the menu, cart, checkout and admin screens.
// The database re-checks every price, so these only drive what people see.

export function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function formatEGP(value) {
  const n = toNumber(value)
  return `${Number.isInteger(n) ? n : n.toFixed(2)} EGP`
}

/** Available sizes of a food item, cheapest first. */
export function availableSizes(item) {
  return (item?.food_item_sizes || item?.sizes || [])
    .filter((size) => size.is_available !== false)
    .slice()
    .sort(
      (a, b) =>
        toNumber(a.sort_order) - toNumber(b.sort_order) ||
        toNumber(a.selling_price) - toNumber(b.selling_price)
    )
}

export function hasSizes(item) {
  return availableSizes(item).length > 0
}

/** Lowest price a student can pay for this item ("from 80 EGP"). */
export function startingPrice(item) {
  const sizes = availableSizes(item)
  if (sizes.length === 0) return toNumber(item?.selling_price)
  return Math.min(...sizes.map((size) => toNumber(size.selling_price)))
}

/** Unit price for an item and an optional chosen size. */
export function unitPrice(item, size) {
  return size ? toNumber(size.selling_price) : toNumber(item?.selling_price)
}

/** One cart line per item + size combination. */
export function cartLineKey(itemId, sizeId) {
  return `${itemId}:${sizeId || ''}`
}

export function addToCart(cart, item, size, quantity = 1) {
  const qty = Math.max(1, Math.floor(toNumber(quantity, 1)))
  const key = cartLineKey(item.id, size?.id)
  const existing = cart.find((line) => line.key === key)

  if (existing) {
    return cart.map((line) =>
      line.key === key ? { ...line, quantity: line.quantity + qty } : line
    )
  }

  return [
    ...cart,
    {
      ...item,
      key,
      size_id: size?.id || null,
      size_name: size?.name || null,
      selling_price: unitPrice(item, size),
      cost_price: size ? toNumber(size.cost_price) : toNumber(item.cost_price),
      quantity: qty,
    },
  ]
}

export function changeCartQuantity(cart, key, delta) {
  return cart
    .map((line) =>
      line.key === key ? { ...line, quantity: line.quantity + delta } : line
    )
    .filter((line) => line.quantity > 0)
}

export function cartCount(cart) {
  return cart.reduce((total, line) => total + line.quantity, 0)
}

export function cartSubtotal(cart) {
  return cart.reduce(
    (total, line) => total + toNumber(line.selling_price) * line.quantity,
    0
  )
}

export function lineLabel(line) {
  return line.size_name ? `${line.name} (${line.size_name})` : line.name
}

/** Tiers sorted by their starting order total. */
export function sortTiers(tiers) {
  return (tiers || [])
    .map((tier) => ({
      ...tier,
      min_order_total: toNumber(tier.min_order_total),
      fee: toNumber(tier.fee),
    }))
    .sort((a, b) => a.min_order_total - b.min_order_total)
}

/**
 * Delivery fee for a food subtotal: the tier with the highest starting total
 * that the subtotal reaches. Falls back to the flat fee when there are no tiers.
 */
export function deliveryFeeFor(subtotal, tiers, fallbackFee = 0) {
  const total = toNumber(subtotal)
  const matching = sortTiers(tiers).filter((tier) => tier.min_order_total <= total)
  if (matching.length === 0) return toNumber(fallbackFee)
  return matching[matching.length - 1].fee
}

/** The next tier above the current subtotal, if any (to show "fee changes at X"). */
export function nextTier(subtotal, tiers) {
  const total = toNumber(subtotal)
  return sortTiers(tiers).find((tier) => tier.min_order_total > total) || null
}

/** Validation for the admin tier editor. Returns an error message or ''. */
export function validateTiers(tiers) {
  const rows = (tiers || []).map((tier) => ({
    min: String(tier.min_order_total ?? '').trim(),
    fee: String(tier.fee ?? '').trim(),
  }))

  if (rows.length === 0) return 'Add at least one tier.'

  for (const row of rows) {
    if (row.min === '' || row.fee === '') return 'Fill in every "from" amount and fee.'
    if (!Number.isFinite(Number(row.min)) || Number(row.min) < 0) return 'Order amounts must be 0 or more.'
    if (!Number.isFinite(Number(row.fee)) || Number(row.fee) < 0) return 'Fees must be 0 or more.'
  }

  const mins = rows.map((row) => Number(row.min))
  if (new Set(mins).size !== mins.length) return 'Two tiers start at the same amount.'
  if (!mins.includes(0)) return 'One tier must start from 0 EGP so every order has a fee.'

  return ''
}

/** Validation for the admin size editor. Returns an error message or ''. */
export function validateSizes(sizes) {
  const names = []

  for (const size of sizes || []) {
    const name = String(size.name || '').trim()
    const price = String(size.selling_price ?? '').trim()

    if (!name) return 'Every size needs a name (e.g. M, L, XL).'
    if (price === '' || !Number.isFinite(Number(price)) || Number(price) < 0)
      return `Enter a valid price for size ${name}.`
    if (size.cost_price !== '' && size.cost_price != null && (!Number.isFinite(Number(size.cost_price)) || Number(size.cost_price) < 0))
      return `Enter a valid cost for size ${name}.`

    names.push(name.toLowerCase())
  }

  if (new Set(names).size !== names.length) return 'Two sizes have the same name.'

  return ''
}

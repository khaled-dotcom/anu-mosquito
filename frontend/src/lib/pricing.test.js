import { describe, expect, it } from 'vitest'
import {
  addToCart,
  availableSizes,
  cartCount,
  cartLineKey,
  cartSubtotal,
  changeCartQuantity,
  deliveryFeeFor,
  formatEGP,
  hasSizes,
  lineLabel,
  nextTier,
  startingPrice,
  unitPrice,
  validateSizes,
  validateTiers,
} from './pricing'

const burger = { id: 'b', name: 'Burger', selling_price: 100, cost_price: 60 }
const pizza = {
  id: 'p',
  name: 'Pizza',
  selling_price: 80,
  food_item_sizes: [
    { id: 'xl', name: 'XL', selling_price: 150, sort_order: 3, is_available: false },
    { id: 'l', name: 'L', selling_price: 120, cost_price: 70, sort_order: 2 },
    { id: 'm', name: 'M', selling_price: 80, cost_price: 40, sort_order: 1 },
  ],
}

describe('sizes', () => {
  it('lists only available sizes in admin order', () => {
    expect(availableSizes(pizza).map((s) => s.name)).toEqual(['M', 'L'])
  })

  it('knows when an item has sizes', () => {
    expect(hasSizes(pizza)).toBe(true)
    expect(hasSizes(burger)).toBe(false)
    expect(hasSizes(null)).toBe(false)
  })

  it('shows the cheapest available size as the starting price', () => {
    expect(startingPrice(pizza)).toBe(80)
    expect(startingPrice(burger)).toBe(100)
  })

  it('uses the size price when a size is chosen', () => {
    expect(unitPrice(pizza, pizza.food_item_sizes[1])).toBe(120)
    expect(unitPrice(burger, null)).toBe(100)
  })
})

describe('cart', () => {
  it('keeps one line per item and size', () => {
    let cart = addToCart([], pizza, pizza.food_item_sizes[2], 1)
    cart = addToCart(cart, pizza, pizza.food_item_sizes[1], 2)
    cart = addToCart(cart, pizza, pizza.food_item_sizes[2], 1)
    cart = addToCart(cart, burger, null, 3)

    expect(cart.map((line) => [line.key, line.quantity])).toEqual([
      [cartLineKey('p', 'm'), 2],
      [cartLineKey('p', 'l'), 2],
      [cartLineKey('b', null), 3],
    ])
    expect(cartCount(cart)).toBe(7)
    expect(cartSubtotal(cart)).toBe(2 * 80 + 2 * 120 + 3 * 100)
  })

  it('stores the size on the line and labels it', () => {
    const [line] = addToCart([], pizza, pizza.food_item_sizes[1], 1)
    expect(line.size_id).toBe('l')
    expect(line.selling_price).toBe(120)
    expect(line.cost_price).toBe(70)
    expect(lineLabel(line)).toBe('Pizza (L)')
    expect(lineLabel(addToCart([], burger, null)[0])).toBe('Burger')
  })

  it('never adds less than one', () => {
    expect(addToCart([], burger, null, 0)[0].quantity).toBe(1)
    expect(addToCart([], burger, null, -4)[0].quantity).toBe(1)
  })

  it('removes a line when its quantity reaches zero', () => {
    const cart = addToCart([], burger, null, 1)
    expect(changeCartQuantity(cart, cart[0].key, 1)[0].quantity).toBe(2)
    expect(changeCartQuantity(cart, cart[0].key, -1)).toEqual([])
  })
})

describe('delivery fee tiers', () => {
  const tiers = [
    { min_order_total: '500', fee: '40' },
    { min_order_total: 0, fee: 25 },
    { min_order_total: 1000, fee: 0 },
  ]

  it('picks the highest tier the total reaches', () => {
    expect(deliveryFeeFor(0, tiers)).toBe(25)
    expect(deliveryFeeFor(499.99, tiers)).toBe(25)
    expect(deliveryFeeFor(500, tiers)).toBe(40)
    expect(deliveryFeeFor(999, tiers)).toBe(40)
    expect(deliveryFeeFor(1000, tiers)).toBe(0)
  })

  it('falls back to the flat fee without tiers', () => {
    expect(deliveryFeeFor(300, [], 15)).toBe(15)
    expect(deliveryFeeFor(300, undefined, 15)).toBe(15)
  })

  it('finds the next tier above the total', () => {
    expect(nextTier(200, tiers)).toMatchObject({ min_order_total: 500, fee: 40 })
    expect(nextTier(1200, tiers)).toBeNull()
  })

  it('validates the admin tier editor', () => {
    expect(validateTiers([])).toMatch(/at least one/)
    expect(validateTiers([{ min_order_total: '100', fee: '20' }])).toMatch(/from 0/)
    expect(validateTiers([{ min_order_total: '0', fee: '' }])).toMatch(/Fill in/)
    expect(validateTiers([{ min_order_total: '0', fee: '-1' }])).toMatch(/Fees/)
    expect(validateTiers([{ min_order_total: '0', fee: '20' }, { min_order_total: '0', fee: '30' }])).toMatch(/same amount/)
    expect(validateTiers([{ min_order_total: '0', fee: '20' }, { min_order_total: '500', fee: '30' }])).toBe('')
  })
})

describe('size editor validation', () => {
  it('accepts valid sizes', () => {
    expect(validateSizes([{ name: 'M', selling_price: '80' }, { name: 'L', selling_price: 120, cost_price: '' }])).toBe('')
    expect(validateSizes([])).toBe('')
  })

  it('rejects missing names, bad prices and duplicates', () => {
    expect(validateSizes([{ name: '', selling_price: 10 }])).toMatch(/name/)
    expect(validateSizes([{ name: 'M', selling_price: '' }])).toMatch(/price for size M/)
    expect(validateSizes([{ name: 'M', selling_price: 10, cost_price: -2 }])).toMatch(/cost for size M/)
    expect(validateSizes([{ name: 'm', selling_price: 10 }, { name: 'M ', selling_price: 12 }])).toMatch(/same name/)
  })
})

it('formats Egyptian pounds', () => {
  expect(formatEGP(25)).toBe('25 EGP')
  expect(formatEGP('37.5')).toBe('37.50 EGP')
  expect(formatEGP(undefined)).toBe('0 EGP')
})

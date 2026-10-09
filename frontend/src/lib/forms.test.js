import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

const { validateFoodForm } = await import('../services/foodService')
const { validateHomeCategory } = await import('../services/homeCategoryService')
const { emptyFoodForm, foodToForm } = await import('../hooks/useFood')
const { orderStatusInfo, orderStepIndex, ORDER_STEPS } = await import('../orderStatus')

describe('food form', () => {
  const base = { ...emptyFoodForm(), name: 'Burger', category_id: 'c1', selling_price: '100' }

  it('accepts a simple item with one price', () => {
    expect(validateFoodForm(base)).toBe('')
  })

  it('needs a name, a menu section and a price', () => {
    expect(validateFoodForm({ ...base, name: ' ' })).toMatch(/name/)
    expect(validateFoodForm({ ...base, category_id: '' })).toMatch(/section/)
    expect(validateFoodForm({ ...base, selling_price: '' })).toMatch(/price/)
  })

  it('uses size prices instead of the single price when sizes exist', () => {
    const withSizes = { ...base, selling_price: '', sizes: [{ name: 'M', selling_price: 80 }, { name: 'L', selling_price: 120 }] }
    expect(validateFoodForm(withSizes)).toBe('')
    expect(validateFoodForm({ ...withSizes, sizes: [{ name: 'M', selling_price: '' }] })).toMatch(/price for size M/)
  })

  it('loads an item with sizes into the edit form in order', () => {
    const form = foodToForm({
      name: 'Pizza',
      category_id: 'c1',
      home_category_id: 'h1',
      selling_price: 80,
      is_available: true,
      food_item_sizes: [
        { id: '2', name: 'L', selling_price: 120, sort_order: 2 },
        { id: '1', name: 'M', selling_price: 80, sort_order: 1, cost_price: 40 },
      ],
    })
    expect(form.home_category_id).toBe('h1')
    expect(form.sizes.map((s) => s.name)).toEqual(['M', 'L'])
    expect(form.sizes[0].cost_price).toBe(40)
  })
})

describe('home category form', () => {
  it('needs a short name', () => {
    expect(validateHomeCategory({ name: '' })).toMatch(/name/)
    expect(validateHomeCategory({ name: 'x'.repeat(41) })).toMatch(/40/)
    expect(validateHomeCategory({ name: 'Burgers' })).toBe('')
  })
})

describe('order status', () => {
  it('has readable labels', () => {
    expect(orderStatusInfo('PREPARING').label).toBe('Preparing')
    expect(orderStatusInfo('SOMETHING_NEW').label).toBe('Something new')
  })

  it('puts completed orders at the last tracker step', () => {
    expect(orderStepIndex('COMPLETED')).toBe(ORDER_STEPS.length - 1)
    expect(orderStepIndex('PREPARING')).toBe(2)
  })
})

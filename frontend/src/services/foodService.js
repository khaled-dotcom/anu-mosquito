import { supabase } from '../supabase'
import { validateSizes } from '../lib/pricing'

export async function saveCategory(
  restaurantId,
  categoryName,
  sortOrder
) {
  if (!categoryName.trim()) {
    return {
      data: null,
      error: new Error('Please enter category name.'),
    }
  }

  const { data, error } = await supabase
    .from('food_categories')
    .insert([
      {
        restaurant_id: restaurantId,
        name: categoryName.trim(),
        sort_order: Number(sortOrder) || 0,
        is_active: true,
      },
    ])
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function updateCategory(
  categoryId,
  categoryName,
  sortOrder
) {
  if (!categoryName.trim()) {
    return {
      data: null,
      error: new Error('Please enter category name.'),
    }
  }

  const { data, error } = await supabase
    .from('food_categories')
    .update({
      name: categoryName.trim(),
      sort_order: Number(sortOrder) || 0,
    })
    .eq('id', categoryId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function deleteCategory(categoryId) {
  const { data, error } = await supabase
    .from('food_categories')
    .delete()
    .eq('id', categoryId)
    .select()

  return {
    data,
    error,
  }
}

export async function loadMenuForRestaurant(restaurantId) {
  if (!restaurantId) {
    return {
      categories: [],
      items: [],
      categoriesError: null,
      itemsError: null,
    }
  }

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from('food_categories')
    .select(
      'id, restaurant_id, name, sort_order, is_active'
    )
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from('food_items')
    .select(
      'id, restaurant_id, category_id, home_category_id, name, description, image_url, selling_price, cost_price, is_available, food_item_sizes(id, name, selling_price, cost_price, sort_order, is_available)'
    )
    .eq('restaurant_id', restaurantId)
    .order('name', { ascending: true })

  return {
    categories: categories || [],
    items: items || [],
    categoriesError,
    itemsError,
  }
}

function cleanFood(foodForm) {
  const sizes = cleanSizes(foodForm.sizes)
  const basePrice = sizes.length > 0
    ? Math.min(...sizes.map((size) => size.selling_price))
    : Number(foodForm.selling_price)

  return {
    category_id: foodForm.category_id,
    home_category_id: foodForm.home_category_id || null,
    name: foodForm.name.trim(),
    description: (foodForm.description || '').trim() || null,
    image_url: (foodForm.image_url || '').trim() || null,
    selling_price: basePrice,
    cost_price:
      foodForm.cost_price === '' || foodForm.cost_price == null
        ? 0
        : Number(foodForm.cost_price),
    is_available: foodForm.is_available,
  }
}

function cleanSizes(sizes) {
  return (sizes || [])
    .filter((size) => String(size.name || '').trim() !== '')
    .map((size, index) => ({
      id: size.id || undefined,
      name: String(size.name).trim(),
      selling_price: Number(size.selling_price),
      cost_price: size.cost_price === '' || size.cost_price == null ? 0 : Number(size.cost_price),
      sort_order: index + 1,
      is_available: size.is_available !== false,
    }))
}

export function validateFoodForm(foodForm) {
  if (!foodForm.name.trim()) return 'Please enter food name.'
  if (!foodForm.category_id) return 'Please select a menu section.'

  const sizes = cleanSizes(foodForm.sizes)
  if (sizes.length === 0) {
    if (foodForm.selling_price === '' || !Number.isFinite(Number(foodForm.selling_price)) || Number(foodForm.selling_price) < 0)
      return 'Please enter a valid selling price.'
  }

  return validateSizes(foodForm.sizes || [])
}

/** Make the item's sizes in the database match the form. */
async function syncSizes(foodId, formSizes) {
  const sizes = cleanSizes(formSizes)

  const { data: existing, error: loadError } = await supabase
    .from('food_item_sizes')
    .select('id')
    .eq('food_item_id', foodId)
  if (loadError) return loadError

  const keepIds = new Set(sizes.filter((size) => size.id).map((size) => size.id))
  const removeIds = (existing || []).map((row) => row.id).filter((id) => !keepIds.has(id))

  if (removeIds.length > 0) {
    const { error } = await supabase.from('food_item_sizes').delete().in('id', removeIds)
    if (error) return error
  }

  for (const size of sizes) {
    const row = {
      food_item_id: foodId,
      name: size.name,
      selling_price: size.selling_price,
      cost_price: size.cost_price,
      sort_order: size.sort_order,
      is_available: size.is_available,
    }
    const { error } = size.id
      ? await supabase.from('food_item_sizes').update(row).eq('id', size.id)
      : await supabase.from('food_item_sizes').insert([row])
    if (error) return error
  }

  return null
}

export async function saveFoodItem(restaurantId, foodForm) {
  const problem = validateFoodForm(foodForm)
  if (problem) return { data: null, error: new Error(problem) }

  const { data, error } = await supabase
    .from('food_items')
    .insert([{ restaurant_id: restaurantId, ...cleanFood(foodForm) }])
    .select()
    .single()

  if (error) return { data: null, error }

  const sizeError = await syncSizes(data.id, foodForm.sizes)
  return { data, error: sizeError }
}

export async function updateFoodItem(foodId, foodForm) {
  const problem = validateFoodForm(foodForm)
  if (problem) return { data: null, error: new Error(problem) }

  const { data, error } = await supabase
    .from('food_items')
    .update(cleanFood(foodForm))
    .eq('id', foodId)
    .select('id, name, selling_price, cost_price, is_available')

  if (error) return { data: null, error }

  const sizeError = await syncSizes(foodId, foodForm.sizes)
  return { data, error: sizeError }
}

export async function deleteFoodItem(foodId) {
  const { data, error } = await supabase
    .from('food_items')
    .delete()
    .eq('id', foodId)
    .select()

  return {
    data,
    error,
  }
}

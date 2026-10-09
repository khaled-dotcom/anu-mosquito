import { supabase } from '../supabase'

const COLUMNS = 'id, name, icon, image_url, sort_order, is_active'

export async function loadHomeCategories({ includeInactive = false } = {}) {
  let query = supabase
    .from('home_categories')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (!includeInactive) query = query.eq('is_active', true)

  const { data, error } = await query
  return { data: data || [], error }
}

function cleanCategory(form) {
  return {
    name: String(form.name || '').trim(),
    icon: String(form.icon || '').trim() || null,
    image_url: String(form.image_url || '').trim() || null,
    sort_order: Number(form.sort_order) || 0,
    is_active: form.is_active !== false,
  }
}

export function validateHomeCategory(form) {
  if (!String(form?.name || '').trim()) return 'Please enter a category name.'
  if (String(form.name).trim().length > 40) return 'Keep the name under 40 characters.'
  return ''
}

export async function saveHomeCategory(form) {
  const problem = validateHomeCategory(form)
  if (problem) return { data: null, error: new Error(problem) }

  const payload = cleanCategory(form)
  const query = form.id
    ? supabase.from('home_categories').update(payload).eq('id', form.id)
    : supabase.from('home_categories').insert([payload])

  const { data, error } = await query.select(COLUMNS).single()
  return { data, error }
}

export async function deleteHomeCategory(id) {
  const { error } = await supabase.from('home_categories').delete().eq('id', id)
  return { error }
}

/** Food items linked to home categories, with their restaurant, for the student home page. */
export async function loadCategoryDishes() {
  const { data, error } = await supabase
    .from('food_items')
    .select(
      'id, name, image_url, selling_price, restaurant_id, home_category_id, is_available, food_item_sizes(id, name, selling_price, sort_order, is_available)'
    )
    .not('home_category_id', 'is', null)
    .eq('is_available', true)
    .order('name', { ascending: true })

  return { data: data || [], error }
}

/** How many food items use each home category (admin list). */
export async function countDishesPerCategory() {
  const { data, error } = await supabase
    .from('food_items')
    .select('home_category_id')
    .not('home_category_id', 'is', null)

  const counts = {}
  for (const row of data || []) {
    counts[row.home_category_id] = (counts[row.home_category_id] || 0) + 1
  }
  return { data: counts, error }
}

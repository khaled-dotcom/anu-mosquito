import { supabase } from '../supabase'

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
      'id, restaurant_id, category_id, name, description, image_url, selling_price, cost_price, is_available'
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

export async function saveFoodItem(
  restaurantId,
  foodForm
) {
  if (!foodForm.name.trim()) {
    return {
      data: null,
      error: new Error('Please enter food name.'),
    }
  }

  if (!foodForm.category_id) {
    return {
      data: null,
      error: new Error('Please select a category.'),
    }
  }

  if (
    foodForm.selling_price === '' ||
    Number(foodForm.selling_price) < 0
  ) {
    return {
      data: null,
      error: new Error('Please enter a valid selling price.'),
    }
  }

  const { data, error } = await supabase
    .from('food_items')
    .insert([
      {
        restaurant_id: restaurantId,
        category_id: foodForm.category_id,
        name: foodForm.name.trim(),
        description:
          foodForm.description.trim() || null,
        image_url:
          foodForm.image_url.trim() || null,
        selling_price: Number(foodForm.selling_price),
        cost_price:
          foodForm.cost_price === ''
            ? null
            : Number(foodForm.cost_price),
        is_available: foodForm.is_available,
      },
    ])
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function updateFoodItem(
  foodId,
  foodForm
) {
  if (!foodForm.name.trim()) {
    return {
      data: null,
      error: new Error('Please enter food name.'),
    }
  }

  if (!foodForm.category_id) {
    return {
      data: null,
      error: new Error('Please select a category.'),
    }
  }

  if (
    foodForm.selling_price === '' ||
    Number(foodForm.selling_price) < 0
  ) {
    return {
      data: null,
      error: new Error('Please enter a valid selling price.'),
    }
  }

  const { data, error } = await supabase
    .from('food_items')
    .update({
      name: foodForm.name.trim(),
      category_id: foodForm.category_id,
      description:
        foodForm.description.trim() || null,
      image_url:
        foodForm.image_url.trim() || null,
      selling_price: Number(foodForm.selling_price),
      cost_price:
        foodForm.cost_price === ''
          ? null
          : Number(foodForm.cost_price),
      is_available: foodForm.is_available,
    })
    .eq('id', foodId)
.select('id, name, selling_price, cost_price, is_available')

  return {
    data,
    error,
  }
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
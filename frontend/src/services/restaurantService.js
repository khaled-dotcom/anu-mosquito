import { supabase } from '../supabase'

export async function loadRestaurants() {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      'id, name, code, description, image_url, is_active'
    )
    .order('name', { ascending: true })

  if (error) {
    console.error('Restaurants error:', error)
    return {
      data: [],
      error,
    }
  }

  return {
    data: data || [],
    error: null,
  }
}

export async function saveRestaurant(restaurantForm) {
  if (!restaurantForm.name.trim()) {
    return {
      data: null,
      error: new Error('Please enter restaurant name.'),
    }
  }

  if (!restaurantForm.code.trim()) {
    return {
      data: null,
      error: new Error('Please enter restaurant code.'),
    }
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert([
      {
        name: restaurantForm.name.trim(),
        code: restaurantForm.code.trim(),
        description:
          restaurantForm.description.trim() || null,
        image_url:
          restaurantForm.image_url.trim() || null,
        is_active: restaurantForm.is_active,
      },
    ])
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function updateRestaurant(
  restaurantId,
  restaurantForm
) {
  if (!restaurantForm.name.trim()) {
    return {
      data: null,
      error: new Error('Please enter restaurant name.'),
    }
  }

  if (!restaurantForm.code.trim()) {
    return {
      data: null,
      error: new Error('Please enter restaurant code.'),
    }
  }

  const { data, error } = await supabase
    .from('restaurants')
    .update({
      name: restaurantForm.name.trim(),
      code: restaurantForm.code.trim(),
      description:
        restaurantForm.description.trim() || null,
      image_url:
        restaurantForm.image_url.trim() || null,
      is_active: restaurantForm.is_active,
    })
    .eq('id', restaurantId)
    .select()

  return {
    data: data?.[0] || null,
    error,
  }
}

export async function toggleRestaurantStatus(
  restaurantId,
  newStatus
) {
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      is_active: newStatus,
    })
    .eq('id', restaurantId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function deleteRestaurant(restaurantId) {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', restaurantId)

  return {
    error,
  }
}


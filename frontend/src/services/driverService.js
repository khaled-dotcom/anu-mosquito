import { supabase } from '../supabase'

export async function loadDrivers() {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select(`
      id,
      is_active,
      created_at,
      profiles (
  id,
  driver_id,
  full_name,
  phone,
  role
)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function createDriver(driverData) {
  const { data, error } = await supabase.functions.invoke(
    'create-driver',
    {
      body: {
  driver_id: driverData.driver_id,
  full_name: driverData.full_name,
  email: driverData.email,
  phone: driverData.phone,
  password: driverData.password,
},
    }
  )

  if (error) {
    console.error('CREATE DRIVER ERROR:', error)

    if (error.context) {
      try {
        const errorBody = await error.context.clone().json()
        console.error('CREATE DRIVER RESPONSE:', errorBody)

        if (errorBody?.error) {
          return {
            data: null,
            error: new Error(errorBody.error),
          }
        }
      } catch {
        // Keep original error
      }
    }

    return {
      data: null,
      error,
    }
  }

  if (data?.error) {
    return {
      data: null,
      error: new Error(data.error),
    }
  }

  return {
    data,
    error: null,
  }
}

export async function updateDriverStatus(
  driverId,
  isActive
) {
  const { data, error } = await supabase
    .from('driver_profiles')
    .update({
      is_active: isActive,
    })
    .eq('id', driverId)
    .select(`
      id,
      is_active,
      created_at,
      profiles (
  id,
  driver_id,
  full_name,
  phone,
  role
)
    `)
    .single()

  return { data, error }
}

export async function updateDriver(driverData) {
  const { data, error } = await supabase.functions.invoke(
    'update-driver',
    {
      body: {
        driver_id: driverData.driver_id,
        full_name: driverData.full_name,
        email: driverData.email,
        phone: driverData.phone,
        password: driverData.password || '',
      },
    }
  )

  if (error) {
    console.error('UPDATE DRIVER ERROR:', error)

    if (error.context) {
      try {
        const errorBody = await error.context.clone().json()

        if (errorBody?.error) {
          return {
            data: null,
            error: new Error(errorBody.error),
          }
        }
      } catch {
        // Keep original error
      }
    }

    return {
      data: null,
      error,
    }
  }

  if (data?.error) {
    return {
      data: null,
      error: new Error(data.error),
    }
  }

  return {
    data,
    error: null,
  }
}

export async function deleteDriver(driverId) {
  const { data, error } = await supabase.functions.invoke(
    'delete-driver',
    {
      body: {
        driver_id: driverId,
      },
    }
  )

  if (error) {
    console.error('DELETE DRIVER ERROR:', error)

    if (error.context) {
      try {
        const errorBody = await error.context.clone().json()

        if (errorBody?.error) {
          return {
            data: null,
            error: new Error(errorBody.error),
          }
        }
      } catch {
        // Keep original error
      }
    }

    return {
      data: null,
      error,
    }
  }

  if (data?.error) {
    return {
      data: null,
      error: new Error(data.error),
    }
  }

  return {
    data,
    error: null,
  }
}
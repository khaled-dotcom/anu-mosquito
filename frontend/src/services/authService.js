import { supabase } from '../supabase'

export function getAuthEmail(id) {
  if (id === '9000001') return 'admin@anu-mosquito.com'
  return `${id}@anu-mosquito.com`
}

export async function loginUser(id, password) {
  const cleanId = id.trim()

  // Keep the reserved admin and moderator IDs on their existing login path.
  if (cleanId === '5555555' || cleanId === '9000001') {
    return supabase.auth.signInWithPassword({
      email: getAuthEmail(cleanId),
      password,
    })
  }

  if (!/^\d{7}$/.test(cleanId)) {
    return { data: null, error: new Error('ID must contain exactly 7 digits.') }
  }

  // Try student credentials first. Restaurant IDs are also seven digits, but
  // the restaurant fallback is only attempted if student and driver login fail.
  const { data: studentData, error: studentError } =
    await supabase.auth.signInWithPassword({
      email: getAuthEmail(cleanId),
      password,
    })

  if (!studentError && studentData?.session) {
    return { data: studentData, error: null }
  }

  const { data: driverData, error: driverError } =
    await supabase.functions.invoke('driver-login', {
      body: { driver_id: cleanId, password },
    })

  if (!driverError && !driverData?.error && driverData?.session) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession(driverData.session)
    return { data: sessionData, error: sessionError }
  }

  // Restaurant account email is internal; the user only enters their 7-digit code.
  const { data: restaurantData, error: restaurantError } =
    await supabase.auth.signInWithPassword({
      email: `toktok-${cleanId}@login.anumosquito.com`,
      password,
    })

  if (!restaurantError && restaurantData?.session) {
    return { data: restaurantData, error: null }
  }

  return {
    data: null,
    error: studentError || driverError || restaurantError || new Error('Login failed.'),
  }
}

import { supabase } from '../supabase'

export function getAuthEmail(id) {
  if (id === '9000001') {
    return 'admin@anu-mosquito.com'
  }

  return `${id}@anu-mosquito.com`
}

export async function loginUser(id, password) {
  const cleanId = id.trim()

  // Moderator
if (cleanId === '5555555') {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: getAuthEmail(cleanId),
      password,
    })

  return {
    data,
    error,
  }
}

// Admin
if (cleanId === '9000001') {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: getAuthEmail(cleanId),
      password,
    })

  return {
    data,
    error,
  }
}
  // Student login first
  if (/^\d{7}$/.test(cleanId)) {
    const { data: studentData, error: studentError } =
      await supabase.auth.signInWithPassword({
        email: getAuthEmail(cleanId),
        password,
      })

    // If Student login works, return immediately
    if (!studentError && studentData?.session) {
      return {
        data: studentData,
        error: null,
      }
    }

    // If Student login fails, try Driver login
    const { data: driverData, error: driverError } =
      await supabase.functions.invoke('driver-login', {
        body: {
          driver_id: cleanId,
          password,
        },
      })

    if (driverError) {
      return {
        data: null,
        error: studentError || driverError,
      }
    }

    if (driverData?.error) {
      return {
        data: null,
        error: studentError || new Error(driverData.error),
      }
    }

    if (!driverData?.session) {
      return {
        data: null,
        error: studentError || new Error('Login failed.'),
      }
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession(driverData.session)

    if (sessionError) {
      return {
        data: null,
        error: sessionError,
      }
    }

    return {
      data: sessionData,
      error: null,
    }
  }

  return {
    data: null,
    error: new Error('ID must contain exactly 7 digits.'),
  }


}
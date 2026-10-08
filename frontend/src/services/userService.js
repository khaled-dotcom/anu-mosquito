import { supabase } from '../supabase'

export async function loadUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      university_id,
      phone,
      role,
      admin_id,
      created_at
    `)
    .order('created_at', { ascending: false })

  return {
    data,
    error,
  }
}

export async function updateUser(userId, userData) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
    })
    .eq('id', userId)
    .select(`
      id,
      full_name,
      university_id,
      phone,
      role,
      admin_id,
      created_at
    `)
    .single()

  return {
    data,
    error,
  }
}
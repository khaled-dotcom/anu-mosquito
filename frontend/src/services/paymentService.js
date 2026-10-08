import { supabase } from '../supabase'

export async function loadActivePaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return {
    data,
    error,
  }
}

export async function loadPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: true })

  return {
    data,
    error,
  }
}

export async function createPaymentMethod(paymentMethod) {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert([paymentMethod])
    .select()
    .single()

  return { data, error }
}

export async function updatePaymentMethod(id, paymentMethod) {
  const { data, error } = await supabase
    .from('payment_methods')
    .update(paymentMethod)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deletePaymentMethod(id) {
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id)

  return { error }
}

export async function togglePaymentMethodStatus(id, isActive) {
  const { data, error } = await supabase
    .from('payment_methods')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function uploadPaymentProof(file, studentId) {
  const fileExtension = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExtension}`
  const filePath = `${studentId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file)

  return {
    data,
    error,
    filePath,
  }
}
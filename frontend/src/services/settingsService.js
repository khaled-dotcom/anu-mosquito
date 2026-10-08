import { supabase } from '../supabase'

export async function loadDeliverySettings() {
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data,
    error,
  }
}

export async function updateDeliveryFee(id, deliveryFee) {
  const { data, error } = await supabase
    .from('delivery_settings')
    .update({
      delivery_fee: deliveryFee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  return {
    data,
    error,
  }
}
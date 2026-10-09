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
export async function loadDeliveryFeeTiers() {
  const { data, error } = await supabase
    .from('delivery_fee_tiers')
    .select('id, min_order_total, fee')
    .order('min_order_total', { ascending: true })

  return { data: data || [], error }
}

/** Replace all tiers with the given list ([{ min_order_total, fee }]). */
export async function saveDeliveryFeeTiers(tiers) {
  const rows = tiers.map((tier) => ({
    min_order_total: Number(tier.min_order_total),
    fee: Number(tier.fee),
  }))

  const { data: existing, error: loadError } = await supabase
    .from('delivery_fee_tiers')
    .select('id, min_order_total')

  if (loadError) return { data: null, error: loadError }

  const keep = new Set(rows.map((row) => row.min_order_total))
  const removeIds = (existing || [])
    .filter((row) => !keep.has(Number(row.min_order_total)))
    .map((row) => row.id)

  if (removeIds.length > 0) {
    const { error } = await supabase.from('delivery_fee_tiers').delete().in('id', removeIds)
    if (error) return { data: null, error }
  }

  const { data, error } = await supabase
    .from('delivery_fee_tiers')
    .upsert(rows, { onConflict: 'min_order_total' })
    .select('id, min_order_total, fee')

  if (!error && rows.some((row) => row.min_order_total === 0)) {
    // Keep the old flat fee in sync with the base tier for older screens.
    const base = rows.find((row) => row.min_order_total === 0)
    const { data: settings } = await loadDeliverySettings()
    if (settings?.id) await updateDeliveryFee(settings.id, base.fee)
  }

  return { data, error }
}

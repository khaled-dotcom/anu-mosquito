import { supabase } from '../supabase'

export async function loadBatches() {
  const { data, error } = await supabase
    .from('delivery_batches')
    .select('*')
    .order('delivery_date', { ascending: true })
    .order('batch_number', { ascending: true })

  return {
    data,
    error,
  }
}

export async function saveBatch(batchData) {
  if (!batchData.batch_number) {
    return {
      data: null,
      error: new Error('Please enter batch number.'),
    }
  }

  if (!batchData.registration_start) {
    return {
      data: null,
      error: new Error('Please enter registration start time.'),
    }
  }

  if (!batchData.registration_end) {
    return {
      data: null,
      error: new Error('Please enter registration end time.'),
    }
  }

  if (!batchData.delivery_time) {
    return {
      data: null,
      error: new Error('Please enter delivery time.'),
    }
  }

  if (!batchData.delivery_date) {
    return {
      data: null,
      error: new Error('Please enter delivery date.'),
    }
  }

  if (!batchData.maximum_orders || Number(batchData.maximum_orders) <= 0) {
    return {
      data: null,
      error: new Error('Maximum orders must be greater than 0.'),
    }
  }

  const { data, error } = await supabase
    .from('delivery_batches')
    .insert([
      {
        batch_number: Number(batchData.batch_number),
        registration_start: batchData.registration_start,
        registration_end: batchData.registration_end,
        delivery_time: batchData.delivery_time,
        delivery_date: batchData.delivery_date,
        maximum_orders: Number(batchData.maximum_orders),
        driver_cost: Math.max(0, Number(batchData.driver_cost || 0)),
        is_active: batchData.is_active ?? true,
      },
    ])
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function updateBatch(batchId, batchData) {
  if (!batchData.batch_number) {
    return {
      data: null,
      error: new Error('Please enter batch number.'),
    }
  }

  if (!batchData.registration_start) {
    return {
      data: null,
      error: new Error('Please enter registration start time.'),
    }
  }

  if (!batchData.registration_end) {
    return {
      data: null,
      error: new Error('Please enter registration end time.'),
    }
  }

  if (!batchData.delivery_time) {
    return {
      data: null,
      error: new Error('Please enter delivery time.'),
    }
  }

  if (!batchData.delivery_date) {
    return {
      data: null,
      error: new Error('Please enter delivery date.'),
    }
  }

  if (!batchData.maximum_orders || Number(batchData.maximum_orders) <= 0) {
    return {
      data: null,
      error: new Error('Maximum orders must be greater than 0.'),
    }
  }

  const { data, error } = await supabase
    .from('delivery_batches')
    .update({
      batch_number: Number(batchData.batch_number),
      registration_start: batchData.registration_start,
      registration_end: batchData.registration_end,
      delivery_time: batchData.delivery_time,
      delivery_date: batchData.delivery_date,
      maximum_orders: Number(batchData.maximum_orders),
      driver_cost: Math.max(0, Number(batchData.driver_cost || 0)),
      is_active: batchData.is_active ?? true,
    })
    .eq('id', batchId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function toggleBatchStatus(batchId, isActive) {
  const { data, error } = await supabase
    .from('delivery_batches')
    .update({
      is_active: isActive,
    })
    .eq('id', batchId)
    .select()
    .single()

  return {
    data,
    error,
  }
}

export async function deleteBatch(batchId) {
  const { data, error } = await supabase
    .from('delivery_batches')
    .delete()
    .eq('id', batchId)
    .select()

  return {
    data,
    error,
  }
}

export async function getBatchDriver(batchId) {
  const { data, error } = await supabase
    .from('driver_batch_assignments')
    .select(`
      id,
      driver_id,
      batch_id,
      assigned_at
    `)
    .eq('batch_id', batchId)
    .maybeSingle()

  return { data, error }
}
export async function assignDriverToBatch(batchId, driverId) {
  const { error } = await supabase.rpc('assign_driver_to_batch', {
    p_batch_id: batchId,
    p_driver_id: driverId || null,
  })

  return { error }
}


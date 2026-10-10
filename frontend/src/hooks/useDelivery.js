import { useState } from 'react'
import {
  loadBatches as fetchBatches,
  saveBatch,
  updateBatch,
  toggleBatchStatus,
  deleteBatch,
  getBatchDriver,
  assignDriverToBatch,
} from '../services/deliveryService'

import { loadDrivers } from '../services/driverService'

function useDelivery() {
  const [batches, setBatches] = useState([])
  const [batchSearch, setBatchSearch] = useState('')

  const [showBatchForm, setShowBatchForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)
  const [drivers, setDrivers] = useState([])
const [batchDrivers, setBatchDrivers] = useState({})
const [driverAssigning, setDriverAssigning] = useState(false)

  const [batchForm, setBatchForm] = useState({
    batch_number: '',
    registration_start: '',
    registration_end: '',
    delivery_time: '',
    delivery_date: '',
    maximum_orders: 20,
    driver_cost: 0,
    is_active: true,
  })

  async function loadBatches() {
    setBatchLoading(true)

    const { data, error } = await fetchBatches()

    if (error) {
  console.error('Load batches error:', error)
  setBatches([])
} else {
  setBatches(data || [])
  await loadBatchDrivers(data || [])
}

setBatchLoading(false)
  }

  async function loadBatchDrivers(batchList) {
  const { data: driverData, error: driverError } = await loadDrivers()

  if (driverError) {
    console.error('Load drivers error:', driverError)
    return
  }

  setDrivers(driverData || [])

  const assignments = {}

  for (const batch of batchList || []) {
    const { data, error } = await getBatchDriver(batch.id)

    if (error) {
      console.error('Load batch driver error:', error)
      continue
    }

    assignments[batch.id] = data?.driver_id || null
  }

  setBatchDrivers(assignments)
}

async function handleAssignDriver(batchId, driverId) {
  setDriverAssigning(true)

  const { error } = await assignDriverToBatch(
    batchId,
    driverId || null
  )

  if (error) {
    console.error('Assign driver error:', error)
    alert(error.message)
    setDriverAssigning(false)
    return
  }

  setBatchDrivers((prev) => ({
    ...prev,
    [batchId]: driverId || null,
  }))

  setDriverAssigning(false)
}

  function resetBatchForm() {
    setBatchForm({
      batch_number: '',
      registration_start: '',
      registration_end: '',
      delivery_time: '',
      delivery_date: '',
      maximum_orders: 20,
      is_active: true,
    })

    setEditingBatch(null)
  }

  function openAddBatchForm() {
    resetBatchForm()
    setShowBatchForm(true)
  }

  function openEditBatchForm(batch) {
    setEditingBatch(batch)

    setBatchForm({
      batch_number: batch.batch_number ?? '',
      registration_start: batch.registration_start
        ? batch.registration_start.slice(0, 16)
        : '',
      registration_end: batch.registration_end
        ? batch.registration_end.slice(0, 16)
        : '',
      delivery_time: batch.delivery_time
        ? batch.delivery_time.slice(0, 16)
        : '',
      delivery_date: batch.delivery_date || '',
      maximum_orders: batch.maximum_orders ?? 20,
      driver_cost: batch.driver_cost ?? 0,
      is_active: batch.is_active ?? true,
    })

    setShowBatchForm(true)
  }

  function closeBatchForm() {
    setShowBatchForm(false)
    resetBatchForm()
  }

  async function handleSaveBatch() {
    setBatchSaving(true)

    const batchData = {
      batch_number: batchForm.batch_number,
      registration_start: batchForm.registration_start,
      registration_end: batchForm.registration_end,
      delivery_time: batchForm.delivery_time,
      delivery_date: batchForm.delivery_date,
      maximum_orders: batchForm.maximum_orders,
      driver_cost: batchForm.driver_cost,
      is_active: batchForm.is_active,
    }

    let result

    if (editingBatch) {
      result = await updateBatch(
        editingBatch.id,
        batchData
      )
    } else {
      result = await saveBatch(batchData)
    }

    if (result?.error) {
      console.error('Save batch error:', result.error)
      alert(result.error.message)
      setBatchSaving(false)
      return
    }

    await loadBatches()

    closeBatchForm()

    setBatchSaving(false)
  }

  async function handleToggleBatch(batch) {
    const { error } = await toggleBatchStatus(
      batch.id,
      !batch.is_active
    )

    if (error) {
      console.error('Toggle batch error:', error)
      alert(error.message)
      return
    }

    await loadBatches()
  }

  async function handleDeleteBatch(batch) {
    const confirmed = window.confirm(
      `Are you sure you want to delete Batch ${batch.batch_number}?`
    )

    if (!confirmed) {
      return
    }

    const { error } = await deleteBatch(batch.id)

    if (error) {
      console.error('Delete batch error:', error)
      alert(error.message)
      return
    }

    await loadBatches()
  }

  const filteredBatches = batches.filter((batch) => {
    const search = batchSearch.toLowerCase().trim()

    if (!search) {
      return true
    }

    return (
      String(batch.batch_number)
        .toLowerCase()
        .includes(search) ||
      batch.delivery_date
        ?.toLowerCase()
        .includes(search)
    )
  })

  return {
    batches,
    setBatches,

        drivers,
    batchDrivers,
    driverAssigning,
    handleAssignDriver,

    batchSearch,
    setBatchSearch,
    filteredBatches,

    showBatchForm,
    setShowBatchForm,

    editingBatch,

    batchForm,
    setBatchForm,

    batchLoading,
    batchSaving,

    loadBatches,
    resetBatchForm,
    openAddBatchForm,
    openEditBatchForm,
    closeBatchForm,

    handleSaveBatch,
    handleToggleBatch,
    handleDeleteBatch,
  }

}


export default useDelivery
import { useEffect, useState } from 'react'
import Button from '../../common/Button'
import {
  loadDrivers,
  createDriver,
  updateDriverStatus,
  updateDriver,
  deleteDriver,
} from '../../../services/driverService'
import './DriverManagement.css'

function DriverManagement() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)

  const [driverId, setDriverId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadData() {
    setLoading(true)

    const { data, error } = await loadDrivers()

    if (error) {
      console.error('Drivers error:', error)
      setMessage(error.message)
      setLoading(false)
      return
    }

    setDrivers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreateDriver(e) {
    e.preventDefault()

    setMessage('')

    const cleanDriverId = driverId.trim().toUpperCase()

    if (!cleanDriverId) {
      setMessage('Please enter Driver ID.')
      return
    }

   if (!/^\d{7}$/.test(cleanDriverId)) {
  setMessage('Driver ID must contain exactly 7 digits.')
  return
}

    if (!fullName.trim()) {
      setMessage('Please enter driver name.')
      return
    }

    if (!email.trim()) {
      setMessage('Please enter driver email.')
      return
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      setMessage('Please enter a valid email address.')
      return
    }

    if (!/^01[0125]\d{8}$/.test(phone)) {
      setMessage(
        'Please enter a valid Egyptian phone number.'
      )
      return
    }

    if (password.length < 6) {
      setMessage(
        'Password must be at least 6 characters.'
      )
      return
    }

    setSaving(true)

    const { error } = await createDriver({
      driver_id: cleanDriverId,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone,
      password,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setDriverId('')
    setFullName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setShowForm(false)

    setMessage(
      'Driver account created successfully.'
    )

    await loadData()

    setSaving(false)
  }

  async function handleToggleStatus(driver) {
    const currentStatus = driver.is_active
    const newStatus = !currentStatus

    const { data, error } =
      await updateDriverStatus(
        driver.id,
        newStatus
      )

    if (error) {
      console.error(
        'Update driver status error:',
        error
      )

      setMessage(error.message)
      return
    }

    setDrivers((currentDrivers) =>
      currentDrivers.map((item) =>
        item.id === driver.id
          ? {
              ...item,
              is_active:
                data?.is_active ?? newStatus,
            }
          : item
      )
    )

    setMessage(
      newStatus
        ? 'Driver activated successfully.'
        : 'Driver deactivated successfully.'
    )
  }


function handleStartEdit(driver) {
  setEditingDriver(driver)

  setDriverId(driver.profiles?.driver_id || '')
  setFullName(driver.profiles?.full_name || '')
  setEmail('')
  setPhone(driver.profiles?.phone || '')
  setEditPassword('')

  setShowForm(false)
  setMessage('')
}  

async function handleUpdateDriver(e) {
  e.preventDefault()

  const cleanDriverId = driverId.trim()

  if (!/^\d{7}$/.test(cleanDriverId)) {
    setMessage('Driver ID must contain exactly 7 digits.')
    return
  }

  if (!fullName.trim()) {
    setMessage('Full name is required.')
    return
  }

  if (!email.trim()) {
    setMessage('Email is required.')
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    setMessage('Please enter a valid email.')
    return
  }

  if (!/^01[0125]\d{8}$/.test(phone)) {
    setMessage('Please enter a valid Egyptian phone number.')
    return
  }

  if (editPassword && editPassword.length < 6) {
    setMessage('Password must be at least 6 characters.')
    return
  }

  setSaving(true)
  setMessage('')

  const { error } = await updateDriver({
    driver_id: cleanDriverId,
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone,
    password: editPassword,
  })

  setSaving(false)

  if (error) {
    setMessage(error.message || 'Failed to update driver.')
    return
  }

  setMessage('Driver updated successfully.')

  setEditingDriver(null)
  setDriverId('')
  setFullName('')
  setEmail('')
  setPhone('')
  setEditPassword('')

  await loadData()
}

async function handleDeleteDriver(driver) {
  const driverId = driver.profiles?.driver_id

  if (!driverId) {
    setMessage('Driver ID not found.')
    return
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete driver ${driverId}?`
  )

  if (!confirmed) return

  setSaving(true)
  setMessage('')

  const { error } = await deleteDriver(driverId)

  setSaving(false)

  if (error) {
    setMessage(error.message || 'Failed to delete driver.')
    return
  }

  setMessage('Driver deleted successfully.')

  await loadData()
}

  return (
    <div className="driver-management">

      <div className="driver-header">
        <div>
          <h2>Drivers</h2>
          <p>
            Create and manage delivery driver accounts.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setShowForm(!showForm)
            setMessage('')
          }}
        >
          {showForm ? 'Cancel' : 'Add Driver'}
        </Button>
      </div>

      {message && (
        <div className="driver-message">
          {message}
        </div>
      )}

      {(showForm || editingDriver) && (
        <form
  className="driver-form"
  onSubmit={editingDriver ? handleUpdateDriver : handleCreateDriver}
>
          <h3>
  {editingDriver ? (
  <>
    <label>
      New Password (optional)
    </label>

    <input
      type="password"
      value={editPassword}
      onChange={(e) => setEditPassword(e.target.value)}
      placeholder="Leave empty to keep current password"
    />
  </>
) : (
  <>
    <label>Password</label>

    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Enter password"
    />
  </>
)}
</h3>

          <div className="driver-form-grid">

            <div className="driver-field">
              <label>Driver ID</label>

              <input
  type="text"
  value={driverId}
  onChange={(e) =>
    setDriverId(e.target.value.replace(/\D/g, '').slice(0, 7))
  }
  maxLength={7}
  disabled={!!editingDriver}
  placeholder="7-digit Driver ID"
/>
            </div>

            <div className="driver-field">
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Driver full name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
              />
            </div>

            <div className="driver-field">
              <label>Email</label>

              <input
                type="email"
                placeholder="driver@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            <div className="driver-field">
              <label>Phone</label>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                required
              />
            </div>

            <div className="driver-field">
              <label>Password</label>

              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                minLength={6}
                required
              />
            </div>

          </div>

          <div className="driver-form-actions">
            <Button type="submit" variant="primary">
  {saving
    ? 'Saving...'
    : editingDriver
      ? 'Save Changes'
      : 'Create Driver'}
</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="empty-drivers">
          <p>Loading drivers...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="empty-drivers">
          <h3>No drivers yet</h3>
          <p>
            Create the first driver account.
          </p>
        </div>
      ) : (
        <div className="drivers-table-container">
          <table className="drivers-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>

                  <td>
                    {driver.profiles?.driver_id ||
                      '—'}
                  </td>

                  <td>
                    {driver.profiles?.full_name ||
                      '—'}
                  </td>

                  <td>
                    {driver.profiles?.phone ||
                      '—'}
                  </td>

                  <td>
                    <span
                      className={`driver-status ${
                        driver.is_active
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      {driver.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </td>

                  <td>
                    {driver.created_at
                      ? new Date(
                          driver.created_at
                        ).toLocaleDateString()
                      : '—'}
                  </td>

                  <td className="driver-actions">
  <Button
    variant="secondary"
    onClick={() => handleStartEdit(driver)}
  >
    Edit
  </Button>

  <Button
    variant="danger"
    onClick={() => handleDeleteDriver(driver)}
  >
    Delete
  </Button>

  <Button
    variant={driver.is_active ? 'danger' : 'secondary'}
    onClick={() => handleToggleStatus(driver)}
  >
    {driver.is_active ? 'Deactivate' : 'Activate'}
  </Button>
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default DriverManagement
import { useEffect, useState } from 'react'
import {
  loadDeliverySettings,
  updateDeliveryFee,
} from '../../../services/settingsService'
import Button from '../../common/Button'
import './DeliverySettings.css'

function DeliverySettings() {
  const [settings, setSettings] = useState(null)
  const [deliveryFee, setDeliveryFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setMessage('')

    const { data, error } = await loadDeliverySettings()

    if (error) {
      console.error(error)
      setMessage('Failed to load delivery settings.')
      setLoading(false)
      return
    }

    setSettings(data)
    setDeliveryFee(data?.delivery_fee ?? '')
    setLoading(false)
  }

  async function handleSave() {
    const fee = Number(deliveryFee)

    if (!Number.isFinite(fee) || fee < 0) {
      setMessage('Please enter a valid delivery fee.')
      return
    }

    if (!settings?.id) {
      setMessage('Delivery settings not found.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await updateDeliveryFee(
      settings.id,
      fee
    )

    if (error) {
      console.error(error)
      setMessage('Failed to update delivery fee.')
      setSaving(false)
      return
    }

    setSettings(data)
    setDeliveryFee(data.delivery_fee)
    setMessage('Delivery fee updated successfully.')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="delivery-settings-loading">
        Loading delivery settings...
      </div>
    )
  }

  return (
    <div className="delivery-settings">
      <div className="delivery-settings-header">
        <div>
          <h2>Delivery Settings</h2>
          <p>
            Manage the delivery fee charged to students.
          </p>
        </div>
      </div>

      <div className="delivery-settings-card">
        <div className="delivery-settings-card-header">
          <div className="delivery-settings-icon">
            🚚
          </div>

          <div>
            <h3>Delivery Fee</h3>
            <p>
              This fee will be added to the student's order total.
            </p>
          </div>
        </div>

        <div className="delivery-fee-field">
          <label htmlFor="delivery-fee">
            Delivery Fee
          </label>

          <div className="delivery-fee-input-wrapper">
            <input
              id="delivery-fee"
              type="number"
              min="0"
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0.00"
            />

            <span>EGP</span>
          </div>
        </div>

        <div className="delivery-settings-actions">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {message && (
          <div
            className={`delivery-settings-message ${
              message.includes('successfully')
                ? 'success'
                : 'error'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliverySettings
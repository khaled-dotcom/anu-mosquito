import { useEffect, useMemo, useState } from 'react'
import {
  loadDeliveryFeeTiers,
  loadDeliverySettings,
  saveDeliveryFeeTiers,
} from '../../../services/settingsService'
import Icon from '../../common/Icon'
import { deliveryFeeFor, formatEGP, sortTiers, validateTiers } from '../../../lib/pricing'
import './DeliverySettings.css'

function toRows(tiers) {
  return sortTiers(tiers).map((tier, index) => ({
    key: tier.id || `row-${index}`,
    min_order_total: String(tier.min_order_total),
    fee: String(tier.fee),
  }))
}

// Delivery fee tiers: the fee depends on the order's food total.
// e.g. 0+ → 25 EGP, 500+ → 40 EGP.
function DeliverySettings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', ok: false })
  const [previewTotal, setPreviewTotal] = useState('250')

  useEffect(() => {
    let cancelled = false

    Promise.all([loadDeliveryFeeTiers(), loadDeliverySettings()]).then(
      ([{ data: tiers, error }, { data: settings }]) => {
        if (cancelled) return
        if (error) setMessage({ text: 'Failed to load delivery fees.', ok: false })
        const initial = tiers.length > 0 ? tiers : [{ min_order_total: 0, fee: settings?.delivery_fee ?? 0 }]
        setRows(toRows(initial))
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
    }
  }, [])

  const problem = useMemo(() => validateTiers(rows), [rows])
  const previewFee = deliveryFeeFor(previewTotal, problem ? [] : rows)

  function update(index, patch) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    setMessage({ text: '', ok: false })
  }

  function addRow() {
    const highest = sortTiers(rows).at(-1)
    const nextMin = highest ? Number(highest.min_order_total) + 250 : 0
    const nextFee = highest ? Number(highest.fee) + 10 : 0
    setRows((current) => [...current, { key: `new-${Date.now()}`, min_order_total: String(nextMin), fee: String(nextFee) }])
  }

  function removeRow(index) {
    setRows((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (problem) {
      setMessage({ text: problem, ok: false })
      return
    }

    setSaving(true)
    const { data, error } = await saveDeliveryFeeTiers(rows)
    setSaving(false)

    if (error) {
      console.error(error)
      setMessage({ text: error.message || 'Failed to save delivery fees.', ok: false })
      return
    }

    setRows(toRows(data || rows))
    setMessage({ text: 'Delivery fees saved. New orders use them right away.', ok: true })
  }

  if (loading) {
    return <div className="delivery-settings-loading">Loading delivery settings...</div>
  }

  const sorted = sortTiers(rows)

  return (
    <div className="delivery-settings">
      <div className="delivery-settings-header">
        <div>
          <h2>Delivery Settings</h2>
          <p>Set the delivery fee by order size. Bigger orders can pay a different fee.</p>
        </div>
      </div>

      <div className="delivery-settings-card">
        <div className="delivery-settings-card-header">
          <div className="delivery-settings-icon">🚚</div>
          <div>
            <h3>Delivery fee tiers</h3>
            <p>Each tier applies from its amount up to the next tier. The food total decides the tier.</p>
          </div>
        </div>

        <div className="tiers-table" role="table" aria-label="Delivery fee tiers">
          <div className="tiers-row tiers-head" role="row">
            <span role="columnheader">Food total from</span>
            <span role="columnheader">Delivery fee</span>
            <span role="columnheader">Applies to</span>
            <span />
          </div>

          {rows.map((row, index) => {
            const position = sorted.findIndex((tier) => tier.key === row.key)
            const next = sorted[position + 1]
            const range = next
              ? `${formatEGP(row.min_order_total || 0)} – ${formatEGP(Number(next.min_order_total) - 0.01)}`
              : `${formatEGP(row.min_order_total || 0)} and above`

            return (
              <div className="tiers-row" role="row" key={row.key}>
                <div className="tiers-input" role="cell">
                  <input
                    aria-label={`Tier ${index + 1} starts at`}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={row.min_order_total}
                    onChange={(e) => update(index, { min_order_total: e.target.value })}
                  />
                  <span>EGP</span>
                </div>
                <div className="tiers-input" role="cell">
                  <input
                    aria-label={`Tier ${index + 1} fee`}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={row.fee}
                    onChange={(e) => update(index, { fee: e.target.value })}
                  />
                  <span>EGP</span>
                </div>
                <span className="tiers-range" role="cell">{problem ? '—' : range}</span>
                <button
                  type="button"
                  className="tiers-remove"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  aria-label={`Remove tier ${index + 1}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" className="tiers-add" onClick={addRow}>
          + Add tier
        </button>

        <div className="tiers-preview">
          <label htmlFor="tiers-preview-input">Try it: food total</label>
          <div className="tiers-input">
            <input
              id="tiers-preview-input"
              type="number"
              min="0"
              inputMode="decimal"
              value={previewTotal}
              onChange={(e) => setPreviewTotal(e.target.value)}
            />
            <span>EGP</span>
          </div>
          <strong>→ delivery {problem ? '—' : formatEGP(previewFee)}</strong>
        </div>

        {(message.text || problem) && (
          <div className={`delivery-settings-message ${message.ok && !problem ? 'success' : 'error'}`} role="status">
            {problem || message.text}
          </div>
        )}

        <div className="delivery-settings-actions">
          <button type="button" className="admin-primary-button" onClick={handleSave} disabled={saving || Boolean(problem)}>
            {saving ? 'Saving...' : 'Save delivery fees'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeliverySettings

import { useEffect, useState } from 'react'
import {
  loadPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
} from '../../../services/paymentService'
import './PaymentMethodManagement.css'

function PaymentMethodManagement() {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)

  const [form, setForm] = useState({
    name: '',
    type: '',
    account_number: '',
    instructions: '',
    is_active: true,
  })

  async function loadMethods() {
    setLoading(true)

    const { data, error } = await loadPaymentMethods()

    if (error) {
      console.error('Payment methods error:', error)
      alert(error.message)
      setPaymentMethods([])
    } else {
      setPaymentMethods(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadMethods()
  }, [])

  function openAddForm() {
    setEditingMethod(null)

    setForm({
      name: '',
      type: '',
      account_number: '',
      instructions: '',
      is_active: true,
    })

    setShowForm(true)
  }

  function openEditForm(method) {
    setEditingMethod(method)

    setForm({
      name: method.name || '',
      type: method.type || '',
      account_number: method.account_number || '',
      instructions: method.instructions || '',
      is_active: method.is_active,
    })

    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingMethod(null)
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()

    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.account_number.trim()
    ) {
      alert('Please fill in all required fields.')
      return
    }

    setSaving(true)

    let result

    if (editingMethod) {
      result = await updatePaymentMethod(
        editingMethod.id,
        form
      )
    } else {
      result = await createPaymentMethod(form)
    }

    if (result.error) {
      console.error('Save payment method error:', result.error)
      alert(result.error.message)
    } else {
      closeForm()
      await loadMethods()
    }

    setSaving(false)
  }

  async function handleToggle(method) {
    const { error } = await togglePaymentMethodStatus(
      method.id,
      !method.is_active
    )

    if (error) {
      console.error('Toggle payment method error:', error)
      alert(error.message)
      return
    }

    await loadMethods()
  }

  async function handleDelete(method) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${method.name}"?`
    )

    if (!confirmed) return

    const { error } = await deletePaymentMethod(method.id)

    if (error) {
      console.error('Delete payment method error:', error)
      alert(error.message)
      return
    }

    await loadMethods()
  }

  return (
    <div className="payment-method-management">

      <div className="payment-method-management-header">
        <div>
          <h2>Payment Methods</h2>
          <p>
            Manage the payment methods available to students.
          </p>
        </div>

        <button
          className="payment-method-add-button"
          onClick={openAddForm}
        >
          + Add Payment Method
        </button>
      </div>

      {showForm && (
        <form
          className="payment-method-form"
          onSubmit={handleSave}
        >
          <div className="payment-method-form-header">
            <div>
              <h3>
                {editingMethod
                  ? 'Edit Payment Method'
                  : 'Add Payment Method'}
              </h3>
              <p>
                Enter the payment details students will use.
              </p>
            </div>

            <button
              type="button"
              className="payment-method-close-button"
              onClick={closeForm}
            >
              ×
            </button>
          </div>

          <div className="payment-method-form-grid">

            <div className="payment-method-field">
              <label>
                Name *
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. InstaPay"
              />
            </div>

            <div className="payment-method-field">
              <label>
                Type *
              </label>

              <input
                type="text"
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="e.g. InstaPay"
              />
            </div>

            <div className="payment-method-field">
              <label>
                Account Number *
              </label>

              <input
                type="text"
                name="account_number"
                value={form.account_number}
                onChange={handleChange}
                placeholder="e.g. 010xxxxxxxx"
              />
            </div>

            <div className="payment-method-field payment-method-field-full">
              <label>
                Instructions
              </label>

              <textarea
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                placeholder="Explain how students should complete the payment."
                rows="4"
              />
            </div>

            <label className="payment-method-active-field">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />

              <span>
                Active
              </span>
            </label>

          </div>

          <div className="payment-method-form-actions">
            <button
              type="button"
              className="payment-method-cancel-button"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="payment-method-save-button"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingMethod
                  ? 'Update Payment Method'
                  : 'Save Payment Method'}
            </button>
          </div>
        </form>
      )}

      <div className="payment-method-list">

        {loading ? (
          <div className="payment-method-empty">
            Loading payment methods...
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="payment-method-empty">
            No payment methods have been added yet.
          </div>
        ) : (
          paymentMethods.map((method) => (
            <div
              key={method.id}
              className="payment-method-admin-card"
            >
              <div className="payment-method-admin-main">

                <div className="payment-method-admin-icon">
                  💳
                </div>

                <div>
                  <h3>{method.name}</h3>

                  <span className="payment-method-admin-type">
                    {method.type}
                  </span>

                  <p>
                    {method.account_number}
                  </p>

                  {method.instructions && (
                    <small>
                      {method.instructions}
                    </small>
                  )}
                </div>

              </div>

              <div className="payment-method-admin-actions">

                <span
                  className={
                    method.is_active
                      ? 'payment-method-status active'
                      : 'payment-method-status inactive'
                  }
                >
                  {method.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <button
                  className="payment-method-action-button"
                  onClick={() => openEditForm(method)}
                >
                  Edit
                </button>

                <button
                  className="payment-method-action-button"
                  onClick={() => handleToggle(method)}
                >
                  {method.is_active
                    ? 'Disable'
                    : 'Enable'}
                </button>

                <button
                  className="payment-method-delete-button"
                  onClick={() => handleDelete(method)}
                >
                  Delete
                </button>

              </div>
            </div>
          ))
        )}

      </div>

    </div>
  )
}

export default PaymentMethodManagement
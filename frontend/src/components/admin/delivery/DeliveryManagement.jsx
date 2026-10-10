import '../shared/AdminManagement.css'
import './DeliveryManagement.css'

import Button from '../../common/Button'
import EditButton from '../../common/EditButton'
import DeleteButton from '../../common/DeleteButton'
import SaveButton from '../../common/SaveButton'
import CancelButton from '../../common/CancelButton'
import ToggleButton from '../../common/ToggleButton'

function DeliveryManagement({
  filteredBatches,
  batchSearch,
  setBatchSearch,

  drivers,
batchDrivers,
driverAssigning,
handleAssignDriver,

  showBatchForm,

  editingBatch,

  batchForm,
  setBatchForm,

  batchLoading,
  batchSaving,

  openAddBatchForm,
  openEditBatchForm,
  closeBatchForm,

  handleSaveBatch,
  handleToggleBatch,
  handleDeleteBatch,
}) {
  return (
    <section className="admin-management-section">

      <div className="admin-management-header">
        <div>
          <h2>Delivery Batches</h2>
          <p>
            Manage delivery batches, registration times, and order limits.
          </p>
        </div>

        {!showBatchForm && (
          <Button onClick={openAddBatchForm}>
            + Add Batch
          </Button>
        )}
      </div>

      {!showBatchForm && (
        <div className="admin-management-toolbar">
         <input
  type="text"
  className="delivery-search-input"
  placeholder="Search batches..."
  value={batchSearch}
  onChange={(e) => setBatchSearch(e.target.value)}
/>
        </div>
      )}

      {showBatchForm && (
        <div className="admin-form-card">

          <div className="admin-form-header">
            <div>
              <h3>
                {editingBatch
                  ? 'Edit Delivery Batch'
                  : 'Add Delivery Batch'}
              </h3>

              <p>
                Set the registration period, delivery time, and maximum orders.
              </p>
            </div>

            <button
              type="button"
              className="admin-close-button"
              onClick={closeBatchForm}
            >
              ×
            </button>
          </div>

          <div className="admin-form-grid">

            <div className="admin-form-group">
              <label>Batch Number</label>

              <input
                type="number"
                min="1"
                value={batchForm.batch_number}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    batch_number: event.target.value,
                  }))
                }
                placeholder="Example: 1"
              />
            </div>

            <div className="admin-form-group">
              <label>Maximum Orders</label>

              <input
                type="number"
                min="1"
                value={batchForm.maximum_orders}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    maximum_orders: event.target.value,
                  }))
                }
                placeholder="Example: 20"
              />
            </div>

            <div className="admin-form-group">
              <label>Driver Cost (EGP)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={batchForm.driver_cost}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    driver_cost: event.target.value,
                  }))
                }
                placeholder="Example: 60"
              />
            </div>

            <div className="admin-form-group">
              <label>Delivery Date</label>

              <input
                type="date"
                value={batchForm.delivery_date}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    delivery_date: event.target.value,
                  }))
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Registration Start</label>

              <input
                type="datetime-local"
                value={batchForm.registration_start}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    registration_start: event.target.value,
                  }))
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Registration End</label>

              <input
                type="datetime-local"
                value={batchForm.registration_end}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    registration_end: event.target.value,
                  }))
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Delivery Time</label>

              <input
                type="datetime-local"
                value={batchForm.delivery_time}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    delivery_time: event.target.value,
                  }))
                }
              />
            </div>

          </div>

          <div className="admin-form-group admin-checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={batchForm.is_active}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
              />

              Active
            </label>
          </div>

          <div className="admin-form-actions">

            <CancelButton
              type="button"
              onClick={closeBatchForm}
              disabled={batchSaving}
            >
              Cancel
            </CancelButton>

            <SaveButton
              type="button"
              onClick={handleSaveBatch}
              disabled={batchSaving}
            >
              {batchSaving
                ? 'Saving...'
                : editingBatch
                  ? 'Save Changes'
                  : 'Add Batch'}
            </SaveButton>

          </div>
        </div>
      )}

      {!showBatchForm && (
        <div className="admin-list">

          {batchLoading ? (
            <div className="admin-empty-state">
              Loading batches...
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="admin-empty-state">
              No delivery batches found.
            </div>
          ) : (
            filteredBatches.map((batch) => (
              <div
                key={batch.id}
                className="admin-restaurant-row delivery-batch-row"
              >

                <div className="admin-restaurant-left">

                  <div className="admin-restaurant-placeholder">
                    🚚
                  </div>

                  <div>
                    <strong>
                      Batch {batch.batch_number}
                    </strong>

                    <span>
                      Delivery Date: {batch.delivery_date}
                    </span>

                    <span>
                      Maximum Orders: {batch.maximum_orders}
                    </span>

                    <span>
                      Driver Cost: {Number(batch.driver_cost || 0).toFixed(2)} EGP
                    </span>

                    <span>
                      Registration:{' '}
                      {new Date(
                        batch.registration_start
                      ).toLocaleString()}{' '}
                      →{' '}
                      {new Date(
                        batch.registration_end
                      ).toLocaleString()}
                    </span>

                    <span>
                      Delivery:{' '}
                      {new Date(
                        batch.delivery_time
                      ).toLocaleString()}
                    </span>
                  </div>

                </div>

                <span className="admin-active-badge">
                  {batch.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>
                
                <div className="batch-driver">
  <label>Driver</label>

  <select
    className="batch-driver-select"
    value={batchDrivers?.[batch.id] || ''}
    onChange={(e) =>
      handleAssignDriver(batch.id, e.target.value)
    }
    disabled={driverAssigning}
  >
    <option value="">Not Assigned</option>

    {drivers
      ?.filter((driver) => driver.is_active)
      .map((driver) => (
        <option key={driver.id} value={driver.id}>
          {driver.profiles?.full_name || driver.profiles?.driver_id}
        </option>
      ))}
  </select>
</div>

                <div className="admin-restaurant-actions">

                  <EditButton
                    onClick={() =>
                      openEditBatchForm(batch)
                    }
                  >
                    Edit
                  </EditButton>

                  <ToggleButton
                    onClick={() =>
                      handleToggleBatch(batch)
                    }
                  >
                    {batch.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </ToggleButton>

                  <DeleteButton
                    onClick={() =>
                      handleDeleteBatch(batch)
                    }
                  >
                    Delete
                  </DeleteButton>

                </div>

              </div>
            ))
          )}

        </div>
      )}

    </section>
  )
}

export default DeliveryManagement
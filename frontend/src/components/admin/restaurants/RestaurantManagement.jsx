import '../shared/AdminManagement.css'
import './RestaurantManagement.css'
import Button from '../../common/Button'
import DeleteButton from '../../common/DeleteButton'
import EditButton from '../../common/EditButton'
import ToggleButton from '../../common/ToggleButton'
import SaveButton from '../../common/SaveButton'
import CancelButton from '../../common/CancelButton'

function RestaurantManagement({
  restaurants,
  restaurantsLoading,
  restaurantSearch,
  setRestaurantSearch,

  showRestaurantForm,
  setShowRestaurantForm,

  editingRestaurant,

  restaurantName,
  setRestaurantName,
  restaurantCode,
  setRestaurantCode,
  restaurantDescription,
  setRestaurantDescription,
  restaurantImageUrl,
  setRestaurantImageUrl,
  restaurantIsActive,
  setRestaurantIsActive,

  handleSaveRestaurant,
  handleToggleRestaurant,
  handleDeleteRestaurant,
    openEditRestaurantForm,
}) {
  return (
    <section className="admin-section-card">

      {/* Header */}
      <div className="admin-section-heading">
        <div>
          <h2>Restaurants</h2>

          <p>
            Manage restaurants available on ANU Mosquito.
          </p>
        </div>

        <Button
          variant="primary"
         onClick={() => {
  setRestaurantName('')
  setRestaurantCode('')
  setRestaurantDescription('')
  setRestaurantImageUrl('')
  setRestaurantIsActive(true)
  setShowRestaurantForm(true)
}}
        >
          + Add Restaurant
        </Button>
      </div>

      {/* Add / Edit Restaurant Form */}
      {showRestaurantForm && (
        <div className="admin-form-card">

          <div className="admin-form-header">
            <div>
              <h3>
                {editingRestaurant
                  ? 'Edit Restaurant'
                  : 'Add Restaurant'}
              </h3>

              <p>
                {editingRestaurant
                  ? 'Update the restaurant information.'
                  : 'Enter the restaurant information.'}
              </p>
            </div>

            <button
              type="button"
              className="admin-close-button"
              onClick={() =>
                setShowRestaurantForm(false)
              }
            >
              ×
            </button>
          </div>

          <div className="admin-form-grid">

            {/* Restaurant Name */}
            <div className="admin-form-group">
              <label>
                Restaurant Name
              </label>

              <input
                type="text"
                placeholder="e.g. Burger House"
                value={restaurantName}
onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>

            {/* Restaurant Code */}
            <div className="admin-form-group">
              <label>
                Restaurant Code
              </label>

              <input
                type="text"
                placeholder="e.g. B"
                value={restaurantCode}
onChange={(e) => setRestaurantCode(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="admin-form-group admin-form-full">
              <label>
                Description
              </label>

              <textarea
                placeholder="Enter restaurant description..."
                value={restaurantDescription}
onChange={(e) => setRestaurantDescription(e.target.value)}
              />
            </div>

            {/* Image URL */}
            <div className="admin-form-group admin-form-full">
              <label>
                Restaurant Image URL
              </label>

              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={restaurantImageUrl}
onChange={(e) => setRestaurantImageUrl(e.target.value)}
              />
            </div>

            {/* Active */}
            <div className="admin-form-checkbox">
              <input
                type="checkbox"
                checked={restaurantIsActive}
onChange={(e) => setRestaurantIsActive(e.target.checked)}
              />

              <label>
                Restaurant is active
              </label>
            </div>

          </div>

          {/* Form Actions */}
          <div className="admin-form-actions">

            <CancelButton
              onClick={() =>
                setShowRestaurantForm(false)
              }
            >
              Cancel
            </CancelButton>

            <SaveButton
  type="button"
  onClick={handleSaveRestaurant}
>
              {editingRestaurant
                ? 'Save Changes'
                : 'Add Restaurant'}
            </SaveButton>

          </div>

        </div>
      )}

      {/* Search */}
      <div className="admin-search-box">
        <span>⌕</span>

        <input
          type="text"
          placeholder="Search restaurants..."
          value={restaurantSearch}
          onChange={(e) =>
            setRestaurantSearch(e.target.value)
          }
        />
      </div>

      {/* Restaurant List */}
      {restaurantsLoading ? (
        <div className="admin-empty">
          Loading restaurants...
        </div>
      ) : restaurants.length === 0 ? (
        <div className="admin-empty">
          No restaurants found.
        </div>
      ) : (
        <div className="admin-restaurant-list">

          {restaurants
            .filter((restaurant) => {
              const searchText =
                restaurantSearch
                  .toLowerCase()
                  .trim()

              if (!searchText) {
                return true
              }

              return (
                restaurant.name
                  ?.toLowerCase()
                  .includes(searchText) ||
                restaurant.code
                  ?.toLowerCase()
                  .includes(searchText) ||
                restaurant.description
                  ?.toLowerCase()
                  .includes(searchText)
              )
            })
            .map((restaurant) => (

              <div
                key={restaurant.id}
                className="admin-restaurant-row"
              >

                {/* Restaurant Info */}
                <div className="admin-restaurant-left">

                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                    />
                  ) : (
                    <div className="admin-restaurant-placeholder">
                      🍔
                    </div>
                  )}

                  <div>

                    <strong>
                      {restaurant.name}
                    </strong>

                    <span>
                      Code: {restaurant.code}
                    </span>

                    <span>
                      {restaurant.description ||
                        'No description'}
                    </span>

                  </div>

                </div>

                {/* Actions */}
                <div className="admin-restaurant-actions">

                  <span className="admin-active-badge">
                    {restaurant.is_active
                      ? 'Active'
                      : 'Inactive'}
                  </span>

                 <EditButton
  onClick={() => openEditRestaurantForm(restaurant)}
>
  Edit
</EditButton>
              

                  <ToggleButton
  onClick={() =>
    handleToggleRestaurant(restaurant)
  }
>
                    {restaurant.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </ToggleButton>

                  <DeleteButton
                    onClick={() =>
                      handleDeleteRestaurant(restaurant)
                    }
                  >
                    Delete
                  </DeleteButton>

                </div>

              </div>

            ))}

        </div>
      )}

    </section>
  )
}

export default RestaurantManagement
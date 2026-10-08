import '../shared/AdminManagement.css'
import Button from '../../common/Button'
import DeleteButton from '../../common/DeleteButton'
import EditButton from '../../common/EditButton'
import SaveButton from '../../common/SaveButton'
import CancelButton from '../../common/CancelButton'
import './RestaurantSelector.css'

function FoodManagement({
  restaurants,

  selectedMenuRestaurant,
  setSelectedMenuRestaurant,

  foodCategories,
  foodItems,

  foodLoading,
  categoryLoading,

  restaurantDropdownOpen,
  setRestaurantDropdownOpen,

  restaurantSearch,
  setRestaurantSearch,

  showCategoryForm,
  setShowCategoryForm,

  categoryName,
  setCategoryName,

  categorySortOrder,
  setCategorySortOrder,

  categorySaving,
  editingCategory,
setEditingCategory,
  showFoodForm,
  editingFood,
  setEditingFood,
  setShowFoodForm,
  foodForm,
  setFoodForm,
  foodSaving,
  handleSaveFood,
  handleUpdateFood,
  handleDeleteFood,

  handleSaveCategory,
handleUpdateCategory,
handleDeleteCategory,
loadMenuForRestaurant,
}) {
  return (
    <section className="admin-section-card">

      <div className="admin-section-heading">
        <div>
          <h2>Food & Menu</h2>

          <p>
            Manage categories and food items for each restaurant.
          </p>
        </div>
      </div>

      {/* Restaurant Selection */}
      <div className="admin-form-group admin-form-full">

        <label>Select Restaurant</label>

        <div className="restaurant-selector">

          <button
            type="button"
            className="restaurant-selector-button"
            onClick={() =>
              setRestaurantDropdownOpen(
                !restaurantDropdownOpen
              )
            }
          >
            <div className="restaurant-selector-content">

              {selectedMenuRestaurant?.image_url ? (
                <img
                  src={selectedMenuRestaurant.image_url}
                  alt={selectedMenuRestaurant.name}
                />
              ) : (
                <div className="restaurant-selector-icon">
                  🍽️
                </div>
              )}

              <div>
                <strong>
                  {selectedMenuRestaurant?.name ||
                    'Choose a restaurant'}
                </strong>

                <span>
                  {selectedMenuRestaurant?.description ||
                    'Select a restaurant to manage its menu'}
                </span>
              </div>

            </div>

            <span className="restaurant-selector-arrow">
              {restaurantDropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {restaurantDropdownOpen && (
            <div className="restaurant-dropdown">

              <div className="restaurant-dropdown-search">
                <input
                  type="text"
                  placeholder="Search restaurant..."
                  value={restaurantSearch}
                  onChange={(e) =>
                    setRestaurantSearch(e.target.value)
                  }
                />
              </div>

              <div className="restaurant-dropdown-list">

                {restaurants
                  .filter(
                    (restaurant) =>
                      restaurant.is_active &&
                      restaurant.name
                        .toLowerCase()
                        .includes(
                          restaurantSearch
                            .toLowerCase()
                            .trim()
                        )
                  )
                  .map((restaurant) => (
                    <button
                      key={restaurant.id}
                      type="button"
                      className="restaurant-dropdown-item"
                      onClick={() => {
                        setSelectedMenuRestaurant(
                          restaurant
                        )

                        setRestaurantDropdownOpen(false)
                        setRestaurantSearch('')

                        loadMenuForRestaurant(
                          restaurant.id
                        )
                      }}
                    >
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                        />
                      ) : (
                        <div className="restaurant-selector-icon">
                          🍽️
                        </div>
                      )}

                      <div>
                        <strong>
                          {restaurant.name}
                        </strong>

                        <span>
                          {restaurant.description ||
                            'No description'}
                        </span>
                      </div>
                    </button>
                  ))}

              </div>

            </div>
          )}

        </div>
      </div>

      {/* No Restaurant Selected */}
      {!selectedMenuRestaurant && (
        <div className="admin-placeholder">

          <div>🍽️</div>

          <h3>Select a Restaurant</h3>

          <p>
            Choose a restaurant above to manage its
            categories and menu items.
          </p>

        </div>
      )}

      {/* Selected Restaurant */}
      {selectedMenuRestaurant && (
        <div>

          <div className="admin-section-heading">

            <div>
              <h3>
                {selectedMenuRestaurant.name}
              </h3>

              <p>
                Manage this restaurant's menu.
              </p>
            </div>

          </div>

          {/* Categories */}
          <div className="admin-section-card">

            <div className="admin-section-heading">

              <div>
                <h3>Categories</h3>

                <p>
                  Food categories for this restaurant.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => {
  setEditingCategory(null)
  setCategoryName('')
  setCategorySortOrder(0)
  setShowCategoryForm(true)
}}
              >
                + Add Category
              </Button>

            </div>

            {showCategoryForm && (
              <div className="admin-form-card">

                <div className="admin-form-group">
                  <label>Category Name</label>

                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) =>
                      setCategoryName(e.target.value)
                    }
                    placeholder="e.g. Burgers"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Sort Order</label>

                  <input
                    type="number"
                    min="0"
                    value={categorySortOrder}
                    onChange={(e) =>
                      setCategorySortOrder(e.target.value)
                    }
                  />
                </div>

                <div className="admin-form-actions">

                  <CancelButton
                    onClick={() => {
  setShowCategoryForm(false)
  setEditingCategory(null)
  setCategoryName('')
  setCategorySortOrder(0)
}}
                  >
                    Cancel
                  </CancelButton>

                  <SaveButton
                    type="button"
                    onClick={
  editingCategory
    ? handleUpdateCategory
    : handleSaveCategory
}
                    disabled={categorySaving}
                  >
                    {categorySaving
  ? 'Saving...'
  : editingCategory
    ? 'Save Changes'
    : 'Save Category'}
                  </SaveButton>

                </div>

              </div>
            )}

            {categoryLoading ? (
              <div className="admin-empty">
                Loading categories...
              </div>
            ) : foodCategories.length === 0 ? (
              <div className="admin-empty">
                No categories added yet.
              </div>
            ) : (
              <div className="admin-restaurant-list">

               {foodCategories.map((category) => (
  <div
    key={category.id}
    className="admin-restaurant-row"
  >
    <div className="admin-restaurant-left">
      <div className="admin-restaurant-placeholder">
        🍴
      </div>

      <div>
        <strong>
          {category.name}
        </strong>

        <span>
          Sort Order: {category.sort_order}
        </span>
      </div>
    </div>

    <span className="admin-active-badge">
      {category.is_active
        ? 'Active'
        : 'Inactive'}
    </span>

    <div className="admin-restaurant-actions">
      <EditButton
        onClick={() => {
          setEditingCategory(category)
          setCategoryName(category.name || '')
          setCategorySortOrder(
            category.sort_order ?? 0
          )
          setShowCategoryForm(true)
        }}
      >
        Edit
      </EditButton>

      <DeleteButton
        onClick={() =>
          handleDeleteCategory(category.id)
        }
      >
        Delete
      </DeleteButton>
    </div>
  </div>
))}

              </div>
            )}

          </div>

          {/* Food Items */}
          <div className="admin-section-card">

            <div className="admin-section-heading">

              <div>
                <h3>Food Items</h3>

                <p>
                  Food items available in this restaurant.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  setEditingFood(null)
                  setShowFoodForm(true)
                }}
              >
                Add Food
              </Button>

            </div>

            {showFoodForm && (
              <div className="admin-form-card">

                <div className="admin-form-group">
                  <label>Food Name</label>

                  <input
                    type="text"
                    value={foodForm.name}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. Classic Burger"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Category</label>

                  <select
                    value={foodForm.category_id}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        category_id: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select Category
                    </option>

                    {foodCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Description</label>

                  <textarea
                    value={foodForm.description}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Food description"
                    rows="3"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Selling Price</label>

                  <input
                    type="number"
                    min="0"
                    value={foodForm.selling_price}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        selling_price: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Cost Price</label>

                  <input
                    type="number"
                    min="0"
                    value={foodForm.cost_price}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        cost_price: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Image URL</label>

                  <input
                    type="text"
                    value={foodForm.image_url}
                    onChange={(e) =>
                      setFoodForm({
                        ...foodForm,
                        image_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={foodForm.is_available}
                      onChange={(e) =>
                        setFoodForm({
                          ...foodForm,
                          is_available: e.target.checked,
                        })
                      }
                    />

                    {' '}Available
                  </label>
                </div>

                <div className="admin-form-actions">

                  <CancelButton
                    onClick={() => {
                      setShowFoodForm(false)
                      setEditingFood(null)

                      setFoodForm({
                        name: '',
                        description: '',
                        category_id: '',
                        selling_price: '',
                        cost_price: '',
                        image_url: '',
                        is_available: true,
                      })
                    }}
                    disabled={foodSaving}
                  >
                    Cancel
                  </CancelButton>

                  <SaveButton
                    type="button"
                    onClick={
                      editingFood
                        ? handleUpdateFood
                        : handleSaveFood
                    }
                    disabled={foodSaving}
                  >
                    {foodSaving
                      ? 'Saving...'
                      : editingFood
                        ? 'Update Food'
                        : 'Save Food'}
                  </SaveButton>

                </div>

              </div>
            )}

            {foodLoading ? (
              <div className="admin-empty">
                Loading food items...
              </div>
            ) : foodItems.length === 0 ? (
              <div className="admin-empty">
                No food items added yet.
              </div>
            ) : (
              <div className="admin-restaurant-list">

                {foodItems.map((food) => (
                  <div
                    key={food.id}
                    className="admin-restaurant-row"
                  >

                    <div className="admin-restaurant-left">

                      {food.image_url ? (
                        <img
                          src={food.image_url}
                          alt={food.name}
                        />
                      ) : (
                        <div className="admin-restaurant-placeholder">
                          🍔
                        </div>
                      )}

                      <div>
                        <strong>
                          {food.name}
                        </strong>

                        <span>
                          {food.description ||
                            'No description'}
                        </span>

                        <span>
                          Selling Price: {food.selling_price}
                        </span>
                      </div>

                    </div>

                    <span className="admin-active-badge">
                      {food.is_available
                        ? 'Available'
                        : 'Unavailable'}
                    </span>

                    <div className="admin-restaurant-actions">

                      <EditButton
                        onClick={() => {
                          setEditingFood(food)

                          setFoodForm({
                            name: food.name || '',
                            description:
                              food.description || '',
                            category_id:
                              food.category_id || '',
                            selling_price:
                              food.selling_price ?? '',
                            cost_price:
                              food.cost_price ?? '',
                            image_url:
                              food.image_url || '',
                            is_available:
                              food.is_available,
                          })

                          setShowFoodForm(true)
                        }}
                      >
                        Edit
                      </EditButton>

                      <DeleteButton
                        onClick={() =>
                          handleDeleteFood(food.id)
                        }
                      >
                        Delete
                      </DeleteButton>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      )}

    </section>
  )
}

export default FoodManagement
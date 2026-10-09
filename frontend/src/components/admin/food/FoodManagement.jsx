import '../shared/AdminManagement.css'
import Button from '../../common/Button'
import DeleteButton from '../../common/DeleteButton'
import EditButton from '../../common/EditButton'
import SaveButton from '../../common/SaveButton'
import CancelButton from '../../common/CancelButton'
import './RestaurantSelector.css'
import './FoodManagement.css'
import { useEffect, useState } from 'react'
import ImageUploader from '../../common/ImageUploader'
import Icon from '../../common/Icon'
import { emptyFoodForm, foodToForm } from '../../../hooks/useFood'
import { loadHomeCategories } from '../../../services/homeCategoryService'
import { availableSizes, formatEGP } from '../../../lib/pricing'

const SIZE_PRESETS = ['S', 'M', 'L', 'XL']

// Meal sizes: when an item has sizes, each size has its own price and the
// student must pick one. Without sizes the single price below is used.
function SizesEditor({ foodForm, setFoodForm }) {
  const sizes = foodForm.sizes || []

  function update(index, patch) {
    setFoodForm((form) => ({
      ...form,
      sizes: form.sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)),
    }))
  }

  function addSize(name = '') {
    setFoodForm((form) => ({
      ...form,
      sizes: [...(form.sizes || []), { name, selling_price: '', cost_price: '', is_available: true }],
    }))
  }

  function removeSize(index) {
    setFoodForm((form) => ({ ...form, sizes: form.sizes.filter((_, i) => i !== index) }))
  }

  function move(index, delta) {
    setFoodForm((form) => {
      const next = [...form.sizes]
      const target = index + delta
      if (target < 0 || target >= next.length) return form
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...form, sizes: next }
    })
  }

  const unusedPresets = SIZE_PRESETS.filter(
    (preset) => !sizes.some((size) => String(size.name).trim().toUpperCase() === preset)
  )

  return (
    <div className="sizes-editor">
      <div className="sizes-editor-head">
        <div>
          <h4>Price{sizes.length > 0 ? 's by size' : ''}</h4>
          <p>
            {sizes.length > 0
              ? 'Students choose one of these sizes. Each size has its own price.'
              : 'One price for this item, or add sizes like M / L / XL with different prices.'}
          </p>
        </div>
      </div>

      {sizes.length === 0 ? (
        <div className="food-form-row">
          <div className="admin-form-group">
            <label htmlFor="food-price">Selling price (EGP)</label>
            <input
              id="food-price"
              type="number"
              min="0"
              inputMode="decimal"
              value={foodForm.selling_price}
              onChange={(e) => setFoodForm({ ...foodForm, selling_price: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="food-cost">Cost price (EGP)</label>
            <input
              id="food-cost"
              type="number"
              min="0"
              inputMode="decimal"
              value={foodForm.cost_price}
              onChange={(e) => setFoodForm({ ...foodForm, cost_price: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div className="sizes-list">
          <div className="sizes-row sizes-row-head" aria-hidden="true">
            <span>Size</span>
            <span>Price</span>
            <span>Cost</span>
            <span />
          </div>
          {sizes.map((size, index) => (
            <div key={size.id || `new-${index}`} className={`sizes-row ${size.is_available === false ? 'is-off' : ''}`}>
              <input
                aria-label={`Size ${index + 1} name`}
                value={size.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="e.g. L"
              />
              <input
                aria-label={`Size ${index + 1} price`}
                type="number"
                min="0"
                inputMode="decimal"
                value={size.selling_price}
                onChange={(e) => update(index, { selling_price: e.target.value })}
                placeholder="Price"
              />
              <input
                aria-label={`Size ${index + 1} cost`}
                type="number"
                min="0"
                inputMode="decimal"
                value={size.cost_price}
                onChange={(e) => update(index, { cost_price: e.target.value })}
                placeholder="Cost"
              />
              <div className="sizes-row-actions">
                <button
                  type="button"
                  className={`sizes-toggle ${size.is_available === false ? '' : 'on'}`}
                  onClick={() => update(index, { is_available: size.is_available === false })}
                  aria-pressed={size.is_available !== false}
                  title={size.is_available === false ? 'Hidden from students' : 'Available'}
                >
                  {size.is_available === false ? 'Off' : 'On'}
                </button>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === sizes.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="sizes-remove" onClick={() => removeSize(index)} aria-label={`Remove size ${size.name || index + 1}`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sizes-presets">
        {unusedPresets.map((preset) => (
          <button key={preset} type="button" onClick={() => addSize(preset)}>
            + {preset}
          </button>
        ))}
        <button type="button" onClick={() => addSize('')}>+ Custom size</button>
      </div>
    </div>
  )
}

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
  const [homeCategories, setHomeCategories] = useState([])

  useEffect(() => {
    let cancelled = false
    loadHomeCategories({ includeInactive: true }).then(({ data }) => {
      if (!cancelled) setHomeCategories(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="admin-section-card">

      <div className="admin-section-heading">
        <div>
          <h2>Food & Menu</h2>

          <p>
            Manage menu sections, food items, sizes and photos for each restaurant.
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
                <h3>Menu sections</h3>

                <p>
                  Sections inside this restaurant's menu (e.g. Burgers, Sides).
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
                + Add Section
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
                Loading sections...
              </div>
            ) : foodCategories.length === 0 ? (
              <div className="admin-empty">
                No sections added yet.
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
                  setFoodForm(emptyFoodForm())
                  setShowFoodForm(true)
                }}
              >
                Add Food
              </Button>

            </div>

            {showFoodForm && (
              <div className="admin-form-card food-form">

                <div className="food-form-grid">
                  <div className="food-form-main">
                    <div className="admin-form-group">
                      <label htmlFor="food-name">Food Name</label>
                      <input
                        id="food-name"
                        type="text"
                        value={foodForm.name}
                        onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                        placeholder="e.g. Classic Burger"
                      />
                    </div>

                    <div className="food-form-row">
                      <div className="admin-form-group">
                        <label htmlFor="food-section">Menu section</label>
                        <select
                          id="food-section"
                          value={foodForm.category_id}
                          onChange={(e) => setFoodForm({ ...foodForm, category_id: e.target.value })}
                        >
                          <option value="">Select section</option>
                          {foodCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-form-group">
                        <label htmlFor="food-home-category">Home page category</label>
                        <select
                          id="food-home-category"
                          value={foodForm.home_category_id || ''}
                          onChange={(e) => setFoodForm({ ...foodForm, home_category_id: e.target.value })}
                        >
                          <option value="">Not shown on home</option>
                          {homeCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.icon ? `${category.icon} ` : ''}{category.name}
                              {category.is_active ? '' : ' (hidden)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="food-description">Description</label>
                      <textarea
                        id="food-description"
                        value={foodForm.description}
                        onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                        placeholder="What's in it?"
                        rows="3"
                      />
                    </div>
                  </div>

                  <ImageUploader
                    label="Food photo"
                    folder="food"
                    value={foodForm.image_url}
                    onChange={(url) => setFoodForm((form) => ({ ...form, image_url: url }))}
                  />
                </div>

                <SizesEditor foodForm={foodForm} setFoodForm={setFoodForm} />

                <label className="food-form-check">
                  <input
                    type="checkbox"
                    checked={foodForm.is_available}
                    onChange={(e) => setFoodForm({ ...foodForm, is_available: e.target.checked })}
                  />
                  Available to order
                </label>

                <div className="admin-form-actions">
                  <CancelButton
                    onClick={() => {
                      setShowFoodForm(false)
                      setEditingFood(null)
                      setFoodForm(emptyFoodForm())
                    }}
                    disabled={foodSaving}
                  >
                    Cancel
                  </CancelButton>

                  <SaveButton
                    type="button"
                    onClick={editingFood ? handleUpdateFood : handleSaveFood}
                    disabled={foodSaving}
                  >
                    {foodSaving ? 'Saving...' : editingFood ? 'Update Food' : 'Save Food'}
                  </SaveButton>
                </div>
              </div>
            )}

            {foodLoading ? (
              <div className="admin-empty">Loading food items...</div>
            ) : foodItems.length === 0 ? (
              <div className="admin-empty">No food items added yet.</div>
            ) : (
              <div className="admin-restaurant-list">
                {foodItems.map((food) => {
                  const sizes = availableSizes(food)
                  const homeCategory = homeCategories.find((c) => c.id === food.home_category_id)

                  return (
                    <div key={food.id} className="admin-restaurant-row">
                      <div className="admin-restaurant-left">
                        {food.image_url ? (
                          <img src={food.image_url} alt={food.name} />
                        ) : (
                          <div className="admin-restaurant-placeholder">🍔</div>
                        )}

                        <div>
                          <strong>{food.name}</strong>
                          <span>{food.description || 'No description'}</span>
                          <span className="food-price-line">
                            {sizes.length > 0
                              ? sizes.map((size) => `${size.name} ${formatEGP(size.selling_price)}`).join(' · ')
                              : formatEGP(food.selling_price)}
                          </span>
                          {homeCategory && (
                            <span className="food-home-tag">
                              {homeCategory.icon} {homeCategory.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="admin-active-badge">
                        {food.is_available ? 'Available' : 'Unavailable'}
                      </span>

                      <div className="admin-restaurant-actions">
                        <EditButton
                          onClick={() => {
                            setEditingFood(food)
                            setFoodForm(foodToForm(food))
                            setShowFoodForm(true)
                          }}
                        >
                          Edit
                        </EditButton>

                        <DeleteButton onClick={() => handleDeleteFood(food.id)}>
                          Delete
                        </DeleteButton>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>

        </div>
      )}

    </section>
  )
}

export default FoodManagement
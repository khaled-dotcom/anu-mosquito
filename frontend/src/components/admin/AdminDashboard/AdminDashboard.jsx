import { useEffect, useState } from 'react'
import Button from '../../common/Button'
import Icon from '../../common/Icon'
import RestaurantManagement from '../restaurants/RestaurantManagement'
import FoodManagement from '../food/FoodManagement'
import './AdminDashboard.css'
import DeliveryManagement from '../delivery/DeliveryManagement'
import PaymentMethodManagement from '../payment/PaymentMethodManagement'
import DeliverySettings from '../settings/DeliverySettings'
import OrderManagement from '../orders/OrderManagement'
import RestaurantOrders from '../restaurants/RestaurantOrders'
import UserManagement from '../users/UserManagement'
import FinanceManagement from '../finances/FinanceManagement'
import DriverManagement from '../drivers/DriverManagement'

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'restaurants', label: 'Restaurants', icon: '🍔' },
  { key: 'food', label: 'Food & Menu', icon: '🍕' },
  { key: 'orders', label: 'Orders', icon: '📦' },
  { key: 'restaurant-orders', label: 'Restaurant Orders', icon: '🍽️' },
  { key: 'delivery', label: 'Delivery', icon: '🚚' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'finance', label: 'Finances', icon: '💰' },
  { key: 'drivers', label: 'Drivers', icon: '🚗' },
  { key: 'payment-methods', label: 'Payment Methods', icon: '💳' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
]

function AdminDashboard({
  adminSection,
  setAdminSection,
  profile,
restaurants,
restaurantsLoading,
dashboardStats,
handleLogout,

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
  selectedMenuRestaurant,
  setSelectedMenuRestaurant,
  foodCategories,
  foodItems,
  foodLoading,
  categoryLoading,
  restaurantDropdownOpen,
  setRestaurantDropdownOpen,
  showCategoryForm,
  setShowCategoryForm,
  categoryName,
  setCategoryName,
  categorySortOrder,
  setCategorySortOrder,
  categorySaving,
  showFoodForm,
  setShowFoodForm,
  editingFood,
  setEditingFood,
  foodForm,
  setFoodForm,
  foodSaving,
  handleSaveFood,
  handleUpdateFood,
  handleDeleteFood,
 handleSaveCategory,
editingCategory,
setEditingCategory,
handleUpdateCategory,
handleDeleteCategory,
loadMenuForRestaurant,
  batches,
  filteredBatches,
  batchSearch,
  setBatchSearch,

  drivers,
batchDrivers,
driverAssigning,
handleAssignDriver,

  showBatchForm,
  setShowBatchForm,

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
  const [navOpen, setNavOpen] = useState(false)
  const currentNav =
    ADMIN_NAV.find((item) => item.key === adminSection) || ADMIN_NAV[0]

  // Lock page scroll while the mobile drawer is open; close it with Escape.
  useEffect(() => {
    if (!navOpen) return

    function onKeyDown(e) {
      if (e.key === 'Escape') setNavOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [navOpen])

  function goToSection(key) {
    setAdminSection(key)
    setNavOpen(false)
    window.scrollTo(0, 0)
  }

  return (
    <div className={`admin-layout ${navOpen ? 'nav-open' : ''}`}>

      {/* Mobile top bar */}
      <header className="admin-mobile-bar">
        <button
          type="button"
          className="admin-menu-toggle"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={navOpen}
          aria-controls="admin-sidebar"
        >
          <Icon name="menu" size={22} />
        </button>

        <div className="admin-mobile-title">
          <span aria-hidden="true">{currentNav.icon}</span>
          {currentNav.label}
        </div>

        <img
          src="/logo-256.webp"
          alt="ANU Mosquito"
          className="admin-mobile-logo"
          width="36"
          height="36"
        />
      </header>

      <div
        className="admin-nav-backdrop"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="admin-sidebar" id="admin-sidebar">

        <div className="admin-brand">
          <img
            src="/logo-256.webp"
            alt="ANU Mosquito"
            className="admin-logo"
          />

          <div>
            <div className="admin-brand-title">
              ANU Mosquito
            </div>

            <div className="admin-brand-subtitle">
              Admin Panel
            </div>
          </div>

          <button
            type="button"
            className="admin-nav-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="admin-nav">
          {ADMIN_NAV.map((item) => (
            <Button
              key={item.key}
              variant="nav"
              className={
                adminSection === item.key
                  ? 'admin-nav-button active'
                  : 'admin-nav-button'
              }
              onClick={() => goToSection(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>

        <Button
          variant="logout"
          className="admin-logout"
          onClick={handleLogout}
        >
          Logout
        </Button>

      </aside>

      {/* Main Admin Content */}
      <main className="admin-main">

        <header className="admin-topbar">

          <div>
            <h1>{currentNav.label}</h1>

            <p>
              Manage ANU Mosquito from one place.
            </p>
          </div>

          <div className="admin-user">

            <div className="admin-user-icon">
              👤
            </div>

            <div>
              <strong>
                {profile?.full_name || 'Administrator'}
              </strong>

              <span>
                Administrator
              </span>
            </div>

          </div>

        </header>

        {/* Dashboard */}
        {adminSection === 'dashboard' && (
          <>

            <section className="admin-welcome">

              <div>
                <span>
                  Welcome back 👋
                </span>

                <h2>
                  {profile?.full_name || 'Administrator'}
                </h2>

                <p>
                  Manage restaurants, food,
                  orders and operations.
                </p>
              </div>

              <div className="admin-mosquito">
                🦟
              </div>

            </section>

            <section className="admin-stats">

              <div className="admin-stat-card">

                <span className="admin-stat-icon">
                  🍔
                </span>

                <div>
                  <span>
                    Active Restaurants
                  </span>

                  <strong>
                    {restaurants.filter(
                      (restaurant) => restaurant.is_active
                    ).length}
                  </strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <span className="admin-stat-icon">
                  🍕
                </span>

                <div>
                  <span>
                    Food Items
                  </span>

                  <strong>
  {dashboardStats?.foodItems ?? 0}
</strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <span className="admin-stat-icon">
                  📦
                </span>

                <div>
                  <span>
                    Orders
                  </span>

                  <strong>
  {dashboardStats?.orders ?? 0}
</strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <span className="admin-stat-icon">
                  👥
                </span>

                <div>
                  <span>
                    Students
                  </span>

                  <strong>
  {dashboardStats?.students ?? 0}
</strong>
                </div>

              </div>

<div className="admin-stat-card">
  <span className="admin-stat-icon">
    📅
  </span>

  <div>
    <span>
      Today's Orders
    </span>

    <strong>
      {dashboardStats?.todayOrders ?? 0}
    </strong>
  </div>
</div>

<div className="admin-stat-card">
  <span className="admin-stat-icon">
    💰
  </span>

  <div>
    <span>
      Today's Revenue
    </span>

    <strong>
      {Number(dashboardStats?.todayRevenue ?? 0).toFixed(2)} EGP
    </strong>
  </div>
</div>

<div className="admin-stat-card">
  <span className="admin-stat-icon">
    💳
  </span>

  <div>
    <span>
      Pending Payments
    </span>

    <strong>
      {dashboardStats?.pendingPayments ?? 0}
    </strong>
  </div>
</div>
            </section>

            <section className="admin-section-card">

              <div className="admin-section-heading">

                <div>
                  <h2>
                    Quick Actions
                  </h2>

                  <p>
                    Common management actions
                  </p>
                </div>

              </div>

              <div className="admin-actions">

                <Button
                  variant="action"
                  onClick={() =>
                    setAdminSection('restaurants')
                  }
                >
                  <span>🍔</span>

                  <strong>
                    Manage Restaurants
                  </strong>

                  <small>
                    Add and edit restaurants
                  </small>
                </Button>

                <Button
                  variant="action"
                  onClick={() =>
                    setAdminSection('food')
                  }
                >
                  <span>🍕</span>

                  <strong>
                    Manage Food
                  </strong>

                  <small>
                    Manage menu items
                  </small>
                </Button>

                <Button
                  variant="action"
                  onClick={() =>
                    setAdminSection('orders')
                  }
                >
                  <span>📦</span>

                  <strong>
                    View Orders
                  </strong>

                  <small>
                    Monitor customer orders
                  </small>
                </Button>

                <Button
                  variant="action"
                  onClick={() =>
                    setAdminSection('delivery')
                  }
                >
                  <span>🚚</span>

                  <strong>
                    Delivery
                  </strong>

                  <small>
                    Manage delivery operations
                  </small>
                </Button>

              </div>

            </section>

            <section className="admin-section-card">

              <div className="admin-section-heading">

                <div>
                  <h2>
                    Restaurants
                  </h2>

                  <p>
                    Currently active restaurants
                  </p>
                </div>

                <Button
                  variant="view"
                  className="admin-view-button"
                  onClick={() =>
                    setAdminSection('restaurants')
                  }
                >
                  View All
                </Button>

              </div>

              {restaurantsLoading ? (
                <div className="admin-empty">
                  Loading restaurants...
                </div>
              ) : restaurants.length === 0 ? (
                <div className="admin-empty">
                  No restaurants have been added yet.
                </div>
              ) : (
                <div className="admin-restaurant-list">

                  {restaurants
                    .slice(0, 5)
                    .map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="admin-restaurant-row"
                      >

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
                              {restaurant.description ||
                                'No description'}
                            </span>

                          </div>

                        </div>

                        <span className="admin-active-badge">
                          {restaurant.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </span>

                      </div>
                    ))}

                </div>
              )}

            </section>

          </>
        )}

        {/* Restaurants */}
        {adminSection === 'restaurants' && (
          <RestaurantManagement
            restaurants={restaurants}
            restaurantsLoading={restaurantsLoading}
            restaurantSearch={restaurantSearch}
            setRestaurantSearch={setRestaurantSearch}
            showRestaurantForm={showRestaurantForm}
            setShowRestaurantForm={setShowRestaurantForm}
            editingRestaurant={editingRestaurant}
           restaurantName={restaurantName}
setRestaurantName={setRestaurantName}
restaurantCode={restaurantCode}
setRestaurantCode={setRestaurantCode}
restaurantDescription={restaurantDescription}
setRestaurantDescription={setRestaurantDescription}
restaurantImageUrl={restaurantImageUrl}
setRestaurantImageUrl={setRestaurantImageUrl}
restaurantIsActive={restaurantIsActive}
setRestaurantIsActive={setRestaurantIsActive}

handleSaveRestaurant={handleSaveRestaurant}
handleToggleRestaurant={handleToggleRestaurant}
handleDeleteRestaurant={handleDeleteRestaurant}
openEditRestaurantForm={openEditRestaurantForm}
          />
        )}

        {/* Food & Menu */}
        {adminSection === 'food' && (
          <FoodManagement
            restaurants={restaurants}

            selectedMenuRestaurant={
              selectedMenuRestaurant
            }

            setSelectedMenuRestaurant={
              setSelectedMenuRestaurant
            }

            foodCategories={foodCategories}
            foodItems={foodItems}

            foodLoading={foodLoading}
            categoryLoading={categoryLoading}

            restaurantDropdownOpen={
              restaurantDropdownOpen
            }

            setRestaurantDropdownOpen={
              setRestaurantDropdownOpen
            }

            restaurantSearch={restaurantSearch}
            setRestaurantSearch={setRestaurantSearch}

            showCategoryForm={showCategoryForm}
            setShowCategoryForm={setShowCategoryForm}

            categoryName={categoryName}
            setCategoryName={setCategoryName}

            categorySortOrder={categorySortOrder}
            setCategorySortOrder={
              setCategorySortOrder
            }

            categorySaving={categorySaving}

            showFoodForm={showFoodForm}
            setShowFoodForm={setShowFoodForm}

            editingFood={editingFood}
            setEditingFood={setEditingFood}

            foodForm={foodForm}
            setFoodForm={setFoodForm}

            foodSaving={foodSaving}

            handleSaveFood={handleSaveFood}
            handleUpdateFood={handleUpdateFood}
            handleDeleteFood={handleDeleteFood}

            handleSaveCategory={
              handleSaveCategory
            }

            editingCategory={editingCategory}
setEditingCategory={setEditingCategory}
handleUpdateCategory={handleUpdateCategory}
handleDeleteCategory={handleDeleteCategory}

            loadMenuForRestaurant={
              loadMenuForRestaurant
            }
          />
        )}

         {/* Orders */}
{adminSection === 'orders' && (
  <OrderManagement />
)}


{adminSection === 'restaurant-orders' && (
  <RestaurantOrders
    restaurants={restaurants}
    batches={batches}
  />
)}

                {/* Delivery */}
        {adminSection === 'delivery' && (
          <DeliveryManagement
            batches={batches}
            filteredBatches={filteredBatches}
            batchSearch={batchSearch}
            setBatchSearch={setBatchSearch}

            showBatchForm={showBatchForm}
            setShowBatchForm={setShowBatchForm}

            editingBatch={editingBatch}

            batchForm={batchForm}
            setBatchForm={setBatchForm}

            batchLoading={batchLoading}
            batchSaving={batchSaving}

            openAddBatchForm={openAddBatchForm}
            openEditBatchForm={openEditBatchForm}
            closeBatchForm={closeBatchForm}

            handleSaveBatch={handleSaveBatch}
            handleToggleBatch={handleToggleBatch}
            handleDeleteBatch={handleDeleteBatch}

            drivers={drivers}
batchDrivers={batchDrivers}
driverAssigning={driverAssigning}
handleAssignDriver={handleAssignDriver}
          />
        )}
       {/* Payment Methods */}
{adminSection === 'payment-methods' && (
  <PaymentMethodManagement />
)}

{adminSection === 'users' && (
  <UserManagement />
)}

{adminSection === 'finance' && (
  <FinanceManagement />
)}

{adminSection === 'drivers' && (
  <DriverManagement />
)}

{/* Settings */}
{adminSection === 'settings' && (
  <DeliverySettings />
)}
      </main>

    </div>
  )
}

export default AdminDashboard
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './supabase'
import useAuth from './hooks/useAuth'
import useRestaurants from './hooks/useRestaurants'
import useFood from './hooks/useFood'
import useDelivery from './hooks/useDelivery'
import { loadDashboardStats } from './services/dashboardService'
import PageLoader from './components/common/PageLoader'

// Each role's screens are split into their own chunk so students never
// download the admin panel and vice versa.
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard/AdminDashboard'))
const ModeratorDashboard = lazy(() => import('./components/moderator/ModeratorDashboard'))
const DriverDashboard = lazy(() => import('./components/driver/DriverDashboard'))
const StudentHome = lazy(() => import('./components/student/StudentHome'))
const StudentMenu = lazy(() => import('./components/student/StudentMenu'))
const StudentOrders = lazy(() => import('./components/student/StudentOrders'))
const Auth = lazy(() => import('./components/auth/Auth'))

function App() {
  const {
  isRegister,
  setIsRegister,
  showPassword,
  setShowPassword,
  fullName,
  setFullName,
  universityId,
  setUniversityId,
  phone,
  setPhone,
  password,
  setPassword,
  message,
  setMessage,
  loading,
  setLoading,
} = useAuth()
  const {
  restaurants,
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

  loadRestaurants,
  handleSaveRestaurant,
  handleToggleRestaurant,
  handleDeleteRestaurant,
  openEditRestaurantForm,
} = useRestaurants()

const {
  batches,
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
  openAddBatchForm,
  openEditBatchForm,
  closeBatchForm,

  handleSaveBatch,
  handleToggleBatch,
  handleDeleteBatch,

  drivers,
batchDrivers,
driverAssigning,
handleAssignDriver,
} = useDelivery()

const {
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

  foodForm,
  setFoodForm,

  foodSaving,
  editingFood,
  setEditingFood,

  loadMenuForRestaurant,

  handleSaveCategory,
handleSaveFood,
handleUpdateFood,
handleDeleteFood,
editingCategory,
setEditingCategory,
handleUpdateCategory,
handleDeleteCategory,
} = useFood()

  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [restaurantsLoading, setRestaurantsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [studentPage, setStudentPage] = useState('home')

  // Admin
  const [adminSection, setAdminSection] = useState('dashboard')
  const [dashboardStats, setDashboardStats] = useState({
  activeRestaurants: 0,
  foodItems: 0,
  orders: 0,
  students: 0,
})

 
  // =========================
  // SESSION
  // =========================

  useEffect(() => {
    let cancelled = false

    async function handleSession(newSession) {
      setSession(newSession)

      if (!newSession?.user) {
        setProfile(null)
        setCheckingAuth(false)
        return
      }

      const loadedProfile = await loadProfile(newSession.user.id)
      if (cancelled) return

      setCheckingAuth(false)

      setRestaurantsLoading(true)
      await loadRestaurants()
      if (!cancelled) setRestaurantsLoading(false)

      if (loadedProfile?.role === 'admin') {
        loadBatches()
      }
    }

    // onAuthStateChange fires INITIAL_SESSION on mount, so no separate
    // getSession() call is needed. Supabase calls inside the callback are
    // deferred to avoid deadlocking the auth client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession)
        return
      }

      setTimeout(() => handleSession(newSession), 0)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // =========================
  // LOAD PROFILE
  // =========================

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, university_id, driver_id, phone, role, admin_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile error:', error)
      setProfile(null)
      return null
    }

    setProfile(data)
    return data
  }

  async function loadDashboardData() {
  const { data, error } = await loadDashboardStats()

  if (error) {
    console.error('Dashboard stats error:', error)
    return
  }

  setDashboardStats(data)
}

useEffect(() => {
  if (session && profile?.role === 'admin') {
    loadDashboardData()
  }
}, [session, profile, restaurants, foodItems])
  
function goToStudentHome() {
  setSelectedRestaurant(null)
  setStudentPage('home')
}

  // =========================
  // LOGOUT
  // =========================

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setSelectedRestaurant(null)
    setMessage('')
    setPassword('')
    setIsRegister(false)
    setAdminSection('dashboard')
    setStudentPage('home')
  }

  // =========================
  // LOADING SCREEN
  // =========================

  if (checkingAuth) {
    return <PageLoader />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {renderScreen()}
    </Suspense>
  )

  function renderScreen() {
// =========================
// ADMIN DASHBOARD
// =========================

if (
  session &&
  profile?.role === 'admin'
) {
  return (
    <AdminDashboard
      adminSection={adminSection}
      setAdminSection={setAdminSection}

      profile={profile}

      restaurants={restaurants}
      restaurantsLoading={restaurantsLoading}
      dashboardStats={dashboardStats}

      handleLogout={handleLogout}

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

      showCategoryForm={showCategoryForm}
      setShowCategoryForm={setShowCategoryForm}

      categoryName={categoryName}
      setCategoryName={setCategoryName}

      categorySortOrder={categorySortOrder}
      setCategorySortOrder={setCategorySortOrder}

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

      handleSaveCategory={handleSaveCategory}
      editingCategory={editingCategory}
setEditingCategory={setEditingCategory}
handleUpdateCategory={handleUpdateCategory}
handleDeleteCategory={handleDeleteCategory}

      loadMenuForRestaurant={
        loadMenuForRestaurant
      }

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
  )
}

if (
  session &&
  profile?.role === 'moderator'
) {
  return (
    <ModeratorDashboard
      handleLogout={handleLogout}
    />
  )
}

// =========================
// DRIVER DASHBOARD
// =========================

if (
  session &&
  profile?.role === 'driver'
) {
  return (
    <DriverDashboard
      profile={profile}
      handleLogout={handleLogout}
    />
  )
}

// =========================
// STUDENT ORDERS
// =========================
if (session && studentPage === 'orders') {
  return (
    <StudentOrders
      profile={profile}
      setStudentPage={setStudentPage}
      handleLogout={handleLogout}
    />
  )
}

 // =========================
// STUDENT HOME
// =========================
if (session && studentPage === 'menu') {
  return (
    <StudentMenu
      selectedRestaurant={selectedRestaurant}
      setStudentPage={setStudentPage}
      profile={profile}
      goToStudentHome={goToStudentHome}
      foodCategories={foodCategories}
      foodItems={foodItems}
      foodLoading={foodLoading}
      loadMenuForRestaurant={loadMenuForRestaurant}
    />
  )
}

if (session) {
  return (
    <StudentHome
      restaurants={restaurants}
      restaurantsLoading={restaurantsLoading}

      search={search}
      setSearch={setSearch}

      profile={profile}

      setSelectedRestaurant={setSelectedRestaurant}

      studentPage={studentPage}
setStudentPage={setStudentPage}

      handleLogout={handleLogout}
      setMessage={setMessage}
    />
  )
}
  // =========================
  // LOGIN / REGISTER
  // =========================

 return (
  <Auth
    isRegister={isRegister}
    setIsRegister={setIsRegister}

    showPassword={showPassword}
    setShowPassword={setShowPassword}

    fullName={fullName}
    setFullName={setFullName}

    universityId={universityId}
    setUniversityId={setUniversityId}

    phone={phone}
    setPhone={setPhone}

    password={password}
    setPassword={setPassword}

    message={message}
    loading={loading}

    setMessage={setMessage}
    setLoading={setLoading}

  />
)
}
}

export default App
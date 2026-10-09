import './StudentHome.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../common/Icon'
import StudentTabBar from './StudentTabBar'
import { loadCategoryDishes, loadHomeCategories } from '../../services/homeCategoryService'
import { loadAvailableBatches } from '../../services/orderService'
import { formatEGP, hasSizes, startingPrice } from '../../lib/pricing'
import { nextOpenBatch, minutesUntil, formatClock, formatCountdown } from '../../lib/batches'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// The next delivery drop: when it arrives and how long ordering stays open.
function NextDrop({ batch, now }) {
  if (!batch) {
    return (
      <div className="next-drop is-closed">
        <span className="next-drop-label">Next delivery</span>
        <strong className="next-drop-time">Not scheduled</strong>
        <p className="next-drop-note">No delivery batch is open right now. Check back soon.</p>
      </div>
    )
  }

  const closesIn = minutesUntil(batch.registration_end, now)
  const opensIn = minutesUntil(batch.registration_start, now)
  const notOpenYet = opensIn > 0
  const total = Math.max(1, minutesUntil(batch.registration_end, batch.registration_start))
  const elapsed = notOpenYet ? 0 : Math.min(1, Math.max(0, 1 - closesIn / total))

  return (
    <div className="next-drop">
      <span className="next-drop-label">Next delivery</span>
      <strong className="next-drop-time">{formatClock(batch.delivery_time)}</strong>
      <p className="next-drop-note">
        {notOpenYet
          ? `Ordering opens in ${formatCountdown(opensIn)}`
          : `Order in the next ${formatCountdown(closesIn)}`}
      </p>
      <div className="next-drop-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${elapsed})` }} />
      </div>
    </div>
  )
}

function StudentHome({
  restaurants,
  restaurantsLoading,
  search,
  setSearch,
  profile,
  setSelectedRestaurant,
  handleLogout,
  setStudentPage,
}) {
  const restaurantsRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [batches, setBatches] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [extrasLoading, setExtrasLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    Promise.all([loadHomeCategories(), loadCategoryDishes(), loadAvailableBatches()]).then(
      ([{ data: cats }, { data: dishRows }, { data: batchRows }]) => {
        if (cancelled) return
        setCategories(cats || [])
        setDishes(dishRows || [])
        setBatches(batchRows || [])
        setExtrasLoading(false)
      }
    )

    const timer = setInterval(() => setNow(Date.now()), 30000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  // Students only see restaurants the admin has switched on.
  const openRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.is_active !== false),
    [restaurants]
  )

  const restaurantById = useMemo(
    () => Object.fromEntries(openRestaurants.map((restaurant) => [restaurant.id, restaurant])),
    [openRestaurants]
  )

  const visibleDishes = useMemo(
    () => dishes.filter((dish) => restaurantById[dish.restaurant_id]),
    [dishes, restaurantById]
  )

  // Only show categories that have at least one dish to order.
  const usableCategories = useMemo(
    () => categories.filter((category) => visibleDishes.some((dish) => dish.home_category_id === category.id)),
    [categories, visibleDishes]
  )

  const categoryDishes = useMemo(
    () => (activeCategory ? visibleDishes.filter((dish) => dish.home_category_id === activeCategory.id) : []),
    [activeCategory, visibleDishes]
  )

  const filteredRestaurants = useMemo(() => {
    const searchText = search.toLowerCase().trim()
    let list = openRestaurants

    if (activeCategory) {
      const ids = new Set(categoryDishes.map((dish) => dish.restaurant_id))
      list = list.filter((restaurant) => ids.has(restaurant.id))
    }

    if (!searchText) return list

    const dishMatches = new Set(
      visibleDishes
        .filter((dish) => dish.name?.toLowerCase().includes(searchText))
        .map((dish) => dish.restaurant_id)
    )

    return list.filter(
      (restaurant) =>
        restaurant.name?.toLowerCase().includes(searchText) ||
        restaurant.description?.toLowerCase().includes(searchText) ||
        dishMatches.has(restaurant.id)
    )
  }, [openRestaurants, search, activeCategory, categoryDishes, visibleDishes])

  const nextBatch = useMemo(() => nextOpenBatch(batches, now), [batches, now])

  function openRestaurant(restaurant, focusFoodId = null) {
    setSelectedRestaurant(focusFoodId ? { ...restaurant, focusFoodId } : restaurant)
    setStudentPage('menu')
    window.scrollTo(0, 0)
  }

  function pickCategory(category) {
    setActiveCategory((current) => (current?.id === category.id ? null : category))
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const showDishes = activeCategory ? categoryDishes : []

  return (
    <div className="student-home">

      <header className="home-header">
        <div className="home-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo-256.webp`}
            alt="ANU Mosquito"
            className="home-logo"
            width="44"
            height="44"
          />
          <div className="home-brand-name">
            <span>ANU</span> Mosquito
          </div>
        </div>

        <div className="home-header-actions">
          <button className="header-orders-button" onClick={() => setStudentPage('orders')}>
            <Icon name="bag" size={18} />
            <span>My Orders</span>
          </button>

          <button className="logout-button" onClick={handleLogout} aria-label="Log out">
            <Icon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="home-content">

        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-hero-greeting">{greeting()}, {firstName}</p>
            <h1>What are you eating today?</h1>
            <p className="home-hero-text">Campus restaurants, delivered to you in the next batch.</p>
          </div>

          {extrasLoading ? (
            <div className="next-drop next-drop-skeleton skeleton" aria-hidden="true" />
          ) : (
            <NextDrop batch={nextBatch} now={now} />
          )}
        </section>

        <label className="search-box">
          <span className="sr-only">Search restaurants or dishes</span>
          <Icon name="search" size={20} />
          <input
            type="search"
            placeholder="Search a restaurant or a dish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </label>

        {(extrasLoading || usableCategories.length > 0) && (
          <section className="section" aria-label="Categories">
            <div className="cat-rail" role="list">
              {extrasLoading
                ? [0, 1, 2, 3].map((i) => <div key={i} className="cat-tile skeleton" aria-hidden="true" />)
                : usableCategories.map((category) => {
                    const active = activeCategory?.id === category.id
                    const count = visibleDishes.filter((dish) => dish.home_category_id === category.id).length
                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="listitem"
                        className={`cat-tile ${active ? 'active' : ''}`}
                        aria-pressed={active}
                        onClick={() => pickCategory(category)}
                      >
                        <span className="cat-tile-visual">
                          {category.image_url ? (
                            <img src={category.image_url} alt="" loading="lazy" />
                          ) : (
                            <span aria-hidden="true">{category.icon || '🍽️'}</span>
                          )}
                        </span>
                        <span className="cat-tile-name">{category.name}</span>
                        <span className="cat-tile-count">{count} {count === 1 ? 'dish' : 'dishes'}</span>
                      </button>
                    )
                  })}
            </div>
          </section>
        )}

        {activeCategory && (
          <section className="section dish-section">
            <div className="section-title-row">
              <h2>
                {activeCategory.icon} {activeCategory.name}
                <span className="section-count">{showDishes.length}</span>
              </h2>
              <button className="view-all-button" onClick={() => setActiveCategory(null)}>
                Clear
              </button>
            </div>

            <div className="dish-rail">
              {showDishes.map((dish) => {
                const restaurant = restaurantById[dish.restaurant_id]
                return (
                  <button
                    key={dish.id}
                    type="button"
                    className="dish-card"
                    onClick={() => openRestaurant(restaurant, dish.id)}
                  >
                    <span className="dish-card-image">
                      {dish.image_url ? (
                        <img src={dish.image_url} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span aria-hidden="true">{activeCategory.icon || '🍽️'}</span>
                      )}
                    </span>
                    <span className="dish-card-body">
                      <strong>{dish.name}</strong>
                      <small>{restaurant?.name}</small>
                      <em>{hasSizes(dish) ? `from ${formatEGP(startingPrice(dish))}` : formatEGP(dish.selling_price)}</em>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="section" ref={restaurantsRef}>
          <div className="section-title-row">
            <h2>
              {activeCategory ? `Restaurants with ${activeCategory.name.toLowerCase()}` : 'Restaurants'}
              {!restaurantsLoading && <span className="section-count">{filteredRestaurants.length}</span>}
            </h2>

            {(search || activeCategory) && (
              <button
                className="view-all-button"
                onClick={() => {
                  setSearch('')
                  setActiveCategory(null)
                }}
              >
                View all
              </button>
            )}
          </div>

          {restaurantsLoading ? (
            <div className="restaurant-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="restaurant-card skeleton-card">
                  <div className="restaurant-image-wrapper skeleton" />
                  <div className="restaurant-info">
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <h3>{search || activeCategory ? 'Nothing matches yet' : 'Restaurants coming soon'}</h3>
              <p>
                {search || activeCategory
                  ? 'Try another word, or clear the filters to see every restaurant.'
                  : 'Restaurants will appear here once they are added to ANU Mosquito.'}
              </p>
            </div>
          ) : (
            <div className="restaurant-grid">
              {filteredRestaurants.map((restaurant) => {
                const dishCount = visibleDishes.filter((dish) => dish.restaurant_id === restaurant.id).length
                return (
                  <button key={restaurant.id} className="restaurant-card" onClick={() => openRestaurant(restaurant)}>
                    <div className="restaurant-image-wrapper">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="restaurant-image"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="restaurant-image-placeholder">🍔</div>
                      )}
                      <span className="restaurant-status">Open</span>
                    </div>

                    <div className="restaurant-info">
                      <h3>{restaurant.name}</h3>
                      <p>{restaurant.description || 'Food from a campus kitchen, delivered in the next batch.'}</p>
                      <span className="restaurant-cta">
                        {dishCount > 0 ? `See ${dishCount} featured dishes` : 'View menu'}
                        <Icon name="arrowRight" size={16} />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <StudentTabBar
        active="home"
        profile={profile}
        setStudentPage={setStudentPage}
        handleLogout={handleLogout}
      />
    </div>
  )
}

export default StudentHome

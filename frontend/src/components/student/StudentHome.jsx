import './StudentHome.css'
import { useEffect, useMemo, useRef } from 'react'
import Icon from '../common/Icon'

const CATEGORIES = [
  { label: 'Burgers', emoji: '🍔', query: 'burger' },
  { label: 'Pizza', emoji: '🍕', query: 'pizza' },
  { label: 'Chicken', emoji: '🍗', query: 'chicken' },
  { label: 'Drinks', emoji: '🥤', query: 'drink' },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StudentHome({
  restaurants,
  restaurantsLoading,
  search,
  setSearch,
  profile,
  selectedRestaurant,
  setSelectedRestaurant,
  handleLogout,
  setStudentPage,
}) {
  const searchRef = useRef(null)
  const restaurantsRef = useRef(null)

  const filteredRestaurants = useMemo(() => {
    const searchText = search.toLowerCase().trim()

    if (!searchText) return restaurants

    return restaurants.filter(
      (restaurant) =>
        restaurant.name?.toLowerCase().includes(searchText) ||
        restaurant.description?.toLowerCase().includes(searchText)
    )
  }, [restaurants, search])

  // Close the restaurant modal with Escape and lock page scroll while open.
  useEffect(() => {
    if (!selectedRestaurant) return

    function onKeyDown(e) {
      if (e.key === 'Escape') setSelectedRestaurant(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [selectedRestaurant, setSelectedRestaurant])

  function scrollToRestaurants() {
    restaurantsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function pickCategory(query) {
    setSearch(search === query ? '' : query)
    scrollToRestaurants()
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

  return (
    <div className="student-home">

      {/* Header */}
      <header className="home-header">
        <div className="home-brand">
          <img
            src="/logo-256.webp"
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
          <button
            className="header-orders-button"
            onClick={() => setStudentPage('orders')}
          >
            <Icon name="bag" size={18} />
            <span>My Orders</span>
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <Icon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="home-content">

        {/* Welcome */}
        <section className="welcome-section">
          <div className="welcome-copy">
            <p className="welcome-small">
              {greeting()}, {firstName} 👋
            </p>
            <h1>Hungry? We&apos;ve got you.</h1>
            <p className="welcome-text">
              Order from campus restaurants and get it delivered to you.
            </p>
          </div>

          <img
            src="/logo-256.webp"
            alt=""
            className="welcome-mascot"
            width="168"
            height="168"
          />
        </section>

        {/* Search */}
        <label className="search-box">
          <span className="sr-only">Search restaurants</span>
          <Icon name="search" size={20} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search restaurants or food…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </label>

        {/* Quick Access */}
        <section className="section">
          <div className="quick-grid">
            <button className="quick-card" onClick={scrollToRestaurants}>
              <span className="quick-icon">🍔</span>
              <span>
                <strong>Restaurants</strong>
                <small>{restaurants.length} available</small>
              </span>
            </button>

            <button
              className="quick-card"
              onClick={() => setStudentPage('orders')}
            >
              <span className="quick-icon">📦</span>
              <span>
                <strong>My Orders</strong>
                <small>Track your deliveries</small>
              </span>
            </button>

            <div className="quick-card quick-card-static">
              <span className="quick-icon">👤</span>
              <span>
                <strong>{profile?.full_name || 'My Profile'}</strong>
                <small>ID {profile?.university_id || '—'}</small>
              </span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="section">
          <h2>Categories</h2>

          <div className="category-row">
            {CATEGORIES.map((category) => (
              <button
                key={category.query}
                className={search === category.query ? 'active' : ''}
                aria-pressed={search === category.query}
                onClick={() => pickCategory(category.query)}
              >
                <span aria-hidden="true">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>
        </section>

        {/* Restaurants */}
        <section className="section" ref={restaurantsRef}>
          <div className="section-title-row">
            <h2>
              Restaurants
              {!restaurantsLoading && (
                <span className="section-count">{filteredRestaurants.length}</span>
              )}
            </h2>

            {search && (
              <button
                className="view-all-button"
                onClick={() => setSearch('')}
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
              <h3>
                {search ? 'No restaurants found' : 'Restaurants coming soon'}
              </h3>
              <p>
                {search
                  ? 'Try another restaurant name.'
                  : 'Restaurants will appear here once they are added to ANU Mosquito.'}
              </p>
            </div>
          ) : (
            <div className="restaurant-grid">
              {filteredRestaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  className="restaurant-card"
                  onClick={() => setSelectedRestaurant(restaurant)}
                >
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
                    <p>
                      {restaurant.description ||
                        'Delicious food available for ANU students.'}
                    </p>
                    <span className="restaurant-cta">
                      View menu <Icon name="arrowRight" size={16} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Restaurant Modal */}
      {selectedRestaurant && (
        <div
          className="restaurant-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restaurant-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRestaurant(null)
            }
          }}
        >
          <div className="restaurant-modal-card">
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setSelectedRestaurant(null)}
            >
              <Icon name="close" size={18} />
            </button>

            {selectedRestaurant.image_url ? (
              <img
                src={selectedRestaurant.image_url}
                alt={selectedRestaurant.name}
                className="modal-restaurant-image"
              />
            ) : (
              <div className="modal-image-placeholder">🍔</div>
            )}

            <div className="modal-content">
              <span className="restaurant-status">● Open now</span>

              <h2 id="restaurant-modal-title">{selectedRestaurant.name}</h2>

              <p>
                {selectedRestaurant.description ||
                  'Delicious food available for ANU students.'}
              </p>

              <button
                className="modal-menu-button"
                autoFocus
                onClick={() => setStudentPage('menu')}
              >
                View menu <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentHome

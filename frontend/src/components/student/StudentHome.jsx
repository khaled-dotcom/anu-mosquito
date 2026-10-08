import './StudentHome.css'
function StudentHome({
  restaurants,
  restaurantsLoading,
  search,
  setSearch,
  profile,
  selectedRestaurant,
  setSelectedRestaurant,
  handleLogout,
  setMessage,
    studentPage,
  setStudentPage,
}) {
  const filteredRestaurants =
    restaurants.filter((restaurant) => {
      const searchText =
        search.toLowerCase().trim()

      if (!searchText) return true

      return (
        restaurant.name
          ?.toLowerCase()
          .includes(searchText) ||
        restaurant.description
          ?.toLowerCase()
          .includes(searchText)
      )
    })

  return (
    <div className="student-home">

      {/* Header */}
      <header className="home-header">

        <div className="home-brand">

          <img
            src="/logo.png"
            alt="ANU Mosquito"
            className="home-logo"
          />

          <div className="home-brand-name">
            <span>ANU</span> Mosquito
          </div>

        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>

      <main className="home-content">

        {/* Welcome */}
        <section className="welcome-section">

          <div>

            <p className="welcome-small">
              Welcome back 👋
            </p>

            <h1>
              {profile?.full_name || 'Student'}
            </h1>

            <p className="welcome-text">
              What would you like to eat today?
            </p>

          </div>

          <div className="mosquito-decoration">
            🦟
          </div>

        </section>

        {/* Search */}
        <div className="search-box">

          <span>⌕</span>

          <input
            type="text"
            placeholder="Search for restaurants or food..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        {/* Quick Access */}
        <section className="section">

          <h2>
            Quick Access
          </h2>

          <div className="quick-grid">

            <button className="quick-card">

              <span className="quick-icon">
                🍔
              </span>

              <span>
                Restaurants
              </span>

            </button>

            <button
  className="quick-card"
  onClick={() => setStudentPage('orders')}
>
  <span className="quick-icon">
    📦
  </span>

  <span>
    My Orders
  </span>
</button>

            <button className="quick-card">

              <span className="quick-icon">
                👤
              </span>

              <span>
                My Profile
              </span>

            </button>

          </div>

        </section>

        {/* Categories */}
        <section className="section">

          <h2>
            Categories
          </h2>

          <div className="category-row">

            <button>
              🍔 Burgers
            </button>

            <button>
              🍕 Pizza
            </button>

            <button>
              🍗 Chicken
            </button>

            <button>
              🥤 Drinks
            </button>

          </div>

        </section>

        {/* Restaurants */}
        <section className="section">

          <div className="section-title-row">

            <h2>
              Restaurants
            </h2>

            <button className="view-all-button">
              View All
            </button>

          </div>

          {restaurantsLoading ? (
            <div className="empty-state">

              <div className="empty-icon">
                🍽️
              </div>

              <h3>
                Loading restaurants...
              </h3>

              <p>
                Please wait.
              </p>

            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                🍽️
              </div>

              <h3>
                {search
                  ? 'No restaurants found'
                  : 'Restaurants coming soon'}
              </h3>

              <p>
                {search
                  ? 'Try another restaurant name.'
                  : 'Restaurants will appear here once they are added to ANU Mosquito.'}
              </p>

            </div>
          ) : (
            <div className="restaurant-grid">

              {filteredRestaurants.map(
                (restaurant) => (
                  <button
                    key={restaurant.id}
                    className="restaurant-card"
                    onClick={() =>
                      setSelectedRestaurant(
                        restaurant
                      )
                    }
                  >

                    <div className="restaurant-image-wrapper">

                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="restaurant-image"
                        />
                      ) : (
                        <div className="restaurant-image-placeholder">
                          🍔
                        </div>
                      )}

                    </div>

                    <div className="restaurant-info">

                      <h3>
                        {restaurant.name}
                      </h3>

                      <p>
                        {restaurant.description ||
                          'Delicious food available for ANU students.'}
                      </p>

                      <span className="restaurant-status">
                        ● Available
                      </span>

                    </div>

                  </button>
                )
              )}

            </div>
          )}

        </section>

      </main>

      {/* Restaurant Modal */}
      {selectedRestaurant && (
        <div
          className="restaurant-modal"
          onClick={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setSelectedRestaurant(null)
            }
          }}
        >

          <div className="restaurant-modal-card">

            <button
              className="modal-close"
              onClick={() =>
                setSelectedRestaurant(null)
              }
            >
              ×
            </button>

            {selectedRestaurant.image_url ? (
              <img
                src={selectedRestaurant.image_url}
                alt={selectedRestaurant.name}
                className="modal-restaurant-image"
              />
            ) : (
              <div className="modal-image-placeholder">
                🍔
              </div>
            )}

            <div className="modal-content">

              <h2>
                {selectedRestaurant.name}
              </h2>

              <p>
                {selectedRestaurant.description ||
                  'Delicious food available for ANU students.'}
              </p>

              <span className="restaurant-status">
                ● Available
              </span>

             <button
  className="modal-menu-button"
  onClick={() => {
    setStudentPage('menu')
  }}
>
  View Menu →
</button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default StudentHome
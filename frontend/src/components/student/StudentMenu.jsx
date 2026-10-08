import './StudentMenu.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import StudentCheckout from './StudentCheckout'
import Icon from '../common/Icon'
import Sheet from '../common/Sheet'

const OTHER_CATEGORY = '__other__'

function cartCountOf(cart) {
  return cart.reduce((total, item) => total + item.quantity, 0)
}

function cartTotalOf(cart) {
  return cart.reduce(
    (total, item) => total + Number(item.selling_price) * item.quantity,
    0
  )
}

function StudentMenu({
  selectedRestaurant,
  setStudentPage,
  profile,
  foodCategories,
  foodItems,
  foodLoading,
  loadMenuForRestaurant,
  goToStudentHome,
}) {
  const [selectedFood, setSelectedFood] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    if (selectedRestaurant?.id) {
      loadMenuForRestaurant(selectedRestaurant.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant])

  // Only show items that belong to this restaurant, so a previously opened
  // menu never flashes while the new one loads.
  const items = useMemo(
    () =>
      foodItems.filter(
        (item) =>
          !selectedRestaurant?.id ||
          !item.restaurant_id ||
          item.restaurant_id === selectedRestaurant.id
      ),
    [foodItems, selectedRestaurant]
  )

  const sections = useMemo(() => {
    const categories = foodCategories.filter(
      (category) =>
        !selectedRestaurant?.id ||
        !category.restaurant_id ||
        category.restaurant_id === selectedRestaurant.id
    )
    const known = new Set(categories.map((category) => category.id))

    const grouped = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        items: items.filter((item) => item.category_id === category.id),
      }))
      .filter((section) => section.items.length > 0)

    const others = items.filter((item) => !known.has(item.category_id))

    if (others.length > 0) {
      grouped.push({
        id: OTHER_CATEGORY,
        name: grouped.length ? 'More' : 'Menu',
        items: others,
      })
    }

    return grouped
  }, [foodCategories, items, selectedRestaurant])

  const visibleSections =
    activeCategory === 'all'
      ? sections
      : sections.filter((section) => section.id === activeCategory)

  const cartCount = cartCountOf(cart)
  const cartTotal = cartTotalOf(cart)

  const closeFood = useCallback(() => {
    setSelectedFood(null)
    setQuantity(1)
  }, [])

  const closeCart = useCallback(() => setShowCart(false), [])

  function openFood(item) {
    if (item.is_available === false) return
    setSelectedFood(item)
    setQuantity(1)
  }

  function addToCart() {
    if (!selectedFood) return

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === selectedFood.id)

      if (existing) {
        return currentCart.map((item) =>
          item.id === selectedFood.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [...currentCart, { ...selectedFood, quantity }]
    })

    closeFood()
  }

  function changeQuantity(itemId, delta) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(itemId) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== itemId))
  }

  function quantityInCart(itemId) {
    return cart.find((item) => item.id === itemId)?.quantity || 0
  }

  if (showCheckout) {
    return (
      <StudentCheckout
        cart={cart}
        setShowCheckout={setShowCheckout}
        profile={profile}
        selectedRestaurant={selectedRestaurant}
        setStudentPage={setStudentPage}
        goToStudentHome={goToStudentHome}
      />
    )
  }

  const loading = foodLoading && items.length === 0

  return (
    <div className="app-page student-menu">

      {/* Cover */}
      <div className="menu-hero">
        {selectedRestaurant?.image_url ? (
          <img
            src={selectedRestaurant.image_url}
            alt=""
            className="menu-hero-image"
          />
        ) : (
          <div className="menu-hero-placeholder" aria-hidden="true">🍔</div>
        )}

        <button
          type="button"
          className="menu-hero-back"
          onClick={() => {
            setStudentPage('home')
            window.scrollTo(0, 0)
          }}
          aria-label="Back to restaurants"
        >
          <Icon name="chevronLeft" size={22} />
        </button>
      </div>

      <div className={`menu-wrap ${cartCount > 0 ? 'has-cart' : ''}`}>

        {/* Restaurant info */}
        <section className="menu-info-card">
          <h1>{selectedRestaurant?.name || 'Menu'}</h1>

          {selectedRestaurant?.description && (
            <p>{selectedRestaurant.description}</p>
          )}

          <div className="menu-meta">
            <span className="status-badge tone-success">Open</span>
            <span className="menu-meta-item">
              <Icon name="truck" size={16} />
              Delivered in batches
            </span>
          </div>
        </section>

        {/* Category chips */}
        {sections.length > 1 && (
          <nav className="menu-categories" aria-label="Menu categories">
            <button
              type="button"
              className={activeCategory === 'all' ? 'active' : ''}
              aria-pressed={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>

            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeCategory === section.id ? 'active' : ''}
                aria-pressed={activeCategory === section.id}
                onClick={() => setActiveCategory(section.id)}
              >
                {section.name}
                <span>{section.items.length}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Items */}
        {loading ? (
          <div className="menu-items">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="menu-item menu-item-skeleton">
                <div className="menu-item-text">
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line short" />
                </div>
                <div className="menu-item-thumb skeleton" />
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>Menu coming soon</h3>
            <p>This restaurant hasn&apos;t added any food yet.</p>
          </div>
        ) : (
          visibleSections.map((section) => (
            <section key={section.id} className="menu-group">
              <h2>{section.name}</h2>

              <div className="menu-items">
                {section.items.map((item) => {
                  const unavailable = item.is_available === false
                  const inCart = quantityInCart(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`menu-item ${unavailable ? 'is-unavailable' : ''}`}
                      onClick={() => openFood(item)}
                      disabled={unavailable}
                    >
                      <div className="menu-item-text">
                        <h3>{item.name}</h3>
                        {item.description && <p>{item.description}</p>}
                        <div className="menu-item-bottom">
                          <strong>{item.selling_price} EGP</strong>
                          {unavailable && (
                            <span className="menu-item-tag">Unavailable</span>
                          )}
                          {inCart > 0 && (
                            <span className="menu-item-tag in-cart">
                              {inCart} in cart
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="menu-item-thumb">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span aria-hidden="true">🍽️</span>
                        )}

                        {!unavailable && (
                          <span className="menu-item-add" aria-hidden="true">
                            <Icon name="plus" size={18} strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && !showCart && !selectedFood && (
        <div className="app-bottom-bar menu-cart-dock">
          <div className="app-bottom-bar-inner">
            <button
              type="button"
              className="menu-cart-bar"
              onClick={() => setShowCart(true)}
            >
              <span className="menu-cart-count">{cartCount}</span>
              <span className="menu-cart-label">View cart</span>
              <strong>{cartTotal} EGP</strong>
            </button>
          </div>
        </div>
      )}

      {/* Food details */}
      <Sheet
        open={!!selectedFood}
        onClose={closeFood}
        className="food-sheet"
        hero={
          selectedFood?.image_url ? (
            <img
              src={selectedFood.image_url}
              alt=""
              className="food-sheet-image"
            />
          ) : null
        }
        title={selectedFood?.name}
        footer={
          <div className="food-sheet-footer">
            <div className="qty-stepper lg" role="group" aria-label="Quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Icon name="minus" size={18} strokeWidth={2.5} />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Icon name="plus" size={18} strokeWidth={2.5} />
              </button>
            </div>

            <button
              type="button"
              className="btn-primary btn-grow"
              onClick={addToCart}
            >
              Add · {Number(selectedFood?.selling_price || 0) * quantity} EGP
            </button>
          </div>
        }
      >
        {selectedFood?.description && (
          <p className="food-sheet-desc">{selectedFood.description}</p>
        )}
        <p className="food-sheet-price">{selectedFood?.selling_price} EGP</p>
      </Sheet>

      {/* Cart */}
      <Sheet
        open={showCart}
        onClose={closeCart}
        className="cart-sheet"
        title="Your cart"
        footer={
          cart.length === 0 ? (
            <button
              type="button"
              className="btn-secondary btn-block"
              onClick={closeCart}
            >
              Browse the menu
            </button>
          ) : (
            <>
              <div className="cart-sheet-total">
                <span>
                  Subtotal · {cartCount} item{cartCount === 1 ? '' : 's'}
                </span>
                <strong>{cartTotal} EGP</strong>
              </div>
              <p className="cart-sheet-note">
                Delivery fee is added at checkout.
              </p>
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => {
                  setShowCart(false)
                  setShowCheckout(true)
                }}
              >
                Go to checkout
                <Icon name="arrowRight" size={18} />
              </button>
            </>
          )
        }
      >
        {selectedRestaurant?.name && (
          <p className="cart-sheet-from">From {selectedRestaurant.name}</p>
        )}

        {cart.length === 0 ? (
          <div className="cart-sheet-empty">
            <div aria-hidden="true">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Add something tasty to get started.</p>
          </div>
        ) : (
          <ul className="cart-sheet-items">
            {cart.map((item) => (
              <li key={item.id} className="cart-sheet-item">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="cart-sheet-thumb" />
                ) : (
                  <span className="cart-sheet-thumb" aria-hidden="true">🍽️</span>
                )}

                <div className="cart-sheet-info">
                  <h3>{item.name}</h3>
                  <span>{item.selling_price} EGP each</span>

                  <div className="cart-sheet-controls">
                    <div className="qty-stepper" role="group" aria-label={`Quantity of ${item.name}`}>
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        {item.quantity === 1 ? (
                          <Icon name="trash" size={16} />
                        ) : (
                          <Icon name="minus" size={16} strokeWidth={2.5} />
                        )}
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        <Icon name="plus" size={16} strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="cart-sheet-remove"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <strong className="cart-sheet-line">
                  {Number(item.selling_price) * item.quantity} EGP
                </strong>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}

export default StudentMenu

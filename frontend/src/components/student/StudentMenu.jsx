import './StudentMenu.css'
import { useEffect, useState } from 'react'
import StudentCheckout from './StudentCheckout'

function StudentMenu({
  selectedRestaurant,
  setStudentPage,
    profile,
  foodCategories,
  foodItems,
  loadMenuForRestaurant,
  goToStudentHome,
}) {
const [selectedFood, setSelectedFood] = useState(null)
const [quantity, setQuantity] = useState(1)
const [cart, setCart] = useState([])
const [showCart, setShowCart] = useState(false)
const [showCheckout, setShowCheckout] = useState(false)

useEffect(() => {
  document.body.style.overflow = showCart ? 'hidden' : ''

  return () => {
    document.body.style.overflow = ''
  }
}, [showCart])

  useEffect(() => {
    if (selectedRestaurant?.id) {
      loadMenuForRestaurant(selectedRestaurant.id)
    }
  }, [selectedRestaurant])
  
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

  return (
  <div className="student-menu">

      <div className="menu-header">

  {selectedRestaurant?.image_url && (
    <img
      src={selectedRestaurant.image_url}
      className="restaurant-bg-logo"
      alt=""
    />
  )}

  <button
    className="back-button"
    onClick={() => setStudentPage('home')}
  >
    ←
  </button>

 <div className="restaurant-logo-container">

  {selectedRestaurant?.image_url && (
    <img
      src={selectedRestaurant.image_url}
      className="restaurant-main-logo"
      alt={selectedRestaurant.name}
    />
  )}

</div>

</div>
    

     <div className="menu-section">

  <h2>
    Categories
  </h2>

  <div className="category-list">

    {foodCategories.map((category) => (
      <div
        key={category.id}
        className="category-item"
      >
        {category.name}
      </div>
    ))}

  </div>

</div>

    <div className="cart-bar">
  <button
  className="cart-button"
  onClick={() => setShowCart(true)}
>
    🛒 Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
  </button>
</div>

      <div className="menu-section">

  <h2>
    Food Items
  </h2>

  <div className="food-grid">

      {foodItems.map((item) => (

<div
  key={item.id}
  className="food-card"
  onClick={() => {
  setSelectedFood(item)
  setQuantity(1)
}}
>
        <img
          src={item.image_url}
          alt={item.name}
          className="food-image"
        />

        <div className="food-content">

          <h3>
            {item.name}
          </h3>

          <p>
            {item.description}
          </p>

          <p className="food-price">
            {item.selling_price} EGP
          </p>

        </div>

      </div>

    ))}

  </div>

</div>
{selectedFood && (
  <div className="food-popup-overlay">
    <div className="food-popup">

      <button
        className="food-popup-close"
        onClick={() => {
  setSelectedFood(null)
  setQuantity(1)
}}
      >
        ×
      </button>

      <h2>{selectedFood.name}</h2>

      <p>{selectedFood.description}</p>

      <div className="quantity-control">
  <button
    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
  >
    -
  </button>

  <span>{quantity}</span>

  <button
    onClick={() => setQuantity((q) => q + 1)}
  >
    +
  </button>
</div>

      <button
  className="add-to-cart-button"
  onClick={() => {
    setCart((currentCart) => [
      ...currentCart,
      {
        ...selectedFood,
        quantity,
      },
    ])

    setSelectedFood(null)
    setQuantity(1)
  }}
>
  Add to Cart
</button>
    </div>
  </div>
)}

{showCart && (
  <div className="food-popup-overlay">
    <div className="food-popup cart-popup">

      <button
        className="food-popup-close"
        onClick={() => setShowCart(false)}
      >
        ×
      </button>

      <div className="cart-header">
        <div className="cart-icon">🛒</div>

        <div>
          <h2>Your Cart</h2>
          <p>Review your items before placing the order</p>
        </div>
      </div>

      <div className="cart-items">

  {cart.length === 0 ? (
    <div className="empty-cart">
      <div className="empty-cart-icon">🛒</div>

      <h3>Your cart is empty</h3>

      <p>
        Add some delicious items to your cart to continue.
      </p>
    </div>
  ) : (
    cart.map((item, index) => (
      <div
        key={`${item.id}-${index}`}
        className="cart-item"
      >

        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="cart-item-image"
          />
        )}

        <div className="cart-item-details">

          <h3>{item.name}</h3>

          {item.description && (
            <p className="cart-item-description">
              {item.description}
            </p>
          )}

          <div className="cart-item-bottom">

            <span className="cart-unit-price">
              {item.selling_price} EGP
            </span>

            <div className="cart-quantity">
              <button
                onClick={() => {
                  setCart((currentCart) =>
                    currentCart.map((cartItem, cartIndex) =>
                      cartIndex === index
                        ? {
                            ...cartItem,
                            quantity: Math.max(
                              1,
                              cartItem.quantity - 1
                            ),
                          }
                        : cartItem
                    )
                  )
                }}
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                onClick={() => {
                  setCart((currentCart) =>
                    currentCart.map((cartItem, cartIndex) =>
                      cartIndex === index
                        ? {
                            ...cartItem,
                            quantity: cartItem.quantity + 1,
                          }
                        : cartItem
                    )
                  )
                }}
              >
                +
              </button>
            </div>

            <strong>
              {item.selling_price * item.quantity} EGP
            </strong>

            <button
              className="remove-cart-item"
              onClick={() => {
                setCart((currentCart) =>
                  currentCart.filter(
                    (_, cartIndex) => cartIndex !== index
                  )
                )
              }}
            >
              🗑️
            </button>

          </div>

        </div>

      </div>
    ))
  )}

</div>

      <div className="cart-summary">

        <h3>Order Summary</h3>

        <div className="summary-row">
          <span>
            Subtotal (
            {cart.reduce(
              (total, item) => total + item.quantity,
              0
            )}{' '}
            items)
          </span>

          <strong>
            {cart.reduce(
              (total, item) =>
                total + item.selling_price * item.quantity,
              0
            )}{' '}
            EGP
          </strong>
        </div>

        <div className="summary-total">
          <span>Total</span>

          <strong>
            {cart.reduce(
              (total, item) =>
                total + item.selling_price * item.quantity,
              0
            )}{' '}
            EGP
          </strong>
        </div>

      </div>

      <button
  className="checkout-button"
  disabled={cart.length === 0}
  onClick={() => {
    if (cart.length === 0) return

    setShowCart(false)
    setShowCheckout(true)
  }}
>
  Proceed to Checkout →
</button>

      <button
        className="continue-shopping-button"
        onClick={() => setShowCart(false)}
      >
        Continue Shopping
      </button>

    </div>
  </div>
)}

</div>


  )
}

export default StudentMenu
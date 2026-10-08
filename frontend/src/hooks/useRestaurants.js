import { useState } from 'react'
import {
  loadRestaurants as fetchRestaurants,
  saveRestaurant,
  updateRestaurant,
  toggleRestaurantStatus,
  deleteRestaurant,
} from '../services/restaurantService'

function useRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [restaurantSearch, setRestaurantSearch] = useState('')

  const [showRestaurantForm, setShowRestaurantForm] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState(null)

  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantCode, setRestaurantCode] = useState('')
  const [restaurantDescription, setRestaurantDescription] = useState('')
  const [restaurantImageUrl, setRestaurantImageUrl] = useState('')
  const [restaurantIsActive, setRestaurantIsActive] = useState(true)

  async function loadRestaurants() {
    const { data, error } = await fetchRestaurants()

    if (error) {
      console.error('Load restaurants error:', error)
      return
    }

    setRestaurants(data || [])
  }

  function resetRestaurantForm() {
    setRestaurantName('')
    setRestaurantCode('')
    setRestaurantDescription('')
    setRestaurantImageUrl('')
    setRestaurantIsActive(true)
    setEditingRestaurant(null)
  }

  function openAddRestaurantForm() {
    resetRestaurantForm()
    setShowRestaurantForm(true)
  }

  function openEditRestaurantForm(restaurant) {
    setEditingRestaurant(restaurant)
    setRestaurantName(restaurant.name || '')
    setRestaurantCode(restaurant.code || '')
    setRestaurantDescription(restaurant.description || '')
    setRestaurantImageUrl(restaurant.image_url || '')
    setRestaurantIsActive(restaurant.is_active ?? true)
    setShowRestaurantForm(true)
  }

  function closeRestaurantForm() {
    setShowRestaurantForm(false)
    resetRestaurantForm()
  }

  async function handleSaveRestaurant() {
    if (!restaurantName.trim()) {
      alert('Please enter restaurant name.')
      return
    }

    const restaurantData = {
      name: restaurantName.trim(),
      code: restaurantCode.trim(),
      description: restaurantDescription.trim(),
      image_url: restaurantImageUrl.trim(),
      is_active: restaurantIsActive,
    }

    let result

    if (editingRestaurant) {
      result = await updateRestaurant(
        editingRestaurant.id,
        restaurantData
      )
    } else {
      result = await saveRestaurant(restaurantData)
    }

    if (result?.error) {
      console.error('Save restaurant error:', result.error)
      alert(result.error.message)
      return
    }

    await loadRestaurants()
    closeRestaurantForm()
  }

  async function handleToggleRestaurant(restaurant) {
    const { error } = await toggleRestaurantStatus(
      restaurant.id,
      !restaurant.is_active
    )

    if (error) {
      console.error('Toggle restaurant error:', error)
      alert(error.message)
      return
    }

    await loadRestaurants()
  }

  async function handleDeleteRestaurant(restaurant) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${restaurant.name}"?`
    )

    if (!confirmed) return

    const { error } = await deleteRestaurant(restaurant.id)

    if (error) {
      console.error('Delete restaurant error:', error)
      alert(error.message)
      return
    }

    await loadRestaurants()
  }

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const search = restaurantSearch.toLowerCase().trim()

    if (!search) return true

    return (
      restaurant.name?.toLowerCase().includes(search) ||
      restaurant.code?.toLowerCase().includes(search) ||
      restaurant.description?.toLowerCase().includes(search)
    )
  })

  return {
    restaurants,
    setRestaurants,

    restaurantSearch,
    setRestaurantSearch,
    filteredRestaurants,

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
    resetRestaurantForm,
    openAddRestaurantForm,
    openEditRestaurantForm,
    closeRestaurantForm,
    handleSaveRestaurant,
    handleToggleRestaurant,
    handleDeleteRestaurant,
  }
}

export default useRestaurants
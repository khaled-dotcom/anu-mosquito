import { useState } from 'react'
import {
  saveCategory,
  updateCategory,
  deleteCategory,
  saveFoodItem,
  updateFoodItem,
  deleteFoodItem,
  loadMenuForRestaurant as fetchMenuForRestaurant,
} from '../services/foodService'

function useFood() {
  // Food & Menu Management

  const [selectedMenuRestaurant, setSelectedMenuRestaurant] =
    useState(null)

  const [foodCategories, setFoodCategories] = useState([])
  const [foodItems, setFoodItems] = useState([])

  const [foodSearch, setFoodSearch] = useState('')
  const [foodLoading, setFoodLoading] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [restaurantDropdownOpen, setRestaurantDropdownOpen] =
    useState(false)

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categorySortOrder, setCategorySortOrder] = useState(0)
  const [categorySaving, setCategorySaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [showFoodForm, setShowFoodForm] = useState(false)

  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    category_id: '',
    selling_price: '',
    cost_price: '',
    image_url: '',
    is_available: true,
  })

  const [foodSaving, setFoodSaving] = useState(false)
  const [editingFood, setEditingFood] = useState(null)

  async function loadMenuForRestaurant(restaurantId) {
    if (!restaurantId) {
      setFoodCategories([])
      setFoodItems([])
      return
    }

    setCategoryLoading(true)
    setFoodLoading(true)

    const {
      categories,
      items,
      categoriesError,
      itemsError,
    } = await fetchMenuForRestaurant(restaurantId)

    if (categoriesError) {
      console.error(
        'Food categories error:',
        categoriesError
      )
      setFoodCategories([])
    } else {
      setFoodCategories(categories || [])
    }

    setCategoryLoading(false)

    if (itemsError) {
      console.error('Food items error:', itemsError)
      setFoodItems([])
    } else {
      setFoodItems(items || [])
    }

    setFoodLoading(false)
  }

  async function handleSaveCategory() {
    if (!selectedMenuRestaurant) {
      return
    }

    if (!categoryName.trim()) {
      alert('Please enter a category name.')
      return
    }

    setCategorySaving(true)

    const { error } = await saveCategory(
      selectedMenuRestaurant.id,
      categoryName,
      categorySortOrder
    )

    if (error) {
      console.error('Add category error:', error)
      alert(error.message)
    } else {
      setCategoryName('')
      setCategorySortOrder(0)
      setShowCategoryForm(false)

      await loadMenuForRestaurant(
        selectedMenuRestaurant.id
      )
    }

    setCategorySaving(false)
  }

 async function handleUpdateCategory() {
  if (!editingCategory) {
    return
  }

  if (!categoryName.trim()) {
    alert('Please enter a category name.')
    return
  }

  setCategorySaving(true)

  const { error } = await updateCategory(
    editingCategory.id,
    categoryName,
    categorySortOrder
  )

  if (error) {
    console.error('Update category error:', error)
    alert(error.message)
  } else {
    setEditingCategory(null)
    setCategoryName('')
    setCategorySortOrder(0)
    setShowCategoryForm(false)

    await loadMenuForRestaurant(
      selectedMenuRestaurant.id
    )
  }

  setCategorySaving(false)
}

async function handleDeleteCategory(categoryId) {
  const confirmed = window.confirm(
    'Are you sure you want to delete this category?'
  )

  if (!confirmed) {
    return
  }

  const { error } = await deleteCategory(categoryId)

  if (error) {
    console.error('Delete category error:', error)
    alert(error.message)
    return
  }

  await loadMenuForRestaurant(
    selectedMenuRestaurant.id
  )
}

  async function handleSaveFood() {
    if (!selectedMenuRestaurant) {
      alert('Please select a restaurant first.')
      return
    }

    if (!foodForm.name.trim()) {
      alert('Please enter food name.')
      return
    }

    if (!foodForm.category_id) {
      alert('Please select a category.')
      return
    }

    setFoodSaving(true)

    const { error } = await saveFoodItem(
      selectedMenuRestaurant.id,
      foodForm
    )

    if (error) {
      console.error('Add food error:', error)
      alert(error.message)
    } else {
      setFoodForm({
        name: '',
        description: '',
        category_id: '',
        selling_price: '',
        cost_price: '',
        image_url: '',
        is_available: true,
      })

      setShowFoodForm(false)

      await loadMenuForRestaurant(
        selectedMenuRestaurant.id
      )
    }

    setFoodSaving(false)
  }

  async function handleUpdateFood() {
    if (!editingFood) {
      return
    }

    if (!foodForm.name.trim()) {
      alert('Please enter food name.')
      return
    }

    if (!foodForm.category_id) {
      alert('Please select a category.')
      return
    }

    setFoodSaving(true)

    const { error } = await updateFoodItem(
      editingFood.id,
      foodForm
    )

    if (error) {
      console.error('Update food error:', error)
      alert(error.message)
    } else {
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

      setShowFoodForm(false)

      await loadMenuForRestaurant(
        selectedMenuRestaurant.id
      )
    }

    setFoodSaving(false)
  }

  async function handleDeleteFood(foodId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this food item?'
    )

    if (!confirmed) {
      return
    }

    const { error } = await deleteFoodItem(foodId)

    if (error) {
      console.error('Delete food error:', error)
      alert(error.message)
      return
    }

    await loadMenuForRestaurant(
      selectedMenuRestaurant.id
    )
  }

  return {
    selectedMenuRestaurant,
    setSelectedMenuRestaurant,

    foodCategories,
    setFoodCategories,

    foodItems,
    setFoodItems,

    foodSearch,
    setFoodSearch,

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
    editingCategory,
setEditingCategory,

    showFoodForm,
    setShowFoodForm,

    foodForm,
    setFoodForm,

    foodSaving,
    editingFood,
    setEditingFood,

    loadMenuForRestaurant,

    handleSaveCategory,
handleUpdateCategory,
handleDeleteCategory,
handleSaveFood,
handleUpdateFood,
handleDeleteFood,

  }
}

export default useFood
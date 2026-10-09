import { useState } from 'react'
import {
  saveCategory,
  updateCategory,
  deleteCategory,
  saveFoodItem,
  updateFoodItem,
  deleteFoodItem,
  loadMenuForRestaurant as fetchMenuForRestaurant,
  validateFoodForm,
} from '../services/foodService'

export function emptyFoodForm() {
  return {
    name: '',
    description: '',
    category_id: '',
    home_category_id: '',
    selling_price: '',
    cost_price: '',
    image_url: '',
    is_available: true,
    sizes: [],
  }
}

/** Turn a food item from the database into the edit form. */
export function foodToForm(food) {
  return {
    name: food.name || '',
    description: food.description || '',
    category_id: food.category_id || '',
    home_category_id: food.home_category_id || '',
    selling_price: food.selling_price ?? '',
    cost_price: food.cost_price ?? '',
    image_url: food.image_url || '',
    is_available: food.is_available !== false,
    sizes: (food.food_item_sizes || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((size) => ({
        id: size.id,
        name: size.name,
        selling_price: size.selling_price,
        cost_price: size.cost_price ?? '',
        is_available: size.is_available !== false,
      })),
  }
}

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

  const [foodForm, setFoodForm] = useState(emptyFoodForm())

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

    const problem = validateFoodForm(foodForm)
    if (problem) {
      alert(problem)
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
      setFoodForm(emptyFoodForm())

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

    const problem = validateFoodForm(foodForm)
    if (problem) {
      alert(problem)
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

      setFoodForm(emptyFoodForm())

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
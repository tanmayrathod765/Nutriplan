'use client'

import { useEffect, useState } from 'react'
import { X, AlertCircle, TrendingDown } from 'lucide-react'
import { Meal, SwapOption, UserProfile } from '@/lib/types'
import Image from 'next/image'

interface MealSwapModalProps {
  meal: Meal
  userProfile: Partial<UserProfile>
  isOpen: boolean
  onClose: () => void
  onConfirm: (newMeal: SwapOption) => void
}

interface DishSearchItem {
  id: string
  name: string
  cost_inr: number
  prep_time_min: number
}

interface CustomValidationResult {
  isSafe: boolean
  issues: string[]
}

export default function MealSwapModal({ meal, userProfile, isOpen, onClose, onConfirm }: MealSwapModalProps) {
  const [selectedSwap, setSelectedSwap] = useState<SwapOption | null>(null)
  const [dishQuery, setDishQuery] = useState('')
  const [dishOptions, setDishOptions] = useState<DishSearchItem[]>([])
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [isLoadingDishes, setIsLoadingDishes] = useState(false)
  const [isCheckingCustom, setIsCheckingCustom] = useState(false)
  const [customCheck, setCustomCheck] = useState<CustomValidationResult | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)

  const swapOptions = (meal.swap_options || []).filter(option => option.is_highly_recommended).slice(0, 3)

  useEffect(() => {
    if (!isOpen) return

    let isCancelled = false

    const fetchDishes = async () => {
      setIsLoadingDishes(true)
      setCustomError(null)
      try {
        const params = new URLSearchParams({
          mealType: meal.meal_type,
          query: dishQuery,
          limit: '40',
        })
        const response = await fetch(`/api/dishes?${params.toString()}`)
        const result = await response.json()
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Could not load dishes')
        }

        if (!isCancelled) {
          setDishOptions(Array.isArray(result.data) ? result.data : [])
        }
      } catch (error) {
        if (!isCancelled) {
          setDishOptions([])
          setCustomError(error instanceof Error ? error.message : 'Could not load dishes')
        }
      } finally {
        if (!isCancelled) setIsLoadingDishes(false)
      }
    }

    fetchDishes()

    return () => {
      isCancelled = true
    }
  }, [dishQuery, meal.meal_type, isOpen])

  if (!isOpen) return null

  const handleCheckCustomDish = async () => {
    if (!selectedDishId) return

    setIsCheckingCustom(true)
    setCustomError(null)
    try {
      const response = await fetch('/api/validate-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishId: selectedDishId,
          mealType: meal.meal_type,
          userProfile,
          currentMeal: meal,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Validation failed')
      }

      const validationResult: CustomValidationResult = {
        isSafe: Boolean(result.isSafe),
        issues: Array.isArray(result.issues) ? result.issues : [],
      }

      setCustomCheck(validationResult)

      if (validationResult.isSafe && result.option) {
        setSelectedSwap(result.option)
      } else if (selectedSwap?.dish_id === selectedDishId) {
        setSelectedSwap(null)
      }
    } catch (error) {
      setCustomCheck(null)
      setCustomError(error instanceof Error ? error.message : 'Validation failed')
    } finally {
      setIsCheckingCustom(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Swap This Meal</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose one of the best alternatives for {meal.dish_name}.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Meal */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Current Selection</p>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                  <Image
                    src={meal.unsplash_image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                    alt={meal.dish_name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">{meal.dish_name}</p>
                  <span className="badge badge-primary text-xs mt-1">{meal.meal_type}</span>
                  <div className="flex gap-3 mt-3 text-xs">
                    <span>{Math.round(meal.nutrition.calories)} cal</span>
                    <span>{Math.round(meal.nutrition.protein_g)}g protein</span>
                    <span>₹{meal.cost_inr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Options */}
            <div>
              <p className="text-sm font-bold mb-4">Available Swaps</p>
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                These recommendations are selected for your health goals. Please avoid changing them unless necessary.
              </p>
              <div className="space-y-4">
                {swapOptions.length > 0 ? (
                  swapOptions.map((option, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSwap(option)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedSwap?.dish_id === option.dish_id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={option.unsplash_image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                            alt={option.dish_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{option.dish_name}</p>
                            {option.is_highly_recommended && (
                              <span className="badge badge-success text-xs">⚡ Recommended</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {option.why_recommended || option.reason || 'Nutritious choice'}
                          </p>

                          {/* Nutrition comparison */}
                          <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                            <div>
                              <span className="text-gray-600">Calories</span>
                              <p className="font-bold">{Math.round(option.nutrition.calories)}</p>
                              <span className={`text-xs ${
                                option.nutrition.calories < meal.nutrition.calories
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {option.nutrition.calories < meal.nutrition.calories ? '↓' : '↑'} {Math.abs(Math.round(option.nutrition.calories - meal.nutrition.calories))}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Protein</span>
                              <p className="font-bold">{Math.round(option.nutrition.protein_g)}g</p>
                              <span className={`text-xs ${
                                option.nutrition.protein_g > meal.nutrition.protein_g
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {option.nutrition.protein_g > meal.nutrition.protein_g ? '↑' : '↓'} {Math.abs(Math.round(option.nutrition.protein_g - meal.nutrition.protein_g))}g
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Fiber</span>
                              <p className="font-bold">{Math.round(option.nutrition.fiber_g)}g</p>
                              <span className={`text-xs ${
                                option.nutrition.fiber_g > meal.nutrition.fiber_g
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {option.nutrition.fiber_g > meal.nutrition.fiber_g ? '↑' : '↓'} {Math.abs(Math.round(option.nutrition.fiber_g - meal.nutrition.fiber_g))}g
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Cost</span>
                              <p className="font-bold">₹{option.cost_inr}</p>
                              <span className={`text-xs ${
                                option.cost_inr < meal.cost_inr
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {option.cost_inr < meal.cost_inr ? '↓' : '↑'} ₹{Math.abs(Math.round(option.cost_inr - meal.cost_inr))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    No highly recommended alternatives are available for this meal right now.
                  </p>
                )}
              </div>
            </div>

            {/* Custom Dish Selection */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-bold mb-3">Choose Your Favorite Dish</p>
              <p className="text-xs text-gray-600 mb-3">
                You can pick your own dish, but we will check if it is safe for your health profile before allowing swap.
              </p>

              <input
                value={dishQuery}
                onChange={(e) => {
                  setDishQuery(e.target.value)
                  setCustomCheck(null)
                  setCustomError(null)
                }}
                placeholder="Search dish name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
              />

              <div className="max-h-40 overflow-auto border border-gray-200 rounded-md bg-white">
                {isLoadingDishes ? (
                  <p className="text-sm text-gray-500 p-3">Loading dishes...</p>
                ) : dishOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3">No dishes found for this meal type.</p>
                ) : (
                  dishOptions.map((dish) => (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => {
                        setSelectedDishId(dish.id)
                        setCustomCheck(null)
                        setCustomError(null)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 ${
                        selectedDishId === dish.id ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{dish.name}</span>
                      <span className="text-xs text-gray-500 ml-2">₹{dish.cost_inr} • {dish.prep_time_min} min</span>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckCustomDish}
                disabled={!selectedDishId || isCheckingCustom}
                className="btn btn-secondary mt-3 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingCustom ? 'Checking...' : 'Check Favorite Dish'}
              </button>

              {customError && (
                <p className="text-sm text-red-600 mt-3">{customError}</p>
              )}

              {customCheck && (
                <div className={`mt-3 p-3 rounded-md border ${customCheck.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-semibold ${customCheck.isSafe ? 'text-green-800' : 'text-red-800'}`}>
                    {customCheck.isSafe ? 'This custom dish is safe to swap.' : 'This custom dish is not safe for your profile.'}
                  </p>
                  {!customCheck.isSafe && customCheck.issues.length > 0 && (
                    <ul className="text-xs text-red-700 mt-2 list-disc pl-4">
                      {customCheck.issues.map((issue, idx) => (
                        <li key={`${issue}-${idx}`}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Safety Check */}
            {selectedSwap && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Nutrition Impact Check</p>
                    <p className="text-sm text-amber-800 mt-2">
                      This swap will change your daily nutrition profile. Make sure it aligns with your health conditions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t p-6 flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedSwap) {
                  onConfirm(selectedSwap)
                  onClose()
                }
              }}
              disabled={!selectedSwap}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingDown className="w-4 h-4" />
              Confirm Swap
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

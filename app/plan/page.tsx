'use client'

import { useState } from 'react'
import { useAppState } from '@/components/AppStateProvider'
import { ChevronLeft, ChevronRight, AlertCircle, Check, X } from 'lucide-react'
import MealCard from '@/components/MealCard'
import ConflictResolutionPanel from '@/components/ConflictResolutionPanel'
import MealSwapModal from '@/components/MealSwapModal'
import { Meal, SwapOption } from '@/lib/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function PlanPage() {
  const { state, dispatch } = useAppState()
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null)

  if (!state.weekPlan || !Array.isArray(state.weekPlan.days) || state.weekPlan.days.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No meal plan found. Please generate a plan first.</p>
        </div>
      </div>
    )
  }

  const plan = state.weekPlan
  const planDays = plan.days
  const boundedDayIndex = Math.min(currentDayIndex, Math.max(0, planDays.length - 1))
  const currentDay = planDays[boundedDayIndex]
  const summary = plan.week_summary || {
    avg_daily_calories: 0,
    avg_daily_cost_inr: 0,
    total_weekly_cost_inr: 0,
    nutrition_score: 0,
    compliance_percentage: 0,
  }

  const completionHistory = state.mealCompletionHistory || []
  const currentDayCompletions = completionHistory.filter(item => item.dayIndex === boundedDayIndex && item.consumed)
  const consumedMealKeySet = new Set(currentDayCompletions.map(item => `${item.dayIndex}-${item.mealIndex}`))

  const consumedNutrition = (currentDay.meals || []).reduce(
    (acc, meal, mealIndex) => {
      if (!consumedMealKeySet.has(`${boundedDayIndex}-${mealIndex}`)) return acc
      acc.calories += Number(meal.nutrition.calories || 0)
      acc.carbs_g += Number(meal.nutrition.carbs_g || 0)
      acc.protein_g += Number(meal.nutrition.protein_g || 0)
      acc.fat_g += Number(meal.nutrition.fat_g || 0)
      acc.sodium_mg += Number(meal.nutrition.sodium_mg || 0)
      acc.potassium_mg += Number(meal.nutrition.potassium_mg || 0)
      acc.phosphorus_mg += Number(meal.nutrition.phosphorus_mg || 0)
      acc.fiber_g += Number(meal.nutrition.fiber_g || 0)
      return acc
    },
    {
      calories: 0,
      carbs_g: 0,
      protein_g: 0,
      fat_g: 0,
      sodium_mg: 0,
      potassium_mg: 0,
      phosphorus_mg: 0,
      fiber_g: 0,
    }
  )

  const completedMealsCount = currentDayCompletions.length
  const totalMealsCount = (currentDay.meals || []).length

  const activeSwap = swappingMealId
    ? (() => {
      const [rawDay, rawMeal] = swappingMealId.split('-')
      const dayIndex = Number(rawDay)
      const mealIndex = Number(rawMeal)
      if (!Number.isFinite(dayIndex) || !Number.isFinite(mealIndex)) return null
      const day = planDays[dayIndex]
      if (!day) return null
      const meal = day.meals?.[mealIndex]
      if (!meal) return null
      return { dayIndex, mealIndex, meal }
    })()
    : null

  const mapSwapOptionToMeal = (baseMeal: Meal, option: SwapOption): Meal => ({
    meal_type: baseMeal.meal_type,
    dish_id: option.dish_id,
    dish_name: option.dish_name,
    serving_size_g: option.serving_size_g,
    cost_inr: option.cost_inr,
    prep_time_min: option.prep_time_min,
    ingredients: option.ingredients,
    nutrition: option.nutrition,
    gi_index: option.gi_index,
    clinical_reason: option.clinical_reason,
    health_benefits: option.health_benefits,
    why_recommended: option.why_recommended,
    validation: baseMeal.validation,
    is_highly_recommended: option.is_highly_recommended,
    swap_options: baseMeal.swap_options,
    unsplash_image_url: option.unsplash_image_url,
  })

  const replaceMealInPlan = (inputPlan: typeof plan, dayIndex: number, mealIndex: number, newMeal: Meal) => {
    const nextDays = inputPlan.days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day
      if (mealIndex < 0 || mealIndex >= day.meals.length) return day

      const nextMeals = day.meals.map((meal, mIdx) => (mIdx === mealIndex ? newMeal : meal))
      const totalNutrition = nextMeals.reduce(
        (acc, meal) => {
          acc.calories += Number(meal.nutrition.calories || 0)
          acc.carbs_g += Number(meal.nutrition.carbs_g || 0)
          acc.protein_g += Number(meal.nutrition.protein_g || 0)
          acc.fat_g += Number(meal.nutrition.fat_g || 0)
          acc.sodium_mg += Number(meal.nutrition.sodium_mg || 0)
          acc.potassium_mg += Number(meal.nutrition.potassium_mg || 0)
          acc.phosphorus_mg += Number(meal.nutrition.phosphorus_mg || 0)
          acc.fiber_g += Number(meal.nutrition.fiber_g || 0)
          return acc
        },
        {
          calories: 0,
          carbs_g: 0,
          protein_g: 0,
          fat_g: 0,
          sodium_mg: 0,
          potassium_mg: 0,
          phosphorus_mg: 0,
          fiber_g: 0,
        }
      )

      return {
        ...day,
        meals: nextMeals,
        total_nutrition: {
          calories: Number(totalNutrition.calories.toFixed(1)),
          carbs_g: Number(totalNutrition.carbs_g.toFixed(1)),
          protein_g: Number(totalNutrition.protein_g.toFixed(1)),
          fat_g: Number(totalNutrition.fat_g.toFixed(1)),
          sodium_mg: Number(totalNutrition.sodium_mg.toFixed(1)),
          potassium_mg: Number(totalNutrition.potassium_mg.toFixed(1)),
          phosphorus_mg: Number(totalNutrition.phosphorus_mg.toFixed(1)),
          fiber_g: Number(totalNutrition.fiber_g.toFixed(1)),
        },
        total_cost_inr: Number(nextMeals.reduce((sum, meal) => sum + Number(meal.cost_inr || 0), 0).toFixed(1)),
      }
    })

    const weeklyCalories = nextDays.reduce((sum, day) => sum + Number(day.total_nutrition.calories || 0), 0)
    const weeklyCost = nextDays.reduce((sum, day) => sum + Number(day.total_cost_inr || 0), 0)

    return {
      ...inputPlan,
      days: nextDays,
      week_summary: {
        ...inputPlan.week_summary,
        avg_daily_calories: Number((weeklyCalories / 7).toFixed(1)),
        avg_daily_cost_inr: Number((weeklyCost / 7).toFixed(1)),
        total_weekly_cost_inr: Number(weeklyCost.toFixed(1)),
      },
    }
  }

  const applySwapWithRebalance = async (dayIndex: number, mealIndex: number, option: SwapOption) => {
    const swappedMeal = mapSwapOptionToMeal(plan.days[dayIndex].meals[mealIndex], option)
    const swappedPlan = replaceMealInPlan(plan, dayIndex, mealIndex, swappedMeal)

    try {
      const response = await fetch('/api/rebalance-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekPlan: swappedPlan,
          userProfile: state.userProfile,
          resolvedEnvelope: state.resolvedEnvelope,
          mealCompletionHistory: state.mealCompletionHistory || [],
          swappedSlot: { dayIndex, mealIndex },
        }),
      })

      const result = await response.json()
      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error || 'Rebalance failed')
      }

      dispatch({ type: 'SET_WEEK_PLAN_KEEP_HISTORY', payload: result.data })
    } catch (error) {
      console.error('Rebalance failed, applying direct swap fallback:', error)
      dispatch({
        type: 'SWAP_MEAL',
        payload: {
          dayIndex,
          mealIndex,
          newMeal: swappedMeal,
        },
      })
    } finally {
      setSwappingMealId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600'
      case 'warn':
        return 'text-yellow-600'
      case 'fail':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <Check className="w-4 h-4" />
      case 'warn':
        return <AlertCircle className="w-4 h-4" />
      case 'fail':
        return <X className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Your 7-Day Meal Plan</h1>
          <p className="text-gray-600">Personalized for your health conditions and preferences</p>
        </div>

        {/* Conflict Resolution Panel */}
        {plan.conflict_resolutions && plan.conflict_resolutions.length > 0 && (
          <ConflictResolutionPanel conflicts={plan.conflict_resolutions} />
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <p className="text-xs text-gray-600">Avg Daily Calories</p>
            <p className="text-2xl font-bold text-green-600">{Math.round(summary.avg_daily_calories)}</p>
            <p className="text-xs text-gray-500 mt-1">kcal</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-600">Weekly Cost</p>
            <p className="text-2xl font-bold text-blue-600">₹{summary.total_weekly_cost_inr.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.avg_daily_cost_inr.toFixed(0)} per day</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-600">Nutrition Score</p>
            <p className="text-2xl font-bold text-purple-600">{summary.nutrition_score}/100</p>
            <p className="text-xs text-gray-500 mt-1">Quality</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-600">Compliance</p>
            <p className="text-2xl font-bold text-orange-600">{summary.compliance_percentage.toFixed(0)}%</p>
            <p className="text-xs text-gray-500 mt-1">Target met</p>
          </div>
        </div>

        {/* Day Selector */}
        <div className="card p-4 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
              className="btn btn-secondary"
              disabled={boundedDayIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-2 flex-wrap justify-center">
              {planDays.map((dayData, idx) => (
                <button
                  key={`${dayData.day_name || 'day'}-${idx}`}
                  onClick={() => setCurrentDayIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    currentDayIndex === idx
                      ? 'bg-green-600 text-white'
                      : `${getStatusColor(dayData.validation_status)} border border-gray-200 hover:bg-gray-50`
                  }`}
                >
                  {(dayData.day_name || DAYS[idx] || `Day ${idx + 1}`).slice(0, 3)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentDayIndex(Math.min(planDays.length - 1, currentDayIndex + 1))}
              className="btn btn-secondary"
              disabled={boundedDayIndex >= planDays.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Day Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {DAYS[boundedDayIndex] || `Day ${boundedDayIndex + 1}`} — {currentDay.day_name || `Day ${boundedDayIndex + 1}`}
          </h2>

          {/* Daily Stats */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="card p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Consumed Nutrition (Today)</p>
              <div className="space-y-1 text-sm">
                <p>🔥 Calories: {Math.round(consumedNutrition.calories)} / {Math.round(currentDay.total_nutrition.calories)} kcal</p>
                <p>🥗 Carbs: {consumedNutrition.carbs_g.toFixed(1)} / {currentDay.total_nutrition.carbs_g}g</p>
                <p>🥚 Protein: {consumedNutrition.protein_g.toFixed(1)} / {currentDay.total_nutrition.protein_g}g</p>
                <p>🧈 Fat: {consumedNutrition.fat_g.toFixed(1)} / {currentDay.total_nutrition.fat_g}g</p>
              </div>
            </div>

            <div className="card p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Critical Nutrients</p>
              <div className="space-y-1 text-sm">
                <p>🧂 Sodium: {consumedNutrition.sodium_mg.toFixed(0)} / {currentDay.total_nutrition.sodium_mg}mg</p>
                <p>🍌 Potassium: {consumedNutrition.potassium_mg.toFixed(0)} / {currentDay.total_nutrition.potassium_mg}mg</p>
                <p>⚛️ Phosphorus: {consumedNutrition.phosphorus_mg.toFixed(0)} / {currentDay.total_nutrition.phosphorus_mg}mg</p>
                <p>🌾 Fiber: {consumedNutrition.fiber_g.toFixed(1)} / {currentDay.total_nutrition.fiber_g}g</p>
              </div>
            </div>
          </div>

          <div className="card p-4 mb-8">
            <p className="text-sm font-medium text-gray-700">Meal Completion</p>
            <p className="text-lg font-bold text-green-700 mt-1">{completedMealsCount} / {totalMealsCount} meals completed</p>
          </div>

          {/* Validation Status */}
          <div className={`card p-4 mb-8 border-l-4 ${
            currentDay.validation_status === 'pass'
              ? 'border-l-green-500 bg-green-50'
              : currentDay.validation_status === 'warn'
                ? 'border-l-yellow-500 bg-yellow-50'
                : 'border-l-red-500 bg-red-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={getStatusColor(currentDay.validation_status)}>
                {getStatusIcon(currentDay.validation_status)}
              </div>
              <div>
                <p className="font-semibold">
                  {currentDay.validation_status === 'pass'
                    ? '✓ All Nutrients Within Target'
                    : currentDay.validation_status === 'warn'
                      ? '⚠ Minor Nutrient Variations'
                      : '✗ Significant Nutrient Deviations'}
                </p>
                <p className="text-sm text-gray-600 mt-1">Cost: ₹{currentDay.total_cost_inr}</p>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="space-y-4">
            {(currentDay.meals || []).map((meal, mealIndex) => (
              <MealCard
                key={mealIndex}
                meal={meal}
                isConsumed={consumedMealKeySet.has(`${boundedDayIndex}-${mealIndex}`)}
                isExpanded={expandedMealId === `${boundedDayIndex}-${mealIndex}`}
                onToggleExpand={() =>
                  setExpandedMealId(
                    expandedMealId === `${boundedDayIndex}-${mealIndex}` ? null : `${boundedDayIndex}-${mealIndex}`
                  )
                }
                onSwap={() => setSwappingMealId(`${boundedDayIndex}-${mealIndex}`)}
                onToggleConsumed={(consumed) =>
                  dispatch({
                    type: 'SET_MEAL_CONSUMED',
                    payload: { dayIndex: boundedDayIndex, mealIndex, consumed },
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {activeSwap && (
        <MealSwapModal
          meal={activeSwap.meal}
          userProfile={state.userProfile}
          isOpen={true}
          onClose={() => setSwappingMealId(null)}
          onConfirm={(option) => {
            void applySwapWithRebalance(activeSwap.dayIndex, activeSwap.mealIndex, option)
          }}
        />
      )}
    </div>
  )
}

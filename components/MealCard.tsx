'use client'

import { Meal } from '@/lib/types'
import { ChevronDown, Check, AlertCircle, X, Leaf, Zap } from 'lucide-react'
import Image from 'next/image'

interface MealCardProps {
  meal: Meal
  isExpanded: boolean
  isConsumed?: boolean
  onToggleExpand: () => void
  onSwap: () => void
  onToggleConsumed?: (consumed: boolean) => void
}

const getNutrientColor = (value: number, min: number, max: number) => {
  if (value < min) return 'bg-blue-100 text-blue-800'
  if (value > max * 1.1) return 'bg-red-100 text-red-800'
  if (value > max) return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

export default function MealCard({ meal, isExpanded, isConsumed = false, onToggleExpand, onSwap, onToggleConsumed }: MealCardProps) {
  const getStatusIcon = () => {
    switch (meal.validation.status) {
      case 'pass':
        return <Check className="w-4 h-4 text-green-600" />
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'fail':
        return <X className="w-4 h-4 text-red-600" />
    }
  }

  return (
    <div className={`card divide-y ${isConsumed ? 'ring-2 ring-green-300 bg-green-50/30' : ''}`}>
      {/* Header */}
      <div
        onClick={onToggleExpand}
        className="p-4 cursor-pointer hover:bg-gray-50 transition"
      >
        <div className="flex items-start gap-4">
          {/* Image */}
          <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src={meal.unsplash_image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'}
              alt={meal.dish_name}
              fill
              className="object-cover"
            />
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className={`text-lg font-bold ${isConsumed ? 'line-through text-gray-500' : ''}`}>{meal.dish_name}</h3>
              <div className={`badge ${meal.meal_type === 'breakfast' ? 'badge-primary' : meal.meal_type === 'snack' ? 'badge-warning' : 'badge-success'}`}>
                {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
              </div>
            </div>

            <label
              className="inline-flex items-center gap-2 mb-2 text-sm text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isConsumed}
                onChange={(e) => onToggleConsumed?.(e.target.checked)}
              />
              {isConsumed ? 'Patient consumed this meal' : 'Mark as consumed'}
            </label>

            {meal.is_highly_recommended && (
              <div className="badge badge-success mb-2 gap-1">
                <Zap className="w-3 h-3" /> Highly Recommended
              </div>
            )}

            <p className="text-sm text-gray-600 mb-2">{meal.clinical_reason}</p>

            {/* Quick Stats */}
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="badge bg-orange-100 text-orange-800">{Math.round(meal.nutrition.calories)} cal</span>
              <span className="badge bg-blue-100 text-blue-800">{meal.nutrition.carbs_g}g carbs</span>
              <span className="badge bg-pink-100 text-pink-800">{meal.nutrition.protein_g}g protein</span>
              <span className="badge bg-purple-100 text-purple-800">₹{meal.cost_inr}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">{getStatusIcon()} <ChevronDown className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`} /></div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Why Recommended */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">{meal.why_recommended}</p>
          </div>

          {/* Health Benefits */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Health Benefits</h4>
            <ul className="space-y-1">
              {meal.health_benefits.map((benefit, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <Leaf className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Nutrition Details */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Nutrition Per Serving</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{Math.round(meal.nutrition.calories)}</p>
                <p className="text-gray-600">Calories</p>
              </div>
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{meal.nutrition.protein_g}g</p>
                <p className="text-gray-600">Protein</p>
              </div>
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{meal.nutrition.fat_g}g</p>
                <p className="text-gray-600">Fat</p>
              </div>
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{meal.nutrition.carbs_g}g</p>
                <p className="text-gray-600">Carbs</p>
              </div>
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{meal.nutrition.fiber_g}g</p>
                <p className="text-gray-600">Fiber</p>
              </div>
              <div className="p-2 bg-gray-100 rounded text-center">
                <p className="font-medium">{meal.gi_index}</p>
                <p className="text-gray-600">GI Index</p>
              </div>
            </div>
          </div>

          {/* Critical Nutrients */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Critical Nutrients (CKD/HTN Safe)</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`p-2 rounded text-center ${getNutrientColor(meal.nutrition.sodium_mg, 0, 400)}`}>
                <p className="font-medium">{meal.nutrition.sodium_mg}mg</p>
                <p>Sodium</p>
              </div>
              <div className={`p-2 rounded text-center ${getNutrientColor(meal.nutrition.potassium_mg, 0, 250)}`}>
                <p className="font-medium">{meal.nutrition.potassium_mg}mg</p>
                <p>Potassium</p>
              </div>
              <div className={`p-2 rounded text-center ${getNutrientColor(meal.nutrition.phosphorus_mg, 0, 150)}`}>
                <p className="font-medium">{meal.nutrition.phosphorus_mg}mg</p>
                <p>Phosphorus</p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              {meal.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{ing.name}</span>
                  <span className="text-gray-500">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prep Time */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">⏱️ Prep Time: {meal.prep_time_min} min</span>
            <span className="text-gray-600">💰 Cost: ₹{meal.cost_inr}</span>
          </div>

          {/* Swap Button */}
          <button onClick={onSwap} className="btn btn-secondary w-full">
            🔄 Swap This Meal
          </button>
        </div>
      )}
    </div>
  )
}

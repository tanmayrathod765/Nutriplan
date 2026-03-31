import { NextRequest, NextResponse } from 'next/server'
import { filterByAllergens, filterByCondition } from '@/lib/indianFoodDB'
import { loadExternalIndianFoodDB } from '@/lib/externalFoodDB'
import { Meal, MealCompletionRecord, NutritionalEnvelope, Nutrition, UserProfile, WeekPlan } from '@/lib/types'

export const runtime = 'nodejs'

const NUTRIENT_KEYS: Array<keyof Nutrition> = [
  'calories',
  'carbs_g',
  'protein_g',
  'fat_g',
  'sodium_mg',
  'potassium_mg',
  'phosphorus_mg',
  'fiber_g',
]

type RebalanceRequest = {
  weekPlan: WeekPlan
  userProfile?: Partial<UserProfile>
  resolvedEnvelope?: NutritionalEnvelope
  mealCompletionHistory?: MealCompletionRecord[]
  swappedSlot?: { dayIndex: number; mealIndex: number }
}

function emptyNutrition(): Nutrition {
  return {
    calories: 0,
    carbs_g: 0,
    protein_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    phosphorus_mg: 0,
    fiber_g: 0,
  }
}

function addNutrition(target: Nutrition, source: Nutrition): Nutrition {
  const next = { ...target }
  for (const key of NUTRIENT_KEYS) {
    next[key] = Number(next[key] || 0) + Number(source[key] || 0)
  }
  return next
}

function nutritionFromDish(dish: any): Nutrition {
  const serving = Number(dish.typical_serving_g || 150)
  const scale = serving / 100
  const per100 = dish.per_100g || {}
  return {
    calories: Number((Number(per100.calories || 0) * scale).toFixed(1)),
    carbs_g: Number((Number(per100.carbs_g || 0) * scale).toFixed(1)),
    protein_g: Number((Number(per100.protein_g || 0) * scale).toFixed(1)),
    fat_g: Number((Number(per100.fat_g || 0) * scale).toFixed(1)),
    sodium_mg: Number((Number(per100.sodium_mg || 0) * scale).toFixed(1)),
    potassium_mg: Number((Number(per100.potassium_mg || 0) * scale).toFixed(1)),
    phosphorus_mg: Number((Number(per100.phosphorus_mg || 0) * scale).toFixed(1)),
    fiber_g: Number((Number(per100.fiber_g || 0) * scale).toFixed(1)),
  }
}

function ingredientsFromDish(dish: any) {
  const serving = Number(dish.typical_serving_g || 150)
  const ingredients = (dish.ingredients || []).slice(0, 6)
  return ingredients.map((name: string) => ({
    name,
    quantity: Math.max(5, Math.round(serving / Math.max(1, ingredients.length))),
    unit: 'g',
    cost_inr: Number((Number(dish.cost_per_serving_inr || 10) / Math.max(1, ingredients.length)).toFixed(1)),
  }))
}

function mealFromDish(dish: any, mealType: Meal['meal_type'], conditions: string[]): Meal {
  const nutrition = nutritionFromDish(dish)
  const conditionText = conditions.length > 0 ? conditions.join(', ') : 'your profile'
  return {
    meal_type: mealType,
    dish_id: dish.id,
    dish_name: dish.name,
    serving_size_g: Number(dish.typical_serving_g || 150),
    cost_inr: Number(dish.cost_per_serving_inr || 10),
    prep_time_min: Number(dish.prep_time_min || 15),
    ingredients: ingredientsFromDish(dish),
    nutrition,
    gi_index: Number(dish.gi_index || 50),
    clinical_reason: `Rebalanced after swap to align remaining plan with ${conditionText}.`,
    health_benefits: [
      'Adjusted to support weekly nutrient targets',
      'Aligned with profile condition filters',
      'Optimized for remaining days after swap',
    ],
    why_recommended: 'Auto-adjusted for weekly target alignment after your swap.',
    validation: {
      status: 'pass',
      issues: [],
      score: 80,
    },
    is_highly_recommended: true,
    swap_options: [],
    unsplash_image_url: dish.unsplash_image_url,
  }
}

function computeWeeklyTarget(
  weekPlan: WeekPlan,
  resolvedEnvelope?: NutritionalEnvelope
): Nutrition {
  if (resolvedEnvelope) {
    const midpoint = (tuple: [number, number]) => (Number(tuple[0] || 0) + Number(tuple[1] || 0)) / 2
    return {
      calories: midpoint(resolvedEnvelope.calories) * 7,
      carbs_g: midpoint(resolvedEnvelope.carbs_g) * 7,
      protein_g: midpoint(resolvedEnvelope.protein_g) * 7,
      fat_g: midpoint(resolvedEnvelope.fat_g) * 7,
      sodium_mg: midpoint(resolvedEnvelope.sodium_mg) * 7,
      potassium_mg: midpoint(resolvedEnvelope.potassium_mg) * 7,
      phosphorus_mg: midpoint(resolvedEnvelope.phosphorus_mg) * 7,
      fiber_g: midpoint(resolvedEnvelope.fiber_g) * 7,
    }
  }

  return weekPlan.days.reduce((acc, day) => addNutrition(acc, day.total_nutrition), emptyNutrition())
}

function scoreDish(
  dish: any,
  currentTotals: Nutrition,
  targets: Nutrition,
  conditions: string[],
  usedDishIds: Map<string, number> = new Map(),
  recentMealTypes: Set<string> = new Set()
): number {
  const n = nutritionFromDish(dish)
  let score = 0

  for (const key of NUTRIENT_KEYS) {
    const gap = Number(targets[key] || 0) - Number(currentTotals[key] || 0)
    const dishValue = Number(n[key] || 0)
    const preferred = gap >= 0 ? dishValue : -dishValue
    score += preferred * (key === 'calories' ? 0.6 : 1)
  }

  if (conditions.includes('DIABETES')) {
    score += (55 - Number(dish.gi_index || 55)) * 4
  }

  if (conditions.includes('HYPERTENSION') || conditions.includes('HEART_DISEASE')) {
    score += -Number(n.sodium_mg || 0) * 0.9
  }

  if (conditions.includes('CKD_STAGE_3') || conditions.includes('CKD_STAGE_4')) {
    score += -(Number(n.potassium_mg || 0) + Number(n.phosphorus_mg || 0)) * 0.6
  }

  // Diversity penalty: penalize dishes already used in the week
  const usageCount = usedDishIds.get(dish.id) || 0
  score -= usageCount * 100

  // Recency penalty: penalize same meal type used in recent days
  if (recentMealTypes.has(dish.meal_type)) {
    score -= 50
  }

  return score
}

function computeDayValidation(
  dayNutrition: Nutrition,
  resolvedEnvelope?: NutritionalEnvelope
): 'pass' | 'warn' | 'fail' {
  if (!resolvedEnvelope) return 'pass'

  let warn = false

  for (const key of NUTRIENT_KEYS) {
    const envelopeKey = key as keyof Omit<NutritionalEnvelope, 'gi_max'>
    const range = resolvedEnvelope[envelopeKey] as [number, number]
    if (!Array.isArray(range)) continue

    const value = Number(dayNutrition[key] || 0)
    const min = Number(range[0] || 0)
    const max = Number(range[1] || 0)

    if (value > max * 1.2 || value < min * 0.8) return 'fail'
    if (value > max || value < min) warn = true
  }

  return warn ? 'warn' : 'pass'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RebalanceRequest
    const weekPlan = body.weekPlan

    if (!weekPlan || !Array.isArray(weekPlan.days) || weekPlan.days.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid week plan' }, { status: 400 })
    }

    const userProfile = body.userProfile || {}
    const conditions = Array.isArray(userProfile.conditions) ? userProfile.conditions : []
    const completionHistory = Array.isArray(body.mealCompletionHistory) ? body.mealCompletionHistory : []

    let dishes = loadExternalIndianFoodDB()
    if (dishes.length === 0) {
      return NextResponse.json({ success: false, error: 'Dish dataset not available' }, { status: 500 })
    }

    if (userProfile.dietType === 'Pure Vegetarian') {
      dishes = dishes.filter(d => d.is_vegetarian)
    } else if (userProfile.dietType === 'Eggetarian') {
      // Eggetarian: Pure Vegetarian + Egg, but NO non-veg meat (chicken, fish, mutton, beef, pork)
      const nonVegPattern = /\bchicken\b|\bfish\b|\bmutton\b|\bbeef\b|\bpork\b/i
      dishes = dishes.filter(d => {
        const hasEgg = d.ingredients?.some((i: string) => /\begg\b|\beggs\b/i.test(i)) ?? false
        const hasNonVeg = d.ingredients?.some((i: string) => nonVegPattern.test(i)) ?? false
        return d.is_vegetarian || (hasEgg && !hasNonVeg)
      })
    }

    if (userProfile.region && userProfile.region !== 'Pan-Indian') {
      const regionKey = String(userProfile.region).toLowerCase().replace(' ', '-')
      const regionMatched = dishes.filter(d => d.region.includes(regionKey))
      if (regionMatched.length >= 10) dishes = regionMatched
    }

    if (Array.isArray(userProfile.allergens) && userProfile.allergens.length > 0) {
      dishes = filterByAllergens(dishes, userProfile.allergens)
    }

    const preferenceDishes = [...dishes]

    for (const condition of conditions) {
      dishes = filterByCondition(dishes, condition)
    }

    if (dishes.length < 14) dishes = preferenceDishes
    if (dishes.length === 0) dishes = loadExternalIndianFoodDB()

    const lockedSet = new Set<string>()
    for (const item of completionHistory) {
      if (item?.consumed) {
        lockedSet.add(`${item.dayIndex}-${item.mealIndex}`)
      }
    }

    if (body.swappedSlot && Number.isFinite(body.swappedSlot.dayIndex) && Number.isFinite(body.swappedSlot.mealIndex)) {
      lockedSet.add(`${body.swappedSlot.dayIndex}-${body.swappedSlot.mealIndex}`)
    }

    const weeklyTarget = computeWeeklyTarget(weekPlan, body.resolvedEnvelope)

    let runningTotals = emptyNutrition()
    weekPlan.days.forEach((day, dayIndex) => {
      day.meals.forEach((meal, mealIndex) => {
        if (lockedSet.has(`${dayIndex}-${mealIndex}`)) {
          runningTotals = addNutrition(runningTotals, meal.nutrition)
        }
      })
    })

    // Track used dishes across the week for diversity enforcement
    const usedDishIds = new Map<string, number>()
    weekPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        if (meal.dish_id) {
          usedDishIds.set(meal.dish_id, (usedDishIds.get(meal.dish_id) || 0) + 1)
        }
      })
    })

    // Helper: weighted random selection from top candidates
    const selectFromTopCandidates = (
      candidates: Array<{ dish: any; score: number }>,
      dayIndex: number,
      dayMeals: Meal[]
    ): any | null => {
      if (candidates.length === 0) return null

      // Sort descending by score
      const sorted = candidates.sort((a, b) => b.score - a.score)

      // Collect top 3 unique dishes (don't repeat within same day)
      const usedInDay = new Set(dayMeals.map(m => m.dish_id))
      const topUnique = sorted.filter(c => !usedInDay.has(c.dish.id)).slice(0, 3)

      if (topUnique.length === 0) {
        // Fallback: use best available dish even if used today
        return sorted[0]?.dish || null
      }

      if (topUnique.length === 1) return topUnique[0].dish

      // Weighted random selection: 50% top1, 30% top2, 20% top3 (if available)
      const rand = Math.random()
      if (rand < 0.5) return topUnique[0].dish
      if (topUnique.length >= 2 && rand < 0.8) return topUnique[1].dish
      if (topUnique.length >= 3) return topUnique[2].dish
      return topUnique[0].dish
    }

    const nextDays = weekPlan.days.map((day, dayIndex) => {
      // Track recent meal types (from last 2 days) for recency penalty
      const recentMealTypes = new Set<string>()
      if (dayIndex >= 1) {
        weekPlan.days[dayIndex - 1].meals.forEach(m => recentMealTypes.add(m.meal_type))
      }
      if (dayIndex >= 2) {
        weekPlan.days[dayIndex - 2].meals.forEach(m => recentMealTypes.add(m.meal_type))
      }

      const nextMeals: Meal[] = []

      for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
        const meal = day.meals[mealIndex]
        const lockKey = `${dayIndex}-${mealIndex}`
        if (lockedSet.has(lockKey)) {
          nextMeals.push(meal)
          continue
        }

        const mealType = meal.meal_type
        const mealTypePool = dishes.filter(d => d.meal_type?.includes(mealType))
        const pool = mealTypePool.length > 0 ? mealTypePool : dishes

        const candidates = pool.map((dish) => ({
          dish,
          score: scoreDish(dish, runningTotals, weeklyTarget, conditions, usedDishIds, recentMealTypes),
        }))

        const bestDish = selectFromTopCandidates(candidates, dayIndex, nextMeals)

        if (!bestDish) {
          nextMeals.push(meal)
          continue
        }

        const nextMeal = mealFromDish(bestDish, mealType, conditions)
        runningTotals = addNutrition(runningTotals, nextMeal.nutrition)
        
        // Update dish usage tracking
        usedDishIds.set(bestDish.id, (usedDishIds.get(bestDish.id) || 0) + 1)
        
        nextMeals.push(nextMeal)
      }

      const dayNutrition = nextMeals.reduce((acc, meal) => addNutrition(acc, meal.nutrition), emptyNutrition())
      const dayCost = Number(nextMeals.reduce((sum, meal) => sum + Number(meal.cost_inr || 0), 0).toFixed(1))

      return {
        ...day,
        meals: nextMeals,
        total_nutrition: {
          calories: Number(dayNutrition.calories.toFixed(1)),
          carbs_g: Number(dayNutrition.carbs_g.toFixed(1)),
          protein_g: Number(dayNutrition.protein_g.toFixed(1)),
          fat_g: Number(dayNutrition.fat_g.toFixed(1)),
          sodium_mg: Number(dayNutrition.sodium_mg.toFixed(1)),
          potassium_mg: Number(dayNutrition.potassium_mg.toFixed(1)),
          phosphorus_mg: Number(dayNutrition.phosphorus_mg.toFixed(1)),
          fiber_g: Number(dayNutrition.fiber_g.toFixed(1)),
        },
        total_cost_inr: dayCost,
        validation_status: computeDayValidation(dayNutrition, body.resolvedEnvelope),
      }
    })

    const weeklyCalories = nextDays.reduce((sum, day) => sum + Number(day.total_nutrition.calories || 0), 0)
    const weeklyCost = nextDays.reduce((sum, day) => sum + Number(day.total_cost_inr || 0), 0)

    const updatedWeekPlan: WeekPlan = {
      ...weekPlan,
      days: nextDays,
      week_summary: {
        ...weekPlan.week_summary,
        avg_daily_calories: Number((weeklyCalories / 7).toFixed(1)),
        avg_daily_cost_inr: Number((weeklyCost / 7).toFixed(1)),
        total_weekly_cost_inr: Number(weeklyCost.toFixed(1)),
      },
    }

    return NextResponse.json({ success: true, data: updatedWeekPlan })
  } catch (error) {
    console.error('Error rebalancing week plan:', error)
    return NextResponse.json({ success: false, error: 'Failed to rebalance plan' }, { status: 500 })
  }
}

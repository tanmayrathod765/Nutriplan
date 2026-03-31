import { NextRequest, NextResponse } from 'next/server'
import { loadExternalIndianFoodDB } from '@/lib/externalFoodDB'
import { SwapOption } from '@/lib/types'

export const runtime = 'nodejs'

const CONDITION_FLAG_BY_KEY: Record<string, 'diabetes_safe' | 'hypertension_safe' | 'ckd_stage3_safe' | 'ckd_stage4_safe' | 'heart_safe'> = {
  DIABETES: 'diabetes_safe',
  HYPERTENSION: 'hypertension_safe',
  CKD_STAGE_3: 'ckd_stage3_safe',
  CKD_STAGE_4: 'ckd_stage4_safe',
  HEART_DISEASE: 'heart_safe',
}

function roundToOne(value: number) {
  return Number(value.toFixed(1))
}

function normalizeToken(value: string) {
  return value.toLowerCase().trim()
}

function toServingNutrition(dish: any) {
  const serving = Number(dish.typical_serving_g || 150)
  const scale = serving / 100
  const per100 = dish.per_100g || {}

  return {
    calories: roundToOne(Number(per100.calories || 0) * scale),
    carbs_g: roundToOne(Number(per100.carbs_g || 0) * scale),
    protein_g: roundToOne(Number(per100.protein_g || 0) * scale),
    fat_g: roundToOne(Number(per100.fat_g || 0) * scale),
    sodium_mg: roundToOne(Number(per100.sodium_mg || 0) * scale),
    potassium_mg: roundToOne(Number(per100.potassium_mg || 0) * scale),
    phosphorus_mg: roundToOne(Number(per100.phosphorus_mg || 0) * scale),
    fiber_g: roundToOne(Number(per100.fiber_g || 0) * scale),
  }
}

function toIngredientItems(dish: any) {
  const ingredients = (dish.ingredients || []).slice(0, 6)
  const serving = Number(dish.typical_serving_g || 150)

  return ingredients.map((name: string) => ({
    name,
    quantity: Math.max(5, Math.round(serving / Math.max(1, ingredients.length))),
    unit: 'g',
    cost_inr: roundToOne(Number(dish.cost_per_serving_inr || 10) / Math.max(1, ingredients.length)),
  }))
}

export async function POST(request: NextRequest) {
  try {
    const { dishId, mealType, userProfile, currentMeal } = await request.json()

    if (!dishId || !mealType || !userProfile) {
      return NextResponse.json({ success: false, error: 'dishId, mealType and userProfile are required' }, { status: 400 })
    }

    const dishes = loadExternalIndianFoodDB()
    const dish = dishes.find((item) => item.id === dishId)

    if (!dish) {
      return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 })
    }

    const issues: string[] = []
    const normalizedMealType = String(mealType).toLowerCase()

    if (!dish.meal_type?.includes(normalizedMealType)) {
      issues.push('Selected dish is not compatible with this meal type.')
    }

    const dietType = String(userProfile?.dietType || 'Non-Vegetarian')
    const ingredientText = (dish.ingredients || []).join(' ').toLowerCase()

    if (dietType === 'Pure Vegetarian' && !dish.is_vegetarian) {
      issues.push('Selected dish is not compatible with Pure Vegetarian preference.')
    }

    if (dietType === 'Eggetarian') {
      const hasEgg = /\begg\b|\beggs\b/.test(ingredientText)
      if (!dish.is_vegetarian && !hasEgg) {
        issues.push('Selected dish is not compatible with Eggetarian preference.')
      }
    }

    const userAllergens = Array.isArray(userProfile?.allergens)
      ? userProfile.allergens.map((a: string) => normalizeToken(a))
      : []

    const dishAllergens = Array.isArray(dish.allergens)
      ? dish.allergens.map((a: string) => normalizeToken(a))
      : []

    const conflictingAllergens = dishAllergens.filter((a: string) => userAllergens.includes(a))
    if (conflictingAllergens.length > 0) {
      issues.push(`Allergen conflict detected: ${conflictingAllergens.join(', ')}`)
    }

    const conditions = Array.isArray(userProfile?.conditions) ? userProfile.conditions : []
    for (const condition of conditions) {
      const flagKey = CONDITION_FLAG_BY_KEY[condition]
      if (flagKey && !dish.condition_flags?.[flagKey]) {
        issues.push(`Not ideal for ${condition.replace(/_/g, ' ')}`)
      }
    }

    const nutrition = toServingNutrition(dish)
    const labValues = userProfile?.labValues || {}

    const hbA1c = Number(labValues.hbA1c)
    if (Number.isFinite(hbA1c) && hbA1c > 8 && Number(dish.gi_index || 0) > 55) {
      issues.push('High GI dish is not safe for elevated HbA1c.')
    }

    const bpSystolic = Number(labValues.bpSystolic)
    if (Number.isFinite(bpSystolic) && bpSystolic >= 140 && Number(nutrition.sodium_mg) > 300) {
      issues.push('Sodium is too high for elevated blood pressure.')
    }

    const eGFR = Number(labValues.eGFR)
    if (Number.isFinite(eGFR) && eGFR < 30 && (Number(nutrition.potassium_mg) > 220 || Number(nutrition.phosphorus_mg) > 140)) {
      issues.push('Potassium or phosphorus is too high for severe kidney impairment.')
    }

    const currentNutrition = currentMeal?.nutrition || { calories: 0, carbs_g: 0, protein_g: 0 }

    const option: SwapOption = {
      dish_id: dish.id,
      dish_name: dish.name,
      reason: issues.length > 0
        ? `Custom choice needs caution: ${issues.join(' ')}`
        : 'Custom dish validated against your health profile and nutrition constraints.',
      why_recommended: issues.length > 0
        ? 'This dish has potential safety concerns for your current profile.'
        : 'This custom dish is safe based on your profile, labs, and condition filters.',
      serving_size_g: Number(dish.typical_serving_g || 150),
      cost_inr: Number(dish.cost_per_serving_inr || 10),
      prep_time_min: Number(dish.prep_time_min || 15),
      ingredients: toIngredientItems(dish),
      nutrition,
      gi_index: Number(dish.gi_index || 50),
      clinical_reason: issues.length > 0
        ? 'Custom dish conflicts with one or more health checks.'
        : 'Custom dish passed profile- and lab-aware health checks.',
      health_benefits: issues.length > 0
        ? ['Review this choice with caution based on listed issues.']
        : [
          'Validated against your condition safety flags',
          'Checked against lab-aware risk thresholds',
          'Matched with your meal type and preference profile',
        ],
      is_highly_recommended: false,
      unsplash_image_url: dish.unsplash_image_url,
      nutrition_delta: {
        calories: roundToOne(Number(nutrition.calories || 0) - Number(currentNutrition.calories || 0)),
        carbs_g: roundToOne(Number(nutrition.carbs_g || 0) - Number(currentNutrition.carbs_g || 0)),
        protein_g: roundToOne(Number(nutrition.protein_g || 0) - Number(currentNutrition.protein_g || 0)),
      },
    }

    return NextResponse.json({
      success: true,
      isSafe: issues.length === 0,
      issues,
      option,
    })
  } catch (error) {
    console.error('Error validating custom swap:', error)
    return NextResponse.json({ success: false, error: 'Failed to validate custom swap' }, { status: 500 })
  }
}

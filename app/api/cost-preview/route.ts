import { NextRequest, NextResponse } from 'next/server'
import { loadExternalIndianFoodDB } from '@/lib/externalFoodDB'
import { filterByAllergens, filterByCondition } from '@/lib/indianFoodDB'

export const runtime = 'nodejs'

function pickByMealType(dishes: any[], mealType: string, offset: number) {
  const matched = dishes.filter(d => d.meal_type?.includes(mealType))
  const pool = matched.length > 0 ? matched : dishes
  if (pool.length === 0) return null
  return pool[offset % pool.length]
}

function getMealSequence(mealsPerDay: number) {
  if (mealsPerDay <= 3) return ['breakfast', 'lunch', 'dinner']
  if (mealsPerDay === 4) return ['breakfast', 'lunch', 'snack', 'dinner']
  return ['breakfast', 'snack', 'lunch', 'snack', 'dinner']
}

export async function POST(request: NextRequest) {
  try {
    const { userProfile } = await request.json()

    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid user profile' }, { status: 400 })
    }

    let dishes = loadExternalIndianFoodDB()
    if (dishes.length === 0) {
      return NextResponse.json({ error: 'CSV dishes not available' }, { status: 500 })
    }

    if (userProfile.dietType === 'Pure Vegetarian') {
      dishes = dishes.filter(d => d.is_vegetarian)
    } else if (userProfile.dietType === 'Eggetarian') {
      dishes = dishes.filter(d => d.is_vegetarian || (d.ingredients?.includes('eggs') ?? false))
    }

    if (userProfile.region && userProfile.region !== 'Pan-Indian') {
      const regionKey = String(userProfile.region).toLowerCase().replace(' ', '-')
      const regionMatched = dishes.filter(d => d.region.includes(regionKey))
      if (regionMatched.length >= 10) {
        dishes = regionMatched
      }
    }

    if (Array.isArray(userProfile.allergens) && userProfile.allergens.length > 0) {
      dishes = filterByAllergens(dishes, userProfile.allergens)
    }

    const preferenceDishes = [...dishes]

    if (Array.isArray(userProfile.conditions)) {
      for (const condition of userProfile.conditions) {
        dishes = filterByCondition(dishes, condition)
      }
    }

    if (dishes.length < 21) {
      dishes = preferenceDishes
    }

    if (dishes.length === 0) {
      dishes = loadExternalIndianFoodDB()
    }

    const mealsPerDay = Number(userProfile.mealsPerDay || 3)
    const mealSequence = getMealSequence(mealsPerDay)
    const familyCount = Number(userProfile.familyMembersCount || 1)

    const dailyCosts: number[] = []
    for (let day = 0; day < 7; day += 1) {
      let dayCost = 0
      for (let idx = 0; idx < mealSequence.length; idx += 1) {
        const mealType = mealSequence[idx]
        const dish = pickByMealType(dishes, mealType, day * 11 + idx)
        if (!dish) continue
        dayCost += Number(dish.cost_per_serving_inr || 0) * familyCount
      }
      dailyCosts.push(dayCost)
    }

    const weeklyCost = dailyCosts.reduce((sum, value) => sum + value, 0)
    const averageDailyCost = weeklyCost / 7
    const yearlyCost = weeklyCost * 52

    return NextResponse.json({
      success: true,
      data: {
        averageDailyCost: Number(averageDailyCost.toFixed(1)),
        weeklyCost: Number(weeklyCost.toFixed(1)),
        yearlyCost: Number(yearlyCost.toFixed(1)),
        familyCount,
        mealsPerDay,
        dishPoolSize: dishes.length,
      },
    })
  } catch (error) {
    console.error('Error calculating cost preview:', error)
    return NextResponse.json({ error: 'Failed to calculate cost preview' }, { status: 500 })
  }
}

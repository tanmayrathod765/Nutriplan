import { NextRequest, NextResponse } from 'next/server'
import { loadExternalIndianFoodDB } from '@/lib/externalFoodDB'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const mealType = (params.get('mealType') || '').trim().toLowerCase()
    const query = (params.get('query') || '').trim().toLowerCase()
    const rawLimit = Number(params.get('limit') || 40)
    const limit = Math.min(80, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 40))

    if (!mealType) {
      return NextResponse.json({ success: false, error: 'mealType is required' }, { status: 400 })
    }

    let dishes = loadExternalIndianFoodDB()
      .filter((dish) => dish.meal_type?.includes(mealType))

    if (query) {
      dishes = dishes.filter((dish) => dish.name.toLowerCase().includes(query))
    }

    const data = dishes
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((dish) => ({
        id: dish.id,
        name: dish.name,
        cost_inr: Number(dish.cost_per_serving_inr || 0),
        prep_time_min: Number(dish.prep_time_min || 0),
      }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error loading dishes for swap:', error)
    return NextResponse.json({ success: false, error: 'Failed to load dishes' }, { status: 500 })
  }
}

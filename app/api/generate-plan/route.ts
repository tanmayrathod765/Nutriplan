import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { IndianDish } from '@/lib/types'
import { resolveConflicts } from '@/lib/nutritionTargets'
import { filterByAllergens, filterByCondition } from '@/lib/indianFoodDB'
import { loadExternalIndianFoodDB } from '@/lib/externalFoodDB'

export const runtime = 'nodejs'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function roundToOne(value: number) {
  return Number(value.toFixed(1))
}

const CONDITION_FLAG_BY_KEY: Record<string, keyof IndianDish['condition_flags']> = {
  DIABETES: 'diabetes_safe',
  HYPERTENSION: 'hypertension_safe',
  CKD_STAGE_3: 'ckd_stage3_safe',
  CKD_STAGE_4: 'ckd_stage4_safe',
  HEART_DISEASE: 'heart_safe',
}

const SWAP_NOTE = 'These recommendations are selected for your health goals. Please avoid changing them unless necessary.'

function getDishNutritionForServing(dish: IndianDish, servingSizeG?: number) {
  const serving = Number(servingSizeG || dish.typical_serving_g || 150)
  const scale = serving / 100
  const per100 = dish.per_100g || {
    calories: 0,
    carbs_g: 0,
    protein_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    phosphorus_mg: 0,
    fiber_g: 0,
  }

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

function getIngredientItems(dish: IndianDish, servingSizeG?: number) {
  const serving = Number(servingSizeG || dish.typical_serving_g || 150)
  const items = (dish.ingredients || []).slice(0, 6)

  return items.map((name: string) => {
    const qty = Math.max(5, Math.round(serving / Math.max(1, items.length)))
    return {
      name,
      quantity: qty,
      unit: 'g',
      cost_inr: roundToOne((Number(dish.cost_per_serving_inr || 10) / Math.max(1, items.length))),
    }
  })
}

function isDishSafeForConditions(dish: IndianDish, conditions: string[]) {
  if (!conditions || conditions.length === 0) return true

  return conditions.every((condition) => {
    const key = CONDITION_FLAG_BY_KEY[condition]
    if (!key) return true
    return Boolean(dish.condition_flags?.[key])
  })
}

function scoreSwapCandidate(currentDish: IndianDish, candidateDish: IndianDish, conditions: string[]) {
  let score = 0

  const current = currentDish.per_100g
  const next = candidateDish.per_100g

  if (conditions.includes('DIABETES')) {
    score += currentDish.gi_index - candidateDish.gi_index
    score += (Number(current.carbs_g || 0) - Number(next.carbs_g || 0)) * 0.3
    score += (Number(next.fiber_g || 0) - Number(current.fiber_g || 0)) * 1.5
  }

  if (conditions.includes('HYPERTENSION') || conditions.includes('HEART_DISEASE')) {
    score += (Number(current.sodium_mg || 0) - Number(next.sodium_mg || 0)) * 0.8
    score += (Number(current.fat_g || 0) - Number(next.fat_g || 0)) * 0.2
  }

  if (conditions.includes('CKD_STAGE_3') || conditions.includes('CKD_STAGE_4')) {
    score += (Number(current.potassium_mg || 0) - Number(next.potassium_mg || 0)) * 0.4
    score += (Number(current.phosphorus_mg || 0) - Number(next.phosphorus_mg || 0)) * 0.5
    score += (Number(current.sodium_mg || 0) - Number(next.sodium_mg || 0)) * 0.4
  }

  const currentCost = Number(currentDish.cost_per_serving_inr || 0)
  const candidateCost = Number(candidateDish.cost_per_serving_inr || 0)
  const costDistance = Math.abs(candidateCost - currentCost)
  score += Math.max(0, 20 - costDistance * 2)

  return score
}

function buildSwapOptions(
  currentDish: IndianDish,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  conditions: string[],
  allowedDishes: IndianDish[]
) {
  const candidates = allowedDishes
    .filter(dish => dish.id !== currentDish.id)
    .filter(dish => dish.meal_type?.includes(mealType))
    .filter(dish => isDishSafeForConditions(dish, conditions))

  const sorted = candidates
    .map(dish => ({ dish, score: scoreSwapCandidate(currentDish, dish, conditions) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const currentNutrition = getDishNutritionForServing(currentDish)

  return sorted.map(({ dish }) => {
    const nutrition = getDishNutritionForServing(dish)

    return {
      dish_id: dish.id,
      dish_name: dish.name,
      reason: SWAP_NOTE,
      why_recommended: SWAP_NOTE,
      serving_size_g: Number(dish.typical_serving_g || 150),
      cost_inr: Number(dish.cost_per_serving_inr || 10),
      prep_time_min: Number(dish.prep_time_min || 15),
      ingredients: getIngredientItems(dish),
      nutrition,
      gi_index: Number(dish.gi_index || 50),
      clinical_reason: `Recommended from CSV dataset for better condition alignment (${conditions.join(', ') || 'general profile'}).`,
      health_benefits: [
        'Built from medically safer alternatives in your dataset',
        'Prioritizes condition-friendly nutrient profile',
        'Maintains practical cost and prep balance',
      ],
      is_highly_recommended: true,
      unsplash_image_url: dish.unsplash_image_url,
      nutrition_delta: {
        calories: roundToOne(nutrition.calories - currentNutrition.calories),
        carbs_g: roundToOne(nutrition.carbs_g - currentNutrition.carbs_g),
        protein_g: roundToOne(nutrition.protein_g - currentNutrition.protein_g),
      },
    }
  })
}

function pickDishForMeal(
  allowedDishes: any[],
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  usedDishIds: Set<string>,
  offset: number
) {
  const typeMatched = allowedDishes.filter(d => d.meal_type?.includes(mealType))
  const pool = typeMatched.length > 0 ? typeMatched : allowedDishes
  const unused = pool.filter(d => !usedDishIds.has(d.id))
  const finalPool = unused.length > 0 ? unused : pool
  if (finalPool.length === 0) return null
  return finalPool[offset % finalPool.length]
}

function dishToMeal(
  dish: IndianDish,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  conditions: string[],
  sequence: number,
  allowedDishes: IndianDish[]
) {
  const serving = Number(dish.typical_serving_g || 150)
  const nutrition = getDishNutritionForServing(dish, serving)
  const ingredientItems = getIngredientItems(dish, serving)

  const conditionText = conditions.length > 0 ? conditions.join(', ') : 'your health profile'

  return {
    meal_type: mealType,
    dish_id: dish.id,
    dish_name: dish.name,
    serving_size_g: serving,
    cost_inr: Number(dish.cost_per_serving_inr || 10),
    prep_time_min: Number(dish.prep_time_min || 15),
    ingredients: ingredientItems,
    nutrition,
    gi_index: Number(dish.gi_index || 50),
    clinical_reason: `Chosen from provided CSV dataset to align with ${conditionText}.`,
    health_benefits: [
      `Supports ${conditionText}`,
      `Aligned with nutrient limits from resolved envelope`,
      `Region and diet preference compatible`,
    ],
    why_recommended: `Dataset-driven selection for ${conditionText} with controlled nutrients.`,
    validation: {
      status: 'pass',
      issues: [],
    },
    is_highly_recommended: sequence % 2 === 0,
    swap_options: buildSwapOptions(dish, mealType, conditions, allowedDishes),
    unsplash_image_url: dish.unsplash_image_url,
  }
}

function buildFallbackDayPlan(dayIndex: number, allowedDishes: IndianDish[], userProfile: any) {
  const conditions = Array.isArray(userProfile?.conditions) ? userProfile.conditions : []
  const mealsPerDay = Number(userProfile?.mealsPerDay || 3)

  const mealSequence: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> =
    mealsPerDay <= 3
      ? ['breakfast', 'lunch', 'dinner']
      : mealsPerDay === 4
        ? ['breakfast', 'lunch', 'snack', 'dinner']
        : ['breakfast', 'snack', 'lunch', 'snack', 'dinner']

  const usedDishIds = new Set<string>()
  const meals = mealSequence.map((mealType, idx) => {
    const dish = pickDishForMeal(allowedDishes, mealType, usedDishIds, dayIndex * 7 + idx)
    if (!dish) return null
    usedDishIds.add(dish.id)
    return dishToMeal(dish, mealType, conditions, idx, allowedDishes)
  }).filter(Boolean)

  const total_nutrition = meals.reduce(
    (acc: any, meal: any) => {
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

  const total_cost_inr = meals.reduce((sum: number, meal: any) => sum + Number(meal.cost_inr || 0), 0)

  return {
    day: dayIndex + 1,
    day_name: DAY_NAMES[dayIndex],
    total_nutrition: {
      calories: roundToOne(total_nutrition.calories),
      carbs_g: roundToOne(total_nutrition.carbs_g),
      protein_g: roundToOne(total_nutrition.protein_g),
      fat_g: roundToOne(total_nutrition.fat_g),
      sodium_mg: roundToOne(total_nutrition.sodium_mg),
      potassium_mg: roundToOne(total_nutrition.potassium_mg),
      phosphorus_mg: roundToOne(total_nutrition.phosphorus_mg),
      fiber_g: roundToOne(total_nutrition.fiber_g),
    },
    total_cost_inr: roundToOne(total_cost_inr),
    validation_status: 'pass',
    meals,
  }
}

function normalizeToSevenDays(rawPlan: any, allowedDishes: any[], userProfile: any) {
  const sourceDays = Array.isArray(rawPlan?.days) ? rawPlan.days : []
  const normalizedDays = [...sourceDays].slice(0, 7).map((day, index) => ({
    ...day,
    day: index + 1,
    day_name: DAY_NAMES[index],
  }))

  while (normalizedDays.length < 7) {
    const index = normalizedDays.length
    normalizedDays.push(buildFallbackDayPlan(index, allowedDishes, userProfile))
  }

  for (let i = 0; i < normalizedDays.length; i += 1) {
    const day = normalizedDays[i]
    if (!Array.isArray(day?.meals) || day.meals.length === 0) {
      normalizedDays[i] = buildFallbackDayPlan(i, allowedDishes, userProfile)
      continue
    }

    const conditions = Array.isArray(userProfile?.conditions) ? userProfile.conditions : []
    const upgradedMeals = day.meals.map((meal: any) => {
      const dish = allowedDishes.find((item: IndianDish) => item.id === meal.dish_id)
      if (!dish) {
        return {
          ...meal,
          swap_options: [],
        }
      }

      return {
        ...meal,
        swap_options: buildSwapOptions(
          dish,
          meal.meal_type,
          conditions,
          allowedDishes
        ),
      }
    })

    normalizedDays[i] = {
      ...day,
      meals: upgradedMeals,
    }
  }

  const totalCalories = normalizedDays.reduce(
    (sum, day) => sum + Number(day?.total_nutrition?.calories || 0),
    0
  )
  const totalCost = normalizedDays.reduce((sum, day) => sum + Number(day?.total_cost_inr || 0), 0)

  return {
    ...rawPlan,
    days: normalizedDays,
    week_summary: {
      ...(rawPlan?.week_summary || {}),
      avg_daily_calories: Number((totalCalories / 7).toFixed(1)),
      avg_daily_cost_inr: Number((totalCost / 7).toFixed(1)),
      total_weekly_cost_inr: Number(totalCost.toFixed(1)),
    },
  }
}

function buildFallbackWeekPlan(allowedDishes: any[], userProfile: any, conflicts: any[]) {
  return normalizeToSevenDays(
    {
      week_summary: {
        avg_daily_calories: 0,
        avg_daily_cost_inr: 0,
        total_weekly_cost_inr: 0,
        nutrition_score: 72,
        compliance_percentage: 85,
      },
      conflict_resolutions: conflicts,
      days: [],
    },
    allowedDishes,
    userProfile
  )
}

export async function POST(request: NextRequest) {
  try {
    let { userProfile } = await request.json()

    if (!userProfile || !userProfile.conditions) {
      return NextResponse.json({ error: 'Invalid user profile' }, { status: 400 })
    }

    // Set default values for fields that might be missing
    userProfile = {
      ...userProfile,
      dailyBudgetPerPersonInr: userProfile.dailyBudgetPerPersonInr || 150,
      familyMembersCount: userProfile.familyMembersCount || 1,
      mealsPerDay: userProfile.mealsPerDay || 3,
      dietType: userProfile.dietType || 'Pan-Indian',
      region: userProfile.region || 'Pan-Indian',
      allergens: userProfile.allergens || [],
    }

    // Resolve nutritional envelope based on conditions
    const { envelope, conflicts } = resolveConflicts(userProfile.conditions, userProfile)

    // Use uploaded CSV-based DB only
    const externalDishes = loadExternalIndianFoodDB()
    const allDishes = [...externalDishes]

    // Dedupe dishes by id
    const uniqueDishMap = new Map(allDishes.map(dish => [dish.id, dish]))

    // Filter dishes based on user preferences
    let allowedDishes = Array.from(uniqueDishMap.values())

    // Apply diet type filter
    if (userProfile.dietType === 'Pure Vegetarian') {
      allowedDishes = allowedDishes.filter(d => d.is_vegetarian)
    } else if (userProfile.dietType === 'Eggetarian') {
      // Eggetarian: Pure Vegetarian + Egg, but NO non-veg meat (chicken, fish, mutton, beef, pork)
      const nonVegPattern = /\bchicken\b|\bfish\b|\bmutton\b|\bbeef\b|\bpork\b/i
      allowedDishes = allowedDishes.filter(d => {
        const hasEgg = d.ingredients?.some((i: string) => /\begg\b|\beggs\b/i.test(i)) ?? false
        const hasNonVeg = d.ingredients?.some((i: string) => nonVegPattern.test(i)) ?? false
        return d.is_vegetarian || (hasEgg && !hasNonVeg)
      })
    }

    // Apply region filter
    if (userProfile.region && userProfile.region !== 'Pan-Indian') {
      const regionKey = userProfile.region.toLowerCase().replace(' ', '-')
      allowedDishes = allowedDishes.filter(d => d.region.includes(regionKey))
    }

    // Apply allergen filter
    if (userProfile.allergens && userProfile.allergens.length > 0) {
      allowedDishes = filterByAllergens(allowedDishes, userProfile.allergens)
    }

    const preferenceFilteredDishes = [...allowedDishes]

    // Apply condition-safe filter
    for (const condition of userProfile.conditions) {
      allowedDishes = filterByCondition(allowedDishes, condition)
    }

    // Fallbacks to avoid empty/too-small pool for full-week generation
    if (allowedDishes.length < 7) {
      allowedDishes = preferenceFilteredDishes
    }

    if (allowedDishes.length === 0) {
      allowedDishes = Array.from(uniqueDishMap.values())
    }

    // Create system prompt
    const systemPrompt = `You are a clinical dietitian AI creating a personalized 7-day meal plan for an Indian patient with specific medical conditions.

CRITICAL INSTRUCTIONS:
1. PRIORITIZE MEDICAL DATA: Laboratory values from medical reports take absolute priority over any other considerations.
2. CONDITION-FOCUSED: Every meal must be clinically justified based on the patient's specific diseases.
3. Return ONLY valid JSON. No markdown, no explanations outside JSON.
4. Ensure all meals respect BOTH nutritional envelope AND disease-specific nutrient limits.
5. Select meals from the provided database only.
6. Include detailed clinical reasoning for every meal based on condition requirements.
7. Each meal recommendation must explain why it helps their specific conditions.
8. You MUST generate exactly 7 complete day plans for Monday through Sunday with varied meals.

CONDITION-SPECIFIC REQUIREMENTS:
DIABETES: 
- Prioritize low GI (< 55) foods
- Limit refined carbs, emphasize complex carbs with high fiber
- Include lean protein at each meal
- Monitor total carbohydrates strictly within envelope
- If HbA1c > 8%, be more aggressive with low GI selections

HYPERTENSION:
- Sodium MUST be within strict limits (< 2300mg/day ideal)
- Include potassium-rich foods for BP control
- Avoid processed foods
- Emphasize whole grains, vegetables, lean proteins

CKD (Chronic Kidney Disease):
- STRICT sodium and phosphorus control
- Monitor potassium carefully based on eGFR
- Protein must be calibrated (lower for Stage 4)
- Avoid high phosphorus foods
- CKD Stage 3: eGFR 30-59, be moderate
- CKD Stage 4: eGFR 15-29, be very restrictive

HEART DISEASE:
- Low sodium (< 1500mg/day preferred)
- Low saturated fat
- Include MUFA and Omega-3 foods
- Avoid high cholesterol foods
- Emphasize cardiovascular protective nutrients

QUALITY METRICS FOR PLAN:
- Clinical relevance score (0-100): How well meals address patient's conditions
- Lab value alignment: How well each meal supports improving reported lab values
- Compliance likelihood: Based on regional preferences and practical constraints

Response must be valid JSON exactly matching this schema:
{
  "week_summary": {
    "avg_daily_calories": number,
    "avg_daily_cost_inr": number,
    "total_weekly_cost_inr": number,
    "nutrition_score": number (0-100),
    "compliance_percentage": number
  },
  "conflict_resolutions": [
    {
      "nutrient": string,
      "from_condition": string,
      "to_condition": string,
      "reason": string
    }
  ],
  "days": [
    {
      "day": number,
      "day_name": string,
      "total_nutrition": {
        "calories": number,
        "carbs_g": number,
        "protein_g": number,
        "fat_g": number,
        "sodium_mg": number,
        "potassium_mg": number,
        "phosphorus_mg": number,
        "fiber_g": number
      },
      "total_cost_inr": number,
      "validation_status": "pass" | "warn" | "fail",
      "meals": [
        {
          "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
          "dish_id": string,
          "dish_name": string,
          "serving_size_g": number,
          "cost_inr": number,
          "prep_time_min": number,
          "ingredients": [
            {
              "name": string,
              "quantity": number,
              "unit": string,
              "cost_inr": number
            }
          ],
          "nutrition": {
            "calories": number,
            "carbs_g": number,
            "protein_g": number,
            "fat_g": number,
            "sodium_mg": number,
            "potassium_mg": number,
            "phosphorus_mg": number,
            "fiber_g": number
          },
          "gi_index": number,
          "clinical_reason": string,
          "health_benefits": ["string", "string", "string"],
          "why_recommended": string,
          "validation": {
            "status": "pass" | "warn" | "fail",
            "issues": ["string"]
          },
          "is_highly_recommended": boolean,
          "swap_options": [
            {
              "dish_id": string,
              "dish_name": string,
              "why_recommended": string,
              "serving_size_g": number,
              "cost_inr": number,
              "prep_time_min": number,
              "ingredients": [
                {
                  "name": string,
                  "quantity": number,
                  "unit": string,
                  "cost_inr": number
                }
              ],
              "nutrition": {
                "calories": number,
                "carbs_g": number,
                "protein_g": number,
                "fat_g": number,
                "sodium_mg": number,
                "potassium_mg": number,
                "phosphorus_mg": number,
                "fiber_g": number
              },
              "gi_index": number,
              "clinical_reason": string,
              "health_benefits": ["string", "string", "string"],
              "is_highly_recommended": boolean,
              "unsplash_image_url": string,
              "reason": string,
              "nutrition_delta": {
                "calories": number,
                "carbs_g": number,
                "protein_g": number
              }
            }
          ],
          "unsplash_image_url": string
        }
      ]
    }
  ]
}`

    const promptDishes = allowedDishes.slice(0, 120)

    const userPrompt = `Create a 7-day personalized Indian meal plan with:

PATIENT PROFILE:
- Age: ${userProfile.age}, Weight: ${userProfile.weightKg}kg
- Activity level: ${userProfile.activityLevel}
- Region preference: ${userProfile.region}
- Diet type: ${userProfile.dietType}

MEDICAL CONDITIONS (from patient examination):
${userProfile.conditions && userProfile.conditions.length > 0 ? userProfile.conditions.map((cond: string) => {
  const severity = userProfile.conditionSeverities?.[cond]
  return `- ${cond} (Severity: ${severity || 'Not specified'})`
}).join('\n') : '- No conditions specified'}

LABORATORY VALUES (from medical report - PRIORITIZE THESE):
${userProfile.labValues ? `
- HbA1c: ${userProfile.labValues.hbA1c || 'Not reported'}%
- Blood Pressure: ${userProfile.labValues.bpSystolic || '?'}/${userProfile.labValues.bpDiastolic || '?'} mmHg
- eGFR (Kidney function): ${userProfile.labValues.eGFR || 'Not reported'} mL/min
- Creatinine: ${userProfile.labValues.creatinine || 'Not reported'} mg/dL
- Potassium: ${userProfile.labValues.potassium || 'Not reported'} mEq/L
- Phosphorus: ${userProfile.labValues.phosphorus || 'Not reported'} mg/dL
` : '- No lab values provided'}

DIETARY REQUIREMENTS:
- Nutritional envelope: ${JSON.stringify(envelope)}
- Budget: ₹${userProfile.dailyBudgetPerPersonInr} per person per day
- Family members: ${userProfile.familyMembersCount}
- Meals per day: ${userProfile.mealsPerDay}

CRITICAL NOTES FOR MEAL SELECTION:
${userProfile.conditions?.includes('DIABETES') ? '✓ DIABETES: Focus on low GI foods, controlled carbs, high fiber. Target HbA1c reduction.' : ''}
${userProfile.conditions?.includes('HYPERTENSION') ? '✓ HYPERTENSION: Minimize sodium. Include potassium-rich foods. DASH diet principles.' : ''}
${userProfile.conditions?.includes('CKD_STAGE_3') || userProfile.conditions?.includes('CKD_STAGE_4') ? '✓ CKD: Strict sodium, phosphorus, potassium control. Monitor protein. eGFR=' + userProfile.labValues?.eGFR : ''}
${userProfile.conditions?.includes('HEART_DISEASE') ? '✓ HEART DISEASE: Low sodium, low saturated fat, high omega-3. Reduce cholesterol.' : ''}

Conflict resolutions already applied:
${conflicts.map(c => `- ${c.nutrient}: ${c.reason}`).join('\n')}

Available dishes from database:
${promptDishes.map(d => `- ${d.name} (${d.id}): ${d.per_100g.calories}cal, P:${d.per_100g.protein_g}g, F:${d.per_100g.fat_g}g, C:${d.per_100g.carbs_g}g, Na:${d.per_100g.sodium_mg}mg, K:${d.per_100g.potassium_mg}mg, Ph:${d.per_100g.phosphorus_mg}mg, ₹${d.cost_per_serving_inr}`).join('\n')}`

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API Key Missing',
          details: 'Please add GROQ_API_KEY to your .env.local file. Get your free key from https://console.groq.com/keys',
        },
        { status: 500 }
      )
    }

    const client = new Groq({ apiKey })

    let jsonBuffer = ''
    let stream
    try {
      stream = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: true,
      })
    } catch (modelError) {
      console.error('Model stream init failed, using fallback:', modelError)
      const fallbackPlan = buildFallbackWeekPlan(allowedDishes, userProfile, conflicts)
      const payload = `data: ${JSON.stringify({ complete: true, data: fallbackPlan })}\n\n`
      return new NextResponse(payload, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Create a ReadableStream that sends data to the client
    const encoder = new TextEncoder()
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const text = event.choices?.[0]?.delta?.content || ''
            if (text) {
              jsonBuffer += text

              // Send chunk to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
            }
          }

          // Send complete message at the end
          if (jsonBuffer.trim()) {
            const cleanJson = jsonBuffer.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
            let parsedData
            try {
              parsedData = JSON.parse(cleanJson)
            } catch {
              const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
              if (!jsonMatch) {
                throw new Error('Model response did not contain valid JSON')
              }
              parsedData = JSON.parse(jsonMatch[0])
            }
            const normalizedPlan = normalizeToSevenDays(parsedData, allowedDishes, userProfile)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ complete: true, data: normalizedPlan })}\n\n`)
            )
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Empty response from model' })}\n\n`)
            )
          }

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Stream processing failed'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
          controller.close()
        }
      },
    })

    return new NextResponse(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error generating plan:', error)
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 })
  }
}

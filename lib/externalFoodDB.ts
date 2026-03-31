import fs from 'fs'
import path from 'path'
import { ConditionFlags, IndianDish, NutritionPer100g } from './types'

type CsvRow = Record<string, string>

type UsdaNutrition = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
  sugar_g: number
  saturated_fat_g: number
}

let cachedExternalDishes: IndianDish[] | null = null

const INGREDIENT_PRICE_PER_100G: Record<string, number> = {
  rice: 5,
  basmati: 8,
  wheat: 4,
  flour: 4,
  maida: 4,
  semolina: 5,
  rava: 5,
  poha: 5,
  oats: 8,
  moong: 10,
  masoor: 9,
  urad: 10,
  arhar: 11,
  chana: 9,
  dal: 9,
  chickpeas: 9,
  rajma: 10,
  peas: 7,
  potato: 3,
  onion: 3,
  tomato: 4,
  carrot: 4,
  spinach: 5,
  cabbage: 4,
  bottle: 4,
  gourd: 4,
  coconut: 8,
  milk: 6,
  curd: 7,
  yogurt: 7,
  paneer: 24,
  cheese: 30,
  cream: 14,
  ghee: 20,
  butter: 18,
  oil: 14,
  egg: 8,
  chicken: 26,
  fish: 30,
  mutton: 48,
  beef: 35,
  pork: 28,
  sugar: 5,
  jaggery: 7,
  nuts: 30,
  cashew: 38,
  almond: 42,
  pistachio: 50,
  walnut: 45,
  peanut: 10,
  spices: 6,
}

const STATE_PRICE_MULTIPLIER: Record<string, number> = {
  maharashtra: 1.08,
  nctofdelhi: 1.12,
  delhi: 1.12,
  goa: 1.1,
  kerala: 1.06,
  karnataka: 1.05,
  telangana: 1.04,
  tamilnadu: 1.03,
  gujarat: 1.02,
  punjab: 1.03,
  rajasthan: 1.0,
  uttarpradesh: 0.97,
  bihar: 0.95,
  odisha: 0.95,
  westbengal: 0.98,
  assam: 0.97,
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const cleaned = value.trim()
  if (!cleaned || cleaned === '-1') return fallback
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0])
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i])
    const row: CsvRow = {}
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (cols[j] || '').trim()
    }
    rows.push(row)
  }

  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

function getMealTypes(course: string): string[] {
  const c = course.toLowerCase()
  if (c.includes('main')) return ['lunch', 'dinner']
  if (c.includes('snack')) return ['snack']
  if (c.includes('starter')) return ['snack']
  if (c.includes('dessert')) return ['snack']
  return ['lunch']
}

function getRegions(state: string, region: string): string[] {
  const mappedRegion = region.toLowerCase().replace(/\s+/g, '-')
  const mappedState = state.toLowerCase().replace(/\s+/g, '-')

  const list = ['pan-indian']
  if (mappedRegion && mappedRegion !== '-1') list.push(mappedRegion)
  if (mappedState && mappedState !== '-1') list.push(mappedState)
  return Array.from(new Set(list))
}

function inferAllergens(ingredients: string): string[] {
  const source = ingredients.toLowerCase()
  const allergens = new Set<string>()

  if (/milk|curd|yogurt|cream|paneer|cheese|butter|ghee/.test(source)) allergens.add('dairy')
  if (/egg/.test(source)) allergens.add('eggs')
  if (/fish|prawn|shrimp|lobster/.test(source)) allergens.add('fish')
  if (/peanut/.test(source)) allergens.add('peanuts')
  if (/cashew|almond|pistachio|walnut|nuts/.test(source)) allergens.add('tree nuts')
  if (/wheat|maida|flour|semolina|rava/.test(source)) allergens.add('gluten')
  if (/soy/.test(source)) allergens.add('soy')

  return Array.from(allergens)
}

function isVeganDish(diet: string, ingredients: string): boolean {
  if (diet.toLowerCase() !== 'vegetarian') return false
  const source = ingredients.toLowerCase()
  return !/milk|curd|yogurt|cream|paneer|cheese|butter|ghee|egg/.test(source)
}

function makeDefaultNutrition(row: CsvRow): UsdaNutrition {
  const course = (row.course || '').toLowerCase()
  const nonVeg = (row.diet || '').toLowerCase().includes('non')

  if (course.includes('dessert')) {
    return {
      calories: 320,
      protein_g: 4,
      carbs_g: 48,
      fat_g: 12,
      fiber_g: 1,
      sodium_mg: 180,
      potassium_mg: 120,
      phosphorus_mg: 90,
      sugar_g: 30,
      saturated_fat_g: 6,
    }
  }

  if (nonVeg) {
    return {
      calories: 180,
      protein_g: 18,
      carbs_g: 6,
      fat_g: 9,
      fiber_g: 1,
      sodium_mg: 260,
      potassium_mg: 260,
      phosphorus_mg: 180,
      sugar_g: 2,
      saturated_fat_g: 3,
    }
  }

  return {
    calories: 130,
    protein_g: 5,
    carbs_g: 18,
    fat_g: 4,
    fiber_g: 2,
    sodium_mg: 220,
    potassium_mg: 180,
    phosphorus_mg: 120,
    sugar_g: 4,
    saturated_fat_g: 1.5,
  }
}

function deriveGiIndex(carbs: number, sugar: number): number {
  let gi = 45
  if (carbs > 30) gi = 70
  else if (carbs > 22) gi = 60
  else if (carbs > 14) gi = 52

  if (sugar > 18) gi += 8
  else if (sugar > 10) gi += 4

  return Math.min(90, Math.max(15, gi))
}

function deriveConditionFlags(n: UsdaNutrition, gi: number): ConditionFlags {
  return {
    diabetes_safe: gi <= 55 && n.sugar_g <= 10,
    hypertension_safe: n.sodium_mg <= 300,
    ckd_stage3_safe: n.sodium_mg <= 280 && n.potassium_mg <= 280 && n.phosphorus_mg <= 150,
    ckd_stage4_safe: n.sodium_mg <= 230 && n.potassium_mg <= 200 && n.phosphorus_mg <= 120,
    heart_safe: n.sodium_mg <= 280 && n.saturated_fat_g <= 3.5,
  }
}

function findUsdaNutrition(name: string, ingredients: string, usdaMap: Map<string, UsdaNutrition>): UsdaNutrition | null {
  const nameKey = normalize(name)
  const ingredientKey = normalize((ingredients || '').split(',')[0] || '')

  if (usdaMap.has(nameKey)) return usdaMap.get(nameKey) || null
  if (ingredientKey && usdaMap.has(ingredientKey)) return usdaMap.get(ingredientKey) || null

  for (const [key, value] of Array.from(usdaMap.entries())) {
    if (key.includes(nameKey) || nameKey.includes(key)) return value
    if (ingredientKey && (key.includes(ingredientKey) || ingredientKey.includes(key))) return value
  }

  return null
}

function loadUsdaNutritionMap(usdaPath: string): Map<string, UsdaNutrition> {
  if (!fs.existsSync(usdaPath)) return new Map()

  const usdaRows = parseCsv(fs.readFileSync(usdaPath, 'utf-8'))
  const map = new Map<string, UsdaNutrition>()

  for (const row of usdaRows) {
    const description = row.Description || ''
    if (!description) continue

    const nutrition: UsdaNutrition = {
      calories: toNumber(row.Calories, 120),
      protein_g: toNumber(row.Protein, 4),
      carbs_g: toNumber(row.Carbohydrate, 15),
      fat_g: toNumber(row.TotalFat, 4),
      fiber_g: 1.5,
      sodium_mg: toNumber(row.Sodium, 220),
      potassium_mg: toNumber(row.Potassium, 160),
      phosphorus_mg: Math.max(30, Math.round(toNumber(row.Protein, 4) * 12 + 60)),
      sugar_g: toNumber(row.Sugar, 4),
      saturated_fat_g: toNumber(row.SaturatedFat, Math.max(1, toNumber(row.TotalFat, 4) * 0.3)),
    }

    map.set(normalize(description), nutrition)

    const firstToken = description.split(',')[0].trim()
    if (firstToken) {
      const firstTokenKey = normalize(firstToken)
      if (!map.has(firstTokenKey)) {
        map.set(firstTokenKey, nutrition)
      }
    }
  }

  return map
}

function getIngredientCostPer100g(ingredient: string): number {
  const token = normalize(ingredient)
  const entries = Object.entries(INGREDIENT_PRICE_PER_100G)
  for (const [key, value] of entries) {
    if (token.includes(normalize(key))) return value
  }
  return 8
}

function estimateServingQtyG(ingredient: string): number {
  const token = normalize(ingredient)

  if (/salt|turmeric|masala|spice|chilli|cardamom|saffron|kewra/.test(token)) return 2
  if (/oil|ghee|butter/.test(token)) return 6
  if (/nuts|cashew|almond|pistachio|walnut|raisin/.test(token)) return 8
  if (/sugar|jaggery|gur/.test(token)) return 12
  if (/cream|milk|curd|yogurt/.test(token)) return 25
  if (/egg/.test(token)) return 50
  if (/chicken|fish|mutton|beef|pork|paneer|tofu/.test(token)) return 70
  if (/rice|dal|flour|atta|maida|rava|semolina|poha|oats/.test(token)) return 45

  return 25
}

function estimateDishCostInr(ingredientsList: string[], state: string, prepTimeMin: number): number {
  const baseIngredientCost = ingredientsList.reduce((sum, ingredient) => {
    const per100g = getIngredientCostPer100g(ingredient)
    const qtyG = estimateServingQtyG(ingredient)
    return sum + (per100g * qtyG) / 100
  }, 0)

  const laborCost = Math.max(1.5, prepTimeMin * 0.12)
  const stateKey = normalize(state)
  const multiplier = STATE_PRICE_MULTIPLIER[stateKey] || 1

  return Math.max(8, Math.round((baseIngredientCost + laborCost) * multiplier))
}

function toIndianDish(row: CsvRow, usdaMap: Map<string, UsdaNutrition>): IndianDish {
  const dishName = row.name || 'Unknown Dish'
  const ingredients = row.ingredients || ''
  const matchedNutrition = findUsdaNutrition(dishName, ingredients, usdaMap)
  const nutrition = matchedNutrition || makeDefaultNutrition(row)

  const per100g: NutritionPer100g = {
    calories: nutrition.calories,
    protein_g: nutrition.protein_g,
    carbs_g: nutrition.carbs_g,
    fat_g: nutrition.fat_g,
    fiber_g: nutrition.fiber_g,
    sodium_mg: nutrition.sodium_mg,
    potassium_mg: nutrition.potassium_mg,
    phosphorus_mg: nutrition.phosphorus_mg,
  }

  const giIndex = deriveGiIndex(nutrition.carbs_g, nutrition.sugar_g)
  const conditionFlags = deriveConditionFlags(nutrition, giIndex)

  const prepTime = toNumber(row.prep_time, 10)
  const cookTime = toNumber(row.cook_time, 20)
  const totalTime = prepTime + cookTime

  const ingredientsList = ingredients
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)

  const id = slugify(dishName)
  const estimatedCost = estimateDishCostInr(ingredientsList, row.state || '', totalTime)

  return {
    id,
    name: dishName,
    hindi_name: dishName,
    region: getRegions(row.state || '', row.region || ''),
    meal_type: getMealTypes(row.course || ''),
    is_vegetarian: (row.diet || '').toLowerCase() !== 'non vegetarian',
    is_vegan: isVeganDish(row.diet || '', ingredients),
    allergens: inferAllergens(ingredients),
    per_100g: per100g,
    gi_index: giIndex,
    typical_serving_g: 150,
    cost_per_serving_inr: estimatedCost,
    prep_time_min: Math.max(5, totalTime || 20),
    condition_flags: conditionFlags,
    ingredients: ingredientsList,
    unsplash_image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
  }
}

export function loadExternalIndianFoodDB(): IndianDish[] {
  if (cachedExternalDishes) return cachedExternalDishes

  const indianFoodPath = path.join(process.cwd(), 'data', 'indian_food.csv')
  const usdaPath = path.join(process.cwd(), 'data', 'USDA.csv')

  if (!fs.existsSync(indianFoodPath)) {
    cachedExternalDishes = []
    return cachedExternalDishes
  }

  const usdaMap = loadUsdaNutritionMap(usdaPath)
  const rows = parseCsv(fs.readFileSync(indianFoodPath, 'utf-8'))

  const seen = new Set<string>()
  const dishes: IndianDish[] = []

  for (const row of rows) {
    const dish = toIndianDish(row, usdaMap)
    if (!seen.has(dish.id)) {
      seen.add(dish.id)
      dishes.push(dish)
    }
  }

  cachedExternalDishes = dishes
  return dishes
}

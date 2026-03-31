import { Meal, DayPlan, WeekPlan, NutritionalEnvelope, ValidationResult, ValidationIssue } from './types'

export function validateMeal(meal: Meal, envelope: NutritionalEnvelope): ValidationResult {
  const issues: ValidationIssue[] = []
  let score = 100

  // Check calories
  if (meal.nutrition.calories > envelope.calories[1] * 1.2) {
    issues.push({
      nutrient: 'calories',
      current: meal.nutrition.calories,
      min: envelope.calories[0],
      max: envelope.calories[1],
      severity: 'fail',
      message: `Calories ${meal.nutrition.calories}kcal exceeds limit ${envelope.calories[1]}kcal by >20%`,
    })
    score -= 15
  } else if (meal.nutrition.calories > envelope.calories[1] * 1.05) {
    issues.push({
      nutrient: 'calories',
      current: meal.nutrition.calories,
      min: envelope.calories[0],
      max: envelope.calories[1],
      severity: 'warn',
      message: `Calories ${meal.nutrition.calories}kcal slightly exceeds limit`,
    })
    score -= 5
  }

  // Check carbs
  if (meal.nutrition.carbs_g > envelope.carbs_g[1] * 1.2) {
    issues.push({
      nutrient: 'carbs',
      current: meal.nutrition.carbs_g,
      min: envelope.carbs_g[0],
      max: envelope.carbs_g[1],
      severity: 'fail',
      message: `Carbs ${meal.nutrition.carbs_g}g exceeds limit by >20%`,
    })
    score -= 10
  }

  // Check protein
  if (meal.nutrition.protein_g < envelope.protein_g[0] * 0.8) {
    issues.push({
      nutrient: 'protein',
      current: meal.nutrition.protein_g,
      min: envelope.protein_g[0],
      max: envelope.protein_g[1],
      severity: 'warn',
      message: `Protein ${meal.nutrition.protein_g}g below recommended minimum`,
    })
    score -= 5
  }

  // Check sodium
  if (meal.nutrition.sodium_mg > envelope.sodium_mg[1] * 1.1) {
    issues.push({
      nutrient: 'sodium',
      current: meal.nutrition.sodium_mg,
      min: envelope.sodium_mg[0],
      max: envelope.sodium_mg[1],
      severity: 'warn',
      message: `Sodium ${meal.nutrition.sodium_mg}mg exceeds limit`,
    })
    score -= 5
  }

  // Check potassium (critical for CKD)
  if (meal.nutrition.potassium_mg > envelope.potassium_mg[1] * 1.1) {
    issues.push({
      nutrient: 'potassium',
      current: meal.nutrition.potassium_mg,
      min: envelope.potassium_mg[0],
      max: envelope.potassium_mg[1],
      severity: 'warn',
      message: `Potassium ${meal.nutrition.potassium_mg}mg exceeds limit`,
    })
    score -= 8
  }

  // Check phosphorus (critical for CKD)
  if (meal.nutrition.phosphorus_mg > envelope.phosphorus_mg[1] * 1.1) {
    issues.push({
      nutrient: 'phosphorus',
      current: meal.nutrition.phosphorus_mg,
      min: envelope.phosphorus_mg[0],
      max: envelope.phosphorus_mg[1],
      severity: 'warn',
      message: `Phosphorus ${meal.nutrition.phosphorus_mg}mg exceeds limit`,
    })
    score -= 8
  }

  // Check GI index
  if (meal.gi_index > envelope.gi_max) {
    issues.push({
      nutrient: 'gi_index',
      current: meal.gi_index,
      min: 0,
      max: envelope.gi_max,
      severity: 'warn',
      message: `GI index ${meal.gi_index} exceeds recommended maximum ${envelope.gi_max}`,
    })
    score -= 5
  }

  const status: 'pass' | 'warn' | 'fail' = issues.some(i => i.severity === 'fail')
    ? 'fail'
    : issues.some(i => i.severity === 'warn')
      ? 'warn'
      : 'pass'

  return {
    status,
    issues,
    score: Math.max(0, score),
  }
}

export function validateDay(day: DayPlan, envelope: NutritionalEnvelope): ValidationResult {
  const issues: ValidationIssue[] = []
  let score = 100

  // Check daily calories
  if (day.total_nutrition.calories > envelope.calories[1] * 1.2) {
    issues.push({
      nutrient: 'daily_calories',
      current: day.total_nutrition.calories,
      min: envelope.calories[0],
      max: envelope.calories[1],
      severity: 'fail',
      message: `Daily calories ${day.total_nutrition.calories}kcal exceeds limit by >20%`,
    })
    score -= 20
  } else if (day.total_nutrition.calories > envelope.calories[1] * 1.05) {
    issues.push({
      nutrient: 'daily_calories',
      current: day.total_nutrition.calories,
      min: envelope.calories[0],
      max: envelope.calories[1],
      severity: 'warn',
      message: `Daily calories slightly exceeds optimal range`,
    })
    score -= 8
  }

  // Check daily carbs
  if (day.total_nutrition.carbs_g > envelope.carbs_g[1] * 1.2) {
    issues.push({
      nutrient: 'daily_carbs',
      current: day.total_nutrition.carbs_g,
      min: envelope.carbs_g[0],
      max: envelope.carbs_g[1],
      severity: 'fail',
      message: `Daily carbs exceeds limit by >20%`,
    })
    score -= 15
  }

  // Check daily protein
  if (day.total_nutrition.protein_g < envelope.protein_g[0] * 0.9) {
    issues.push({
      nutrient: 'daily_protein',
      current: day.total_nutrition.protein_g,
      min: envelope.protein_g[0],
      max: envelope.protein_g[1],
      severity: 'warn',
      message: `Daily protein ${day.total_nutrition.protein_g}g below recommended minimum`,
    })
    score -= 10
  }

  // Check daily sodium
  if (day.total_nutrition.sodium_mg > envelope.sodium_mg[1] * 1.15) {
    issues.push({
      nutrient: 'daily_sodium',
      current: day.total_nutrition.sodium_mg,
      min: envelope.sodium_mg[0],
      max: envelope.sodium_mg[1],
      severity: 'warn',
      message: `Daily sodium exceeds recommended limit`,
    })
    score -= 10
  }

  // Check daily potassium
  if (day.total_nutrition.potassium_mg > envelope.potassium_mg[1] * 1.15) {
    issues.push({
      nutrient: 'daily_potassium',
      current: day.total_nutrition.potassium_mg,
      min: envelope.potassium_mg[0],
      max: envelope.potassium_mg[1],
      severity: 'warn',
      message: `Daily potassium exceeds safe limit`,
    })
    score -= 15
  }

  // Check daily phosphorus
  if (day.total_nutrition.phosphorus_mg > envelope.phosphorus_mg[1] * 1.15) {
    issues.push({
      nutrient: 'daily_phosphorus',
      current: day.total_nutrition.phosphorus_mg,
      min: envelope.phosphorus_mg[0],
      max: envelope.phosphorus_mg[1],
      severity: 'warn',
      message: `Daily phosphorus exceeds safe limit`,
    })
    score -= 15
  }

  // Check daily fiber
  if (day.total_nutrition.fiber_g < envelope.fiber_g[0]) {
    issues.push({
      nutrient: 'daily_fiber',
      current: day.total_nutrition.fiber_g,
      min: envelope.fiber_g[0],
      max: envelope.fiber_g[1],
      severity: 'warn',
      message: `Daily fiber ${day.total_nutrition.fiber_g}g below recommended`,
    })
    score -= 5
  }

  const status: 'pass' | 'warn' | 'fail' = issues.some(i => i.severity === 'fail')
    ? 'fail'
    : issues.some(i => i.severity === 'warn')
      ? 'warn'
      : 'pass'

  return {
    status,
    issues,
    score: Math.max(0, score),
  }
}

export function calculateCompliancePercentage(
  actual: Partial<Record<string, number>>,
  target: [number, number]
): number {
  const key = Object.keys(actual)[0]
  const value = actual[key] || 0

  if (value < target[0]) {
    return (value / target[0]) * 100
  } else if (value > target[1]) {
    return 100 - (value - target[1]) / (target[1] * 0.2) * 10
  }
  return 100
}

export function validateWeek(plan: WeekPlan, envelope: NutritionalEnvelope) {
  let passCount = 0
  let warnCount = 0
  let failCount = 0

  for (const day of plan.days) {
    if (day.validation_status === 'pass') passCount++
    else if (day.validation_status === 'warn') warnCount++
    else failCount++
  }

  return {
    passCount,
    warnCount,
    failCount,
    totalScore: plan.week_summary.nutrition_score,
    compliancePercentage: plan.week_summary.compliance_percentage,
  }
}

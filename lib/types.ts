// User Profile & Conditions
export type Condition = 
  | 'DIABETES'
  | 'HYPERTENSION'
  | 'CKD_STAGE_3'
  | 'CKD_STAGE_4'
  | 'HEART_DISEASE'
  | 'OBESITY'
  | 'PCOD'

export type DiabetesSeverity = 'Controlled' | 'Uncontrolled' | 'Insulin-dependent'
export type HypertensionSeverity = 'Stage 1' | 'Stage 2' | 'Controlled'
export type CKDSeverity = 'Stage 3' | 'Stage 4'
export type HeartSeverity = 'Mild' | 'Moderate' | 'Severe'

export type ConditionSeverity = DiabetesSeverity | HypertensionSeverity | CKDSeverity | HeartSeverity

export interface UserProfile {
  id?: string
  fullName: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  weightKg: number
  heightCm: number
  bmi?: number
  conditions: Condition[]
  conditionSeverities: Partial<Record<Condition, ConditionSeverity>>
  medications: string[]
  labValues?: {
    hbA1c?: number
    bpSystolic?: number
    bpDiastolic?: number
    eGFR?: number
  }
  dietType: 'Pure Vegetarian' | 'Eggetarian' | 'Non-Vegetarian'
  region: 'North Indian' | 'South Indian' | 'Gujarati' | 'Bengali' | 'Maharashtrian' | 'Pan-Indian'
  allergens: string[]
  dislikedFoods: string
  mealsPerDay: 3 | 4 | 5 | 6
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active'
  cookingTimeAvailable: 'Under 15 min' | '15-30 min' | '30+ min'
  doFast: boolean
  fastingFrequency?: string
  insulinDependent?: boolean
  dailyBudgetPerPersonInr: number
  familyMembersCount: number
  pantryItems: string[]
}

// Nutritional Targets
export type NutritionalEnvelope = {
  calories: [number, number]
  carbs_g: [number, number]
  protein_g: [number, number]
  fat_g: [number, number]
  sodium_mg: [number, number]
  potassium_mg: [number, number]
  phosphorus_mg: [number, number]
  fiber_g: [number, number]
  gi_max: number
}

export interface ConflictResolution {
  nutrient: string
  condition1: string
  condition2: string
  resolvedTo: number | [number, number]
  reason: string
}

// Indian Food Database
export interface NutritionPer100g {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
}

export interface ConditionFlags {
  diabetes_safe: boolean
  hypertension_safe: boolean
  ckd_stage3_safe: boolean
  ckd_stage4_safe: boolean
  heart_safe: boolean
}

export interface IndianDish {
  id: string
  name: string
  region: string[]
  meal_type: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  allergens: string[]
  per_100g: NutritionPer100g
  gi_index: number
  typical_serving_g: number
  cost_per_serving_inr: number
  prep_time_min: number
  condition_flags: ConditionFlags
  ingredients: string[]
  unsplash_image_url: string
  hindi_name?: string
}

// Meal Plan
export interface Nutrition {
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
  fiber_g: number
}

export interface Ingredient {
  name: string
  quantity: number
  unit: string
  cost_inr: number
}

export interface SwapOption {
  dish_id: string
  dish_name: string
  reason: string
  why_recommended: string
  serving_size_g: number
  cost_inr: number
  prep_time_min: number
  ingredients: Ingredient[]
  nutrition: Nutrition
  gi_index: number
  clinical_reason: string
  health_benefits: string[]
  is_highly_recommended: boolean
  unsplash_image_url?: string
  nutrition_delta: {
    calories: number
    carbs_g: number
    protein_g: number
  }
}

export interface ValidationIssue {
  nutrient: string
  current: number
  min: number
  max: number
  severity: 'pass' | 'warn' | 'fail'
  message: string
}

export interface ValidationResult {
  status: 'pass' | 'warn' | 'fail'
  issues: ValidationIssue[]
  score: number
}

export interface Meal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  dish_id: string
  dish_name: string
  serving_size_g: number
  cost_inr: number
  prep_time_min: number
  ingredients: Ingredient[]
  nutrition: Nutrition
  gi_index: number
  clinical_reason: string
  health_benefits: string[]
  why_recommended: string
  validation: ValidationResult
  is_highly_recommended: boolean
  swap_options: SwapOption[]
  unsplash_image_url?: string
  consumed?: boolean
  consumedAt?: string
}

export interface MealCompletionRecord {
  dayIndex: number
  mealIndex: number
  consumed: boolean
  consumedAt?: string
}

export interface NutrientProgressMetric {
  nutrient: keyof Nutrition
  consumed: number
  targetMin: number
  targetMax: number
  percentage: number
  status: 'low' | 'on-track' | 'high'
}

export interface DailyProgress {
  dayIndex: number
  completedMeals: number
  totalMeals: number
  consumedNutrition: Nutrition
  plannedNutrition: Nutrition
  compliancePercentage: number
}

export interface DayPlan {
  day: number
  day_name: string
  total_nutrition: Nutrition
  total_cost_inr: number
  validation_status: 'pass' | 'warn' | 'fail'
  meals: Meal[]
}

export interface WeekSummary {
  avg_daily_calories: number
  avg_daily_cost_inr: number
  total_weekly_cost_inr: number
  nutrition_score: number
  compliance_percentage: number
}

export interface WeekPlan {
  week_summary: WeekSummary
  conflict_resolutions: ConflictResolution[]
  days: DayPlan[]
  weekStartDate?: string
}

// Session State
export interface AppState {
  currentStep: number
  userProfile: Partial<UserProfile>
  resolvedEnvelope?: NutritionalEnvelope
  conflictResolutions?: ConflictResolution[]
  weekPlan?: WeekPlan
  mealCompletionHistory?: MealCompletionRecord[]
  isGenerating: boolean
  error?: string
}

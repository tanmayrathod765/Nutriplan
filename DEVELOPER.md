# NutriPlan AI - Developer Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 App Router                    │
├──────────────────────────────────────────────────────────────┤
│ Pages:                                                       │
│ • / (intake form) → /preview (budget) → /plan (7-day plan)  │
│ • /dashboard (health overview)                              │
│ • /grocery (shopping list)                                  │
├──────────────────────────────────────────────────────────────┤
│ API Routes:                                                  │
│ • POST /api/generate-plan (streaming JSON)                  │
│ • POST /api/parse-pdf (text extraction)                     │
├──────────────────────────────────────────────────────────────┤
│ Libraries:                                                   │
│ • Anthropic Claude Sonnet 4 (meal planning AI)              │
│ • Recharts (visualization)                                  │
│ • pdf-parse (PDF extraction)                                │
│ • lucide-react (icons)                                      │
└──────────────────────────────────────────────────────────────┘
```

## Type System

All types defined in `lib/types.ts`:

### UserProfile
```typescript
{
  fullName: string
  age: number
  gender: 'male' | 'female' | 'other'
  weightKg: number
  heightCm: number
  conditions: ChronicCondition[]  // DIABETES, HYPERTENSION, etc.
  conditions_severity: Record<string, 'mild' | 'moderate' | 'severe'>
  medications: string[]
  labValues?: {
    hbA1c?: number          // %
    bp_systolic?: number    // mmHg
    bp_diastolic?: number   // mmHg
    eGFR?: number          // mL/min
  }
  dietType: 'pure_vegetarian' | 'eggetarian' | 'non_vegetarian'
  region: 'north_indian' | 'south_indian' | 'gujarati' | 'maharashtrian' | 'bengali' | 'kerala'
  allergens: string[]      // milk, wheat, nuts, etc.
  dislikedFoods: string[]
  mealsPerDay: 3 | 4 | 5 | 6
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
  cookingTimeAvailable: 'under_15_min' | '15_30_min' | '30_plus_min'
  fasting: boolean
  fastingFrequency?: 'alternate_day' | '16_8_intermittent'
  insulinDependent: boolean
  dailyBudgetInr: number   // ₹
  familyMembers: number
  pantryItems: string[]
}
```

### NutritionalEnvelope
```typescript
{
  calories: [min, max]
  protein_g: [min, max]
  carbs_g: [min, max]
  fat_g: [min, max]
  fiber_g: [min, max]
  sodium_mg: [min, max]
  potassium_mg: [min, max]
  phosphorus_mg: [min, max]
  gi_max: number
}
```

### Meal, DayPlan, WeekPlan
```typescript
Meal {
  id: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  image_url: string
  nutrition: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
    sodium_mg: number
    potassium_mg: number
    phosphorus_mg: number
    gi_index: number
  }
  cost_inr: number
  why_recommended: string
  health_benefits: string[]
  ingredients: string[]
  prep_time_min: number
  is_highly_recommended: boolean
  swap_options: Meal[]
}

DayPlan {
  day: number
  date: string
  meals: Meal[]
  total_nutrition: NutritionBreakdown
  total_cost_inr: number
  validation: {
    status: 'pass' | 'warn' | 'fail'
    compliance_percentage: number
    issues: string[]
  }
}

WeekPlan {
  week_number: number
  days: DayPlan[]
  week_summary: {
    avg_daily_calories: number
    avg_daily_cost_inr: number
    nutrition_score: number
    compliance_percentage: number
  }
  conflict_resolutions: ConflictResolution[]
}
```

## API Routes

### POST /api/generate-plan

Generates AI meal plan using streaming response.

**Request:**
```json
{
  "fullName": "Ramesh Kumar",
  "age": 58,
  "conditions": ["DIABETES", "HYPERTENSION"],
  "conditions_severity": {
    "DIABETES": "moderate",
    "HYPERTENSION": "mild"
  },
  "weightKg": 85,
  "heightCm": 175,
  "dietType": "eggetarian",
  "region": "gujarati",
  "mealsPerDay": 4,
  "activityLevel": "lightly_active",
  "dailyBudgetInr": 150,
  "familyMembers": 1
}
```

**Response (Server-Sent Events):**
```
data: {"type": "start"}
data: {"type": "progress", "message": "Analyzing conditions..."}
data: {"type": "progress", "message": "Generating meal plan..."}
data: {"type": "complete", "plan": {...}}
```

**Final Response Object:**
```typescript
{
  week_summary: {
    avg_daily_calories: 1800,
    avg_daily_cost_inr: 145,
    nutrition_score: 92,
    compliance_percentage: 95
  },
  conflict_resolutions: [
    {
      nutrient: "sodium_mg",
      conditions: ["DIABETES", "HYPERTENSION"],
      explanation: "Hypertension requires stricter sodium limit",
      resolved_max: 1500
    }
  ],
  days: [
    {
      day: 1,
      date: "2024-01-15",
      meals: [
        {
          id: "meal_1",
          name: "Moong Dal Chilla",
          type: "breakfast",
          nutrition: {...},
          cost_inr: 25,
          why_recommended: "Low GI, high protein for blood sugar control",
          health_benefits: [
            "Slowly releases energy, preventing spikes",
            "Balances blood sugar for 4+ hours",
            "Reduces insulin demand"
          ],
          swap_options: [
            {...}, {...}, {...}
          ]
        }
      ]
    }
  ]
}
```

### POST /api/parse-pdf

Extracts lab values from medical report PDFs.

**Request:**
```
Content-Type: multipart/form-data
Body: {
  "file": <PDF file>
}
```

**Response:**
```json
{
  "hbA1c": 7.2,
  "bp_systolic": 130,
  "bp_diastolic": 85,
  "eGFR": 45,
  "creatinine": 1.8,
  "potassium": 5.2,
  "phosphorus": 4.1,
  "cholesterol": 210,
  "extracted_labels": [
    "HbA1c",
    "BP",
    "eGFR",
    "Potassium"
  ]
}
```

## Frontend State Management

Global state using React Context + useReducer:

```typescript
type AppState = {
  currentStep: 0 | 1 | 2
  userProfile: UserProfile
  resolvedEnvelope: NutritionalEnvelope | null
  conflictResolutions: ConflictResolution[]
  weekPlan: WeekPlan | null
  isGenerating: boolean
  error: string | null
}

type AppAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'SET_ENVELOPE'; payload: { envelope: NutritionalEnvelope; conflicts: ConflictResolution[] } }
  | { type: 'SET_WEEK_PLAN'; payload: WeekPlan }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' }
```

Usage:
```typescript
const { state, dispatch } = useAppState()

// Update profile
dispatch({
  type: 'UPDATE_PROFILE',
  payload: { fullName: 'John Doe', age: 45 }
})

// Set week plan
dispatch({
  type: 'SET_WEEK_PLAN',
  payload: weekPlanObject
})
```

## Nutritional Target Resolution

Algorithm in `lib/nutritionTargets.ts`:

```typescript
function resolveConflicts(
  conditions: ChronicCondition[],
  profile: UserProfile
): { envelope: NutritionalEnvelope; conflicts: ConflictResolution[] }
```

**Logic:**
1. Get individual targets for each condition
2. For each nutrient:
   - Take minimum of upper bounds
   - Take maximum of lower bounds
   - Apply condition-specific overrides (CKD for K/P, HTN for Na)
3. Adjust for:
   - Weight: protein = weight_kg × multiplier
   - Activity level: calories × activity_multiplier
   - Age: if >60, reduce calories by 100
4. Return resolved envelope + conflict explanations

**Example Conflict:**
- Diabetes wants K ≤ 2300mg
- Hypertension wants Na ≤ 1500mg
- CKD Stage 4 wants K ≤ 2000mg (stricter)
- **Resolution**: K max = 2000mg, Na max = 1500mg

## Food Database

`lib/indianFoodDB.ts` contains 80+ dishes:

```typescript
interface IndianDish {
  id: string
  name: string
  name_hindi: string
  region: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  vegetarian: boolean
  vegan: boolean
  allergens: string[]
  per_100g: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
    sodium_mg: number
    potassium_mg: number
    phosphorus_mg: number
  }
  gi_index: number
  serving_size_g: number
  cost_per_serving_inr: number
  prep_time_min: number
  condition_flags: {
    diabetes_safe: boolean
    hypertension_safe: boolean
    ckd_stage3_safe: boolean
    ckd_stage4_safe: boolean
    heart_safe: boolean
    obesity_safe: boolean
    pcod_safe: boolean
  }
  ingredients: string[]
  image_url: string
}
```

## Validation Engine

`lib/validateMealPlan.ts`:

```typescript
function validateMeal(
  meal: Meal,
  envelope: NutritionalEnvelope
): ValidationResult

function validateDay(
  day: DayPlan,
  envelope: NutritionalEnvelope
): DayValidation

function validateWeek(
  week: WeekPlan,
  envelope: NutritionalEnvelope
): WeekValidation
```

**Validation Rules:**
- **FAIL**: Nutrient >120% of upper bound or <20% of lower bound
- **WARN**: Nutrient 105-120% of upper bound
- **PASS**: All nutrients within bounds
- Special GI check for Diabetes and Heart patients

## Component Hierarchy

```
AppStateProvider (global state)
├── Navbar (navigation)
├── Home (page.tsx)
│   ├── Step1Form (personal/medical)
│   ├── Step2Form (food/lifestyle)
│   ├── Step3Form (budget/pantry)
│   ├── DemoProfiles (quick load)
│   └── PDFUploader (report parsing)
├── Preview (budget review)
│   └── Charts (Recharts)
├── Plan (7-day meals)
│   ├── MealCard (individual meal)
│   │   └── MealSwapModal (swap options)
│   └── ConflictResolutionPanel
├── Dashboard (health overview)
│   └── Charts (Recharts)
└── Grocery (shopping list)
```

## Environment Variables

Required:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Optional:
```
DEBUG=true  // Enable debug logging
```

## Development Workflow

1. **Add new form field**:
   - Add to types.ts UserProfile
   - Add to Step1/2/3 form components
   - Handle in appReducer

2. **Add new disease**:
   - Add to BASE_TARGETS in nutritionTargets.ts
   - Add condition flags to IndianDish in indianFoodDB.ts
   - Add severity levels in forms

3. **Add new dish**:
   - Add to INDIAN_DISHES array with complete nutrition data
   - Set condition flags appropriately
   - Add Unsplash image URL

4. **Change UI theme**:
   - Update tailwind.config.ts colors
   - Update CSS custom properties in globals.css

## Performance Considerations

- **Streaming responses**: Plan generation shows progress to user
- **Lazy loading**: Components loaded on demand
- **Image optimization**: Unsplash URLs with width/height params
- **No database queries**: All computation client-side after generation
- **Memoization**: useCallback for event handlers

## Testing

### Manual Test Cases

**Form flow:**
1. Load home page → all 3 form steps render
2. Click "Next" → step increments
3. Load demo profile → form auto-fills
4. Submit → redirects to /preview

**Plan generation:**
1. Set budget → cost calculates
2. Click "Create Plan" -> streaming response shows
3. Plan page loads with 7 days
4. Navigation between days works
5. Meal swap modal shows alternatives

**Validations:**
1. Day validates meals against envelope
2. Meals marked pass/warn/fail correctly
3. Compliance % updates

### Browser DevTools

Check Network tab when generating plan:
- `/api/generate-plan` should be SSE stream
- Check for chunked data events
- Verify JSON parsing works

## Extending the App

### Add new page:
```typescript
// app/[feature]/page.tsx
'use client'
import { useAppState } from '@/components/AppStateProvider'

export default function FeaturePage() {
  const { state, dispatch } = useAppState()
  return (...)
}
```

### Add new component:
```typescript
// components/MyComponent.tsx
'use client'
import { useAppState } from '@/components/AppStateProvider'

export default function MyComponent() {
  const { state, dispatch } = useAppState()
  return (...)
}
```

### Add API route:
```typescript
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const data = await request.json()
  // Process
  return NextResponse.json({ result: data })
}
```

## Debugging

Enable debug logging by setting `DEBUG=true` in `.env.local`.

Check browser console for:
- State updates: `[AppState]`
- API calls: `[API]`
- Validation: `[Validation]`

---

**Questions?** Check inline code comments and TypeScript error messages.

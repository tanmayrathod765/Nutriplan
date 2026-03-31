import { Condition, NutritionalEnvelope, UserProfile, ConflictResolution } from './types'

const BASE_TARGETS: Record<Condition, NutritionalEnvelope> = {
  DIABETES: {
    calories: [1400, 1800],
    carbs_g: [150, 180],
    protein_g: [60, 80],
    fat_g: [40, 55],
    sodium_mg: [0, 2300],
    potassium_mg: [0, 4700],
    phosphorus_mg: [0, 1500],
    fiber_g: [25, 50],
    gi_max: 55,
  },
  HYPERTENSION: {
    calories: [1600, 2000],
    carbs_g: [200, 250],
    protein_g: [65, 85],
    fat_g: [45, 60],
    sodium_mg: [0, 1500],
    potassium_mg: [3500, 4700],
    phosphorus_mg: [0, 1500],
    fiber_g: [30, 50],
    gi_max: 70,
  },
  CKD_STAGE_3: {
    calories: [1600, 1900],
    carbs_g: [220, 280],
    protein_g: [36, 48],
    fat_g: [50, 65],
    sodium_mg: [0, 2000],
    potassium_mg: [0, 2000],
    phosphorus_mg: [0, 800],
    fiber_g: [20, 35],
    gi_max: 65,
  },
  CKD_STAGE_4: {
    calories: [1600, 1900],
    carbs_g: [220, 280],
    protein_g: [30, 40],
    fat_g: [50, 65],
    sodium_mg: [0, 1500],
    potassium_mg: [0, 1500],
    phosphorus_mg: [0, 600],
    fiber_g: [20, 35],
    gi_max: 65,
  },
  HEART_DISEASE: {
    calories: [1500, 1900],
    carbs_g: [180, 230],
    protein_g: [65, 85],
    fat_g: [35, 50],
    sodium_mg: [0, 1500],
    potassium_mg: [3500, 4700],
    phosphorus_mg: [0, 1500],
    fiber_g: [30, 50],
    gi_max: 60,
  },
  OBESITY: {
    calories: [1200, 1600],
    carbs_g: [130, 170],
    protein_g: [100, 120],
    fat_g: [30, 45],
    sodium_mg: [0, 2300],
    potassium_mg: [2000, 4700],
    phosphorus_mg: [0, 1500],
    fiber_g: [30, 50],
    gi_max: 55,
  },
  PCOD: {
    calories: [1400, 1800],
    carbs_g: [150, 200],
    protein_g: [80, 100],
    fat_g: [45, 60],
    sodium_mg: [0, 2300],
    potassium_mg: [2000, 4700],
    phosphorus_mg: [0, 1500],
    fiber_g: [25, 50],
    gi_max: 55,
  },
}

function getRestrictivenessScore(envelope: NutritionalEnvelope): number {
  // Higher score = more restrictive
  return (
    (1800 - envelope.calories[1]) +
    (envelope.carbs_g[1] - envelope.carbs_g[0]) < 50 ? 10 : 0 +
    (envelope.protein_g[1] - envelope.protein_g[0]) < 20 ? 10 : 0 +
    (envelope.sodium_mg[1] - envelope.sodium_mg[0]) < 1000 ? 10 : 0
  )
}

export function resolveConflicts(
  conditions: Condition[],
  userProfile: Partial<UserProfile>
): {
  envelope: NutritionalEnvelope
  conflicts: ConflictResolution[]
} {
  const conflicts: ConflictResolution[] = []

  if (conditions.length === 0) {
    return {
      envelope: BASE_TARGETS.DIABETES,
      conflicts: [],
    }
  }

  // Get base envelope from most restrictive condition
  const sortedConditions = [...conditions].sort(
    (a, b) => getRestrictivenessScore(BASE_TARGETS[b]) - getRestrictivenessScore(BASE_TARGETS[a])
  )

  const mostRestrictive = BASE_TARGETS[sortedConditions[0]]
  const resolved: NutritionalEnvelope = JSON.parse(JSON.stringify(mostRestrictive))

  // Resolve conflicts
  for (const condition of conditions) {
    const targets = BASE_TARGETS[condition]

    // Calories: take most restrictive range
    if (targets.calories[0] > resolved.calories[0]) {
      conflicts.push({
        nutrient: 'calories_lower',
        condition1: sortedConditions[0],
        condition2: condition,
        resolvedTo: targets.calories[0],
        reason: `${condition} requires higher minimum calories`,
      })
      resolved.calories[0] = Math.max(resolved.calories[0], targets.calories[0])
    }
    if (targets.calories[1] < resolved.calories[1]) {
      resolved.calories[1] = Math.min(resolved.calories[1], targets.calories[1])
    }

    // Carbs
    resolved.carbs_g[0] = Math.max(resolved.carbs_g[0], targets.carbs_g[0])
    resolved.carbs_g[1] = Math.min(resolved.carbs_g[1], targets.carbs_g[1])

    // Protein
    resolved.protein_g[0] = Math.max(resolved.protein_g[0], targets.protein_g[0])
    resolved.protein_g[1] = Math.min(resolved.protein_g[1], targets.protein_g[1])

    // Fat
    resolved.fat_g[0] = Math.max(resolved.fat_g[0], targets.fat_g[0])
    resolved.fat_g[1] = Math.min(resolved.fat_g[1], targets.fat_g[1])

    // Fiber
    resolved.fiber_g[0] = Math.max(resolved.fiber_g[0], targets.fiber_g[0])
    resolved.fiber_g[1] = Math.min(resolved.fiber_g[1], targets.fiber_g[1])

    // GI: take most restrictive
    resolved.gi_max = Math.min(resolved.gi_max, targets.gi_max)
  }

  // CKD overrides potassium and phosphorus
  if (conditions.includes('CKD_STAGE_3')) {
    resolved.potassium_mg = BASE_TARGETS.CKD_STAGE_3.potassium_mg
    resolved.phosphorus_mg = BASE_TARGETS.CKD_STAGE_3.phosphorus_mg
    conflicts.push({
      nutrient: 'potassium_phosphorus',
      condition1: 'Other',
      condition2: 'CKD_STAGE_3',
      resolvedTo: 2000,
      reason: 'CKD Stage 3 overrides potassium/phosphorus limits (kidney protection)',
    })
  } else if (conditions.includes('CKD_STAGE_4')) {
    resolved.potassium_mg = BASE_TARGETS.CKD_STAGE_4.potassium_mg
    resolved.phosphorus_mg = BASE_TARGETS.CKD_STAGE_4.phosphorus_mg
    conflicts.push({
      nutrient: 'potassium_phosphorus',
      condition1: 'Other',
      condition2: 'CKD_STAGE_4',
      resolvedTo: 1500,
      reason: 'CKD Stage 4 overrides potassium/phosphorus limits (severe kidney protection)',
    })
  }

  // Hypertension overrides sodium
  if (conditions.includes('HYPERTENSION')) {
    resolved.sodium_mg[1] = Math.min(resolved.sodium_mg[1], 1500)
    conflicts.push({
      nutrient: 'sodium',
      condition1: 'Other',
      condition2: 'HYPERTENSION',
      resolvedTo: 1500,
      reason: 'Hypertension requires strict sodium control',
    })
  }

  // Adjust based on weight
  const weightKg = userProfile.weightKg || 70
  if (conditions.includes('CKD_STAGE_3') || conditions.includes('CKD_STAGE_4')) {
    const proteinPerKg = 0.7
    const targetProtein = weightKg * proteinPerKg
    resolved.protein_g = [
      Math.max(resolved.protein_g[0], targetProtein * 0.95),
      Math.min(resolved.protein_g[1], targetProtein * 1.05),
    ]
  } else {
    const proteinPerKg = 0.8
    const targetProtein = weightKg * proteinPerKg
    resolved.protein_g = [
      Math.max(resolved.protein_g[0], targetProtein * 0.95),
      Math.min(resolved.protein_g[1], targetProtein * 1.05),
    ]
  }

  // Adjust calories based on activity level
  let activityMultiplier = 1.0
  switch (userProfile.activityLevel) {
    case 'Lightly Active':
      activityMultiplier = 1.2
      break
    case 'Moderately Active':
      activityMultiplier = 1.4
      break
    case 'Very Active':
      activityMultiplier = 1.6
      break
  }

  resolved.calories[0] = Math.round(resolved.calories[0] * activityMultiplier)
  resolved.calories[1] = Math.round(resolved.calories[1] * activityMultiplier)

  // Adjust calories if age > 60
  if ((userProfile.age || 0) > 60) {
    resolved.calories[0] = Math.max(1200, resolved.calories[0] - 100)
    resolved.calories[1] = Math.max(1200, resolved.calories[1] - 100)
  }

  return { envelope: resolved, conflicts }
}

export function getConditionDescription(condition: Condition): string {
  const descriptions: Record<Condition, string> = {
    DIABETES: 'Diabetes Type 2',
    HYPERTENSION: 'Hypertension',
    CKD_STAGE_3: 'CKD Stage 3',
    CKD_STAGE_4: 'CKD Stage 4',
    HEART_DISEASE: 'Heart Disease',
    OBESITY: 'Obesity',
    PCOD: 'PCOD',
  }
  return descriptions[condition]
}

export function getBaseTargets(): Record<Condition, NutritionalEnvelope> {
  return BASE_TARGETS
}

import { MealCompletionRecord } from './types'

const PREFIX = 'nutriplan-progress'

export function getWeekPlanStorageKey(weekPlanId: string) {
  return `${PREFIX}:${weekPlanId}`
}

export function getWeekPlanId(weekPlan: { weekStartDate?: string; days?: unknown[] }) {
  const start = weekPlan.weekStartDate || 'no-date'
  const size = Array.isArray(weekPlan.days) ? weekPlan.days.length : 0
  return `${start}:${size}`
}

export function loadCompletionHistory(weekPlanId: string): MealCompletionRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getWeekPlanStorageKey(weekPlanId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCompletionHistory(weekPlanId: string, history: MealCompletionRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getWeekPlanStorageKey(weekPlanId), JSON.stringify(history))
  } catch {
    // Ignore quota or serialization errors
  }
}

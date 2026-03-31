'use client'

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { AppState, UserProfile, NutritionalEnvelope, ConflictResolution, WeekPlan, MealCompletionRecord } from '@/lib/types'
import { getWeekPlanId, loadCompletionHistory, saveCompletionHistory } from '@/lib/storageManager'

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

export type AppAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'SET_ENVELOPE'; payload: { envelope: NutritionalEnvelope; conflicts: ConflictResolution[] } }
  | { type: 'SET_WEEK_PLAN'; payload: WeekPlan }
  | { type: 'SET_WEEK_PLAN_KEEP_HISTORY'; payload: WeekPlan }
  | { type: 'SET_MEAL_CONSUMED'; payload: { dayIndex: number; mealIndex: number; consumed: boolean } }
  | { type: 'SWAP_MEAL'; payload: { dayIndex: number; mealIndex: number; newMeal: WeekPlan['days'][number]['meals'][number] } }
  | { type: 'LOAD_COMPLETION_HISTORY'; payload: MealCompletionRecord[] }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload?: string }
  | { type: 'RESET' }

const initialState: AppState = {
  currentStep: 0,
  userProfile: {},
  mealCompletionHistory: [],
  isGenerating: false,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }
    case 'UPDATE_PROFILE':
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          ...action.payload,
        },
      }
    case 'SET_ENVELOPE':
      return {
        ...state,
        resolvedEnvelope: action.payload.envelope,
        conflictResolutions: action.payload.conflicts,
      }
    case 'SET_WEEK_PLAN':
      return {
        ...state,
        weekPlan: {
          ...action.payload,
          weekStartDate: action.payload.weekStartDate || new Date().toISOString(),
        },
        mealCompletionHistory: [],
      }
    case 'SET_WEEK_PLAN_KEEP_HISTORY':
      return {
        ...state,
        weekPlan: {
          ...action.payload,
          weekStartDate: action.payload.weekStartDate || state.weekPlan?.weekStartDate || new Date().toISOString(),
        },
      }
    case 'SET_MEAL_CONSUMED': {
      const { dayIndex, mealIndex, consumed } = action.payload
      const current = state.mealCompletionHistory || []
      const existingIndex = current.findIndex(
        item => item.dayIndex === dayIndex && item.mealIndex === mealIndex
      )

      const nextItem: MealCompletionRecord = {
        dayIndex,
        mealIndex,
        consumed,
        consumedAt: consumed ? new Date().toISOString() : undefined,
      }

      const next = [...current]
      if (existingIndex >= 0) {
        next[existingIndex] = nextItem
      } else {
        next.push(nextItem)
      }

      return {
        ...state,
        mealCompletionHistory: next,
      }
    }
    case 'SWAP_MEAL': {
      if (!state.weekPlan) return state

      const { dayIndex, mealIndex, newMeal } = action.payload
      if (dayIndex < 0 || dayIndex >= state.weekPlan.days.length) return state

      const nextDays = state.weekPlan.days.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day
        if (mealIndex < 0 || mealIndex >= day.meals.length) return day

        const nextMeals = day.meals.map((meal, mIdx) => (mIdx === mealIndex ? newMeal : meal))

        return {
          ...day,
          meals: nextMeals,
        }
      })

      return {
        ...state,
        weekPlan: {
          ...state.weekPlan,
          days: nextDays,
        },
      }
    }
    case 'LOAD_COMPLETION_HISTORY':
      return {
        ...state,
        mealCompletionHistory: action.payload,
      }
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    if (!state.weekPlan) return
    const key = getWeekPlanId(state.weekPlan)
    const saved = loadCompletionHistory(key)
    dispatch({ type: 'LOAD_COMPLETION_HISTORY', payload: saved })
  }, [state.weekPlan?.weekStartDate])

  useEffect(() => {
    if (!state.weekPlan) return
    const key = getWeekPlanId(state.weekPlan)
    saveCompletionHistory(key, state.mealCompletionHistory || [])
  }, [state.weekPlan?.weekStartDate, state.mealCompletionHistory])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}

'use client'

import { useRouter } from 'next/navigation'
import { useAppState } from './AppStateProvider'
import { Zap } from 'lucide-react'

const DEMO_PROFILES = [
  {
    name: 'Ramesh',
    age: 58,
    conditions: 'Diabetes + Hypertension',
    region: 'Gujarati',
    budget: 150,
    description: '58yr — Diabetes + Hypertension, Gujarati, ₹150/day',
    profile: {
      fullName: 'Ramesh Patel',
      age: 58,
      gender: 'Male' as const,
      weightKg: 85,
      heightCm: 172,
      conditions: ['DIABETES', 'HYPERTENSION'] as any[],
      conditionSeverities: {
        DIABETES: 'Controlled',
        HYPERTENSION: 'Stage 2',
      },
      medications: ['Metformin', 'ACE Inhibitors'],
      dietType: 'Eggetarian' as const,
      region: 'Gujarati' as const,
      allergens: [],
      dislikedFoods: 'Kola, pickles',
      mealsPerDay: 3 as const,
      activityLevel: 'Lightly Active' as const,
      cookingTimeAvailable: '30+ min' as const,
      doFast: false,
      dailyBudgetPerPersonInr: 150,
      familyMembersCount: 2,
      pantryItems: ['Atta', 'Chawal', 'Moong dal', 'Tel'],
    },
  },
  {
    name: 'Priya',
    age: 45,
    conditions: 'CKD Stage 3',
    region: 'South Indian',
    budget: 120,
    description: '45yr — CKD Stage 3, South Indian, ₹120/day',
    profile: {
      fullName: 'Priya Sharma',
      age: 45,
      gender: 'Female' as const,
      weightKg: 62,
      heightCm: 158,
      conditions: ['CKD_STAGE_3'] as any[],
      conditionSeverities: {
        CKD_STAGE_3: 'Stage 3',
      },
      medications: ['ACE Inhibitors'],
      dietType: 'Pure Vegetarian' as const,
      region: 'South Indian' as const,
      allergens: ['Shellfish'],
      dislikedFoods: 'Fish, coconut',
      mealsPerDay: 4 as const,
      activityLevel: 'Moderately Active' as const,
      cookingTimeAvailable: '15-30 min' as const,
      doFast: true,
      fastingFrequency: 'Alternate days',
      dailyBudgetPerPersonInr: 120,
      familyMembersCount: 1,
      pantryItems: ['Atta', 'Moong dal', 'Chana dal', 'Tel', 'Namak'],
    },
  },
  {
    name: 'Suresh',
    age: 62,
    conditions: 'Heart Disease + Hypertension',
    region: 'North Indian',
    budget: 200,
    description: '62yr — Heart Disease + Hypertension, North Indian, ₹200/day',
    profile: {
      fullName: 'Suresh Kumar',
      age: 62,
      gender: 'Male' as const,
      weightKg: 78,
      heightCm: 175,
      conditions: ['HEART_DISEASE', 'HYPERTENSION'] as any[],
      conditionSeverities: {
        HEART_DISEASE: 'Mild',
        HYPERTENSION: 'Controlled',
      },
      medications: ['ACE Inhibitors', 'Statins'],
      dietType: 'Non-Vegetarian' as const,
      region: 'North Indian' as const,
      allergens: [],
      dislikedFoods: 'Red meat, ghee',
      mealsPerDay: 3 as const,
      activityLevel: 'Lightly Active' as const,
      cookingTimeAvailable: '30+ min' as const,
      doFast: false,
      dailyBudgetPerPersonInr: 200,
      familyMembersCount: 3,
      pantryItems: ['Atta', 'Chawal', 'Tel', 'Namak', 'Haldi'],
    },
  },
]

export default function DemoProfiles() {
  const { dispatch } = useAppState()
  const router = useRouter()

  const loadDemoProfile = (profile: any) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: profile })
    setTimeout(() => {
      dispatch({ type: 'SET_STEP', payload: 1 })
      router.push('/')
    }, 100)
  }

  return (
    <div className="mb-12">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Try Demo Profiles</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {DEMO_PROFILES.map(demo => (
          <button
            key={demo.name}
            onClick={() => loadDemoProfile(demo.profile)}
            className="card p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-bold text-lg">{demo.name}</h4>
              <Zap className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm text-gray-600 mb-3">{demo.description}</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>📋 {demo.conditions}</p>
              <p>🧘 {demo.region}</p>
              <p>💰 ₹{demo.budget}/day</p>
            </div>
            <div className="mt-4 text-xs text-green-600 font-medium group-hover:text-green-700">
              Load Profile →
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useAppState } from '@/components/AppStateProvider'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Flame } from 'lucide-react'
import { ComplianceOverview } from '@/components/ComplianceGauge'

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DashboardPage() {
  const router = useRouter()
  const { state } = useAppState()

  if (!state.weekPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No meal plan found. Please generate a plan first.</p>
      </div>
    )
  }

  const plan = state.weekPlan
  const profile = state.userProfile
  const completionHistory = state.mealCompletionHistory || []

  const getConsumedNutritionForDay = (dayIndex: number) => {
    const day = plan.days[dayIndex]
    const completedSet = new Set(
      completionHistory
        .filter(item => item.dayIndex === dayIndex && item.consumed)
        .map(item => `${item.dayIndex}-${item.mealIndex}`)
    )

    return (day.meals || []).reduce(
      (acc, meal, mealIndex) => {
        if (!completedSet.has(`${dayIndex}-${mealIndex}`)) return acc
        acc.calories += Number(meal.nutrition.calories || 0)
        acc.protein += Number(meal.nutrition.protein_g || 0)
        acc.carbs += Number(meal.nutrition.carbs_g || 0)
        acc.fat += Number(meal.nutrition.fat_g || 0)
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  const dayProgress = plan.days.map((day, idx) => {
    const consumed = getConsumedNutritionForDay(idx)
    const completedMeals = completionHistory.filter(item => item.dayIndex === idx && item.consumed).length
    const totalMeals = (day.meals || []).length
    return {
      idx,
      day,
      consumed,
      completedMeals,
      totalMeals,
      completionPct: totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0,
    }
  })

  const todayIndex = dayProgress.findIndex(d => d.completedMeals < d.totalMeals)
  const activeDayIndex = todayIndex === -1 ? Math.min(6, dayProgress.length - 1) : todayIndex
  const activeDay = dayProgress.length > 0 ? dayProgress[Math.max(0, activeDayIndex)] : null
  const streakDays = dayProgress.filter(d => d.completedMeals > 0).length
  const weeklyCompletion = dayProgress.length > 0
    ? dayProgress.reduce((sum, d) => sum + d.completionPct, 0) / dayProgress.length
    : 0

  // Prepare chart data
  const caloriesData = dayProgress.map((d, idx) => ({
    day: DAY_SHORT[idx],
    planned: Math.round(d.day.total_nutrition.calories),
    consumed: Math.round(d.consumed.calories),
  }))

  const carbsData = dayProgress.map((d, idx) => ({
    day: DAY_SHORT[idx],
    planned: Math.round(d.day.total_nutrition.carbs_g),
    consumed: Math.round(d.consumed.carbs),
  }))

  const costData = dayProgress.map((d, idx) => ({
    day: DAY_SHORT[idx],
    planned: d.day.total_cost_inr,
    actual: Number((d.day.total_cost_inr * (d.completionPct / 100)).toFixed(1)),
  }))

  const nutritionData = [
    { nutrient: 'Protein', value: Number(activeDay?.consumed.protein || 0) },
    { nutrient: 'Carbs', value: Math.round(Number(activeDay?.consumed.carbs || 0)) },
    { nutrient: 'Fat', value: Math.round(Number(activeDay?.consumed.fat || 0)) },
    { nutrient: 'Fiber', value: Math.round(Number(activeDay?.day.total_nutrition.fiber_g || 0) * ((activeDay?.completionPct || 0) / 100)) },
  ]

  const COLORS = ['#16a34a', '#2563eb', '#dc2626', '#f59e0b']

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Dashboard</h1>
          <p className="text-gray-600">Your personalized nutrition plan overview</p>
        </div>

        {/* Health Profile Summary */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Your Health Profile</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold">{profile.fullName}</p>
              <p className="text-xs text-gray-500 mt-1">Age: {profile.age}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Conditions</p>
              <p className="text-sm font-semibold">{profile.conditions?.join(', ') || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">Chronic Diseases</p>
            </div>
          </div>
        </div>

        {/* Weekly Nutrition Overview */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Daily Calories Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={caloriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="planned" fill="#bbf7d0" />
                <Bar dataKey="consumed" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Daily Carbs Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={carbsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={value => `${value}g`} />
                <Bar dataKey="planned" fill="#dbeafe" />
                <Bar dataKey="consumed" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-4">Daily Cost Tracking</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={value => `₹${value}`} />
                <Line type="monotone" dataKey="planned" stroke="#60a5fa" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nutrition Breakdown */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Macronutrient Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={nutritionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ nutrient, value }) => `${nutrient}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Streak & Challenge */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card p-6 bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <Flame className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-bold">Streak Tracker</h3>
            </div>
            <div className="text-4xl font-bold text-orange-600 mb-2">{streakDays} / 7 Days</div>
            <p className="text-gray-600 text-sm">Days with at least one consumed meal ticked.</p>
          </div>

          <div className="card p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-l-4 border-l-blue-500">
            <h3 className="text-lg font-bold mb-3">Today's Progress</h3>
            {activeDay ? (
              <>
                <p className="text-sm text-gray-700 mb-3">
                  🎯 {activeDay.completedMeals || 0} of {activeDay.totalMeals || 0} meals completed ({Math.round(activeDay.completionPct || 0)}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, activeDay.completionPct || 0)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-3">No meal plan data available</p>
            )}
            <button 
              onClick={() => router.push('/plan')}
              className="btn btn-primary text-sm w-full"
            >
              Keep Tracking
            </button>
          </div>
        </div>

        <div className="card p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Weekly Goal Progress</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-gray-600">Weekly Meal Completion</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{Math.round(weeklyCompletion)}%</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-gray-600">Consumed Calories (Week)</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {Math.round(dayProgress.reduce((sum, d) => sum + d.consumed.calories, 0))}
              </p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-gray-600">Creative Insight</p>
              <p className="text-sm font-semibold text-purple-700 mt-1">
                {weeklyCompletion >= 80 ? 'Great adherence. Keep this rhythm.' : weeklyCompletion >= 50 ? 'Good progress. Try completing snacks too.' : 'Start with breakfast tick consistency.'}
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Report */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Condition-Specific Compliance</h3>
          <ComplianceOverview conditions={profile.conditions} />
        </div>

        {/* Weekly Summary */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Week Summary</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">Avg Daily Calories</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">{Math.round(plan.week_summary.avg_daily_calories)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 font-semibold">Avg Daily Cost</p>
              <p className="text-2xl font-bold text-green-900 mt-2">₹{Math.round(plan.week_summary.avg_daily_cost_inr)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold">Nutrition Score</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">{Math.round(plan.week_summary.nutrition_score)}/100</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-600 font-semibold">Compliance %</p>
              <p className="text-2xl font-bold text-amber-900 mt-2">{Math.round(weeklyCompletion)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

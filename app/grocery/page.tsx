'use client'

import { useAppState } from '@/components/AppStateProvider'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface GroceryItem {
  id: string
  name: string
  nameHindi: string
  quantity: string
  estimatedCost: number
  category: string
}

export default function GroceryPage() {
  const { state } = useAppState()
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const weekPlan = state.weekPlan
  const userProfile = state.userProfile

  if (!weekPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No meal plan found. Please generate a plan first.</p>
      </div>
    )
  }

  // Helper function to categorize ingredients
  const getCategoryForIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase()
    if (/rice|flour|wheat|dal|pulses|lentil|beans|oats|maida/.test(name)) return 'Grains & Legumes'
    if (/milk|yogurt|curd|paneer|cheese|butter|ghee|cream/.test(name)) return 'Dairy'
    if (/oil|ghee/.test(name)) return 'Oils & Fats'
    if (/tomato|onion|carrot|potato|spinach|cabbage|peas|gourd|broccoli|bell|pepper/.test(name)) return 'Vegetables'
    if (/apple|banana|orange|mango|grape|berries|lemon/.test(name)) return 'Fruits'
    if (/chicken|fish|meat|mutton|egg|beef|pork|prawn|shrimp/.test(name)) return 'Proteins'
    if (/sugar|salt|spice|masala|turmeric|chili|cardamom|saffron/.test(name)) return 'Spices & Seasonings'
    if (/nuts|cashew|almond|pistachio|walnut|peanut/.test(name)) return 'Nuts & Dry Fruits'
    return 'Other'
  }

  // Helper function to deduplicate and aggregate groceries
  const aggregateGroceries = () => {
    const groceryMap: { [key: string]: { totalQuantity: number; unit: string; estimatedCost: number; name: string; category: string } } = {}

    weekPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
          meal.ingredients.forEach((ing: any) => {
            if (!ing.name) return
            const key = ing.name.toLowerCase()
            
            if (!groceryMap[key]) {
              groceryMap[key] = {
                name: ing.name,
                totalQuantity: Number(ing.quantity || 0),
                unit: ing.unit || 'g',
                estimatedCost: Number(ing.cost_inr || 0),
                category: getCategoryForIngredient(ing.name),
              }
            } else {
              groceryMap[key].totalQuantity += Number(ing.quantity || 0)
              groceryMap[key].estimatedCost += Number(ing.cost_inr || 0)
            }
          })
        }
      })
    })

    const finalGroceries = Object.entries(groceryMap)
      .map(([key, item]) => ({
        id: key,
        name: item.name,
        nameHindi: item.name,
        quantity: `${Math.round(item.totalQuantity)} ${item.unit}`,
        estimatedCost: item.estimatedCost,
        category: item.category,
      }))
      .filter(item => !(userProfile.pantryItems || []).includes(item.name))

    return finalGroceries
  }

  const groceries = aggregateGroceries()

  // Group by category
  const grouped = groceries.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as { [key: string]: GroceryItem[] })

  const totalCost = groceries.reduce((sum, item) => sum + item.estimatedCost, 0)
  const weeklyBudget = (userProfile.dailyBudgetPerPersonInr || 0) * 7 * (userProfile.familyMembersCount || 1)
  const budgetRemaining = weeklyBudget - totalCost

  const pieData = Object.entries(grouped).map(([category, items]) => ({
    name: category,
    value: items.reduce((sum, item) => sum + item.estimatedCost, 0),
  }))

  const COLORS = ['#16a34a', '#2563eb', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899']

  const handleToggle = (id: string) => {
    const newSet = new Set(checkedItems)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setCheckedItems(newSet)
  }

  const handleExportWhatsApp = () => {
    let text = '🛒 *Your Grocery List* 🛒\n\n'
    Object.entries(grouped).forEach(([category, items]) => {
      text += `*${category}:*\n`
      items.forEach(item => {
        text += `☐ ${item.name} - ${item.quantity}\n`
      })
      text += '\n'
    })
    text += `\n💰 *Total Cost:* ₹${totalCost}\n`
    text += `📊 *Weekly Budget:* ₹${weeklyBudget}\n`
    text += `✅ *Remaining:* ₹${budgetRemaining}`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Grocery List</h1>
          <p className="text-gray-600">Shopping list for your 7-day plan</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Budget Summary */}
          <div className="md:col-span-1">
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Budget Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Weekly Budget:</span>
                  <span className="font-bold text-lg">₹{weeklyBudget}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Groceries:</span>
                  <span className="font-bold text-lg">₹{totalCost}</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg ${
                  budgetRemaining >= 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <span className="text-sm font-semibold">Remaining:</span>
                  <span className={`font-bold text-lg ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{budgetRemaining}
                  </span>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <button
                onClick={handleExportWhatsApp}
                className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Share on WhatsApp
              </button>
            </div>

            {/* Category Summary */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4">By Category</h3>
              <div className="space-y-2">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{category}</span>
                    <span className="text-sm font-bold">
                      ₹{items.reduce((sum, item) => sum + item.estimatedCost, 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grocery List */}
          <div className="md:col-span-2">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="card p-6 mb-6">
                <h3 className="text-lg font-bold mb-4 text-green-700">{category}</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <button
                        onClick={() => handleToggle(item.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {checkedItems.has(item.id) ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className={`font-semibold ${checkedItems.has(item.id) ? 'line-through text-gray-500' : ''}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">({item.nameHindi})</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.quantity}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-600">₹{item.estimatedCost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card p-6 bg-blue-50 border-l-4 border-l-blue-500">
          <h3 className="text-lg font-bold mb-3">💡 Shopping Tips</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Check locally available options for lower prices</li>
            <li>✓ Choose organic vegetables if your budget allows</li>
            <li>✓ Compare prices across online marketplaces</li>
            <li>✓ Buy seasonal items for better value</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

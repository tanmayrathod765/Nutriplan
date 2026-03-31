'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Leaf, Home, BarChart3, ShoppingCart, Plus } from 'lucide-react'
import { useAppState } from './AppStateProvider'

export default function Navbar() {
  const { dispatch } = useAppState()
  const router = useRouter()

  const handleNewPlan = () => {
    dispatch({ type: 'RESET' })
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:inline">NutriPlan AI</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/plan" className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span>Plan</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/grocery"
              className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Grocery</span>
            </Link>
          </div>

          {/* New Plan Button */}
          <button
            onClick={handleNewPlan}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Plan</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

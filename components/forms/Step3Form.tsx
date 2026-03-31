'use client'

import { UserProfile } from '@/lib/types'

interface Step3FormProps {
  profile: Partial<UserProfile>
  onUpdate: (updates: Partial<UserProfile>) => void
}

export default function Step3Form({ profile, onUpdate }: Step3FormProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Survey Complete</h2>
      
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-gray-700">
          Great! You've completed the health survey. 
        </p>
        <p className="text-gray-600 mt-2 text-sm">
          You can now optionally upload a medical PDF report for more accurate personalization, or proceed to generate your meal plan.
        </p>
      </div>
    </div>
  )
}

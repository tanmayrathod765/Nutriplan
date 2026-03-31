'use client'

import { UserProfile } from '@/lib/types'
import { Utensils, Activity, Clock } from 'lucide-react'

interface Step2FormProps {
  profile: Partial<UserProfile>
  onUpdate: (updates: Partial<UserProfile>) => void
}

export default function Step2Form({ profile, onUpdate }: Step2FormProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Food & Lifestyle Preferences</h2>

      {/* Diet Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Diet Type *</label>
        <div className="radio-group">
          {['Pure Vegetarian', 'Eggetarian', 'Non-Vegetarian'].map(diet => (
            <label key={diet} className="radio-pill cursor-pointer">
              <input
                type="radio"
                name="dietType"
                value={diet}
                checked={profile.dietType === diet}
                onChange={e => onUpdate({ dietType: e.target.value as any })}
              />
              <span className="ml-2">{diet}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Region *</label>
        <select
          className="input"
          value={profile.region || ''}
          onChange={e => onUpdate({ region: e.target.value as any })}
        >
          <option value="">Select region</option>
          <option value="North Indian">North Indian</option>
          <option value="South Indian">South Indian</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Bengali">Bengali</option>
          <option value="Maharashtrian">Maharashtrian</option>
          <option value="Pan-Indian">Pan-Indian</option>
        </select>
      </div>

      {/* Allergens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Allergens</label>
        <div className="grid grid-cols-2 gap-2">
          {['Gluten', 'Lactose', 'Peanuts', 'Tree nuts', 'Soy', 'Eggs', 'Shellfish'].map(allergen => (
            <label key={allergen} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.allergens?.includes(allergen) || false}
                onChange={e => {
                  const allergens = profile.allergens || []
                  const updated = e.target.checked ? [...allergens, allergen] : allergens.filter(a => a !== allergen)
                  onUpdate({ allergens: updated })
                }}
              />
              <span className="text-sm">{allergen}</span>
            </label>
          ))}
        </div>
      </div>



      {/* Activity Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Activity Level *</label>
        <div className="space-y-2">
          {[
            { value: 'Sedentary', label: 'Sedentary', description: 'Little or no exercise' },
            { value: 'Lightly Active', label: 'Lightly Active', description: '1-3 days/week light exercise' },
            { value: 'Moderately Active', label: 'Moderately Active', description: '3-5 days/week moderate exercise' },
            { value: 'Very Active', label: 'Very Active', description: '6-7 days/week intense exercise' },
          ].map(level => (
            <label key={level.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="activityLevel"
                value={level.value}
                checked={profile.activityLevel === level.value}
                onChange={e => onUpdate({ activityLevel: e.target.value as any })}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-sm">{level.label}</p>
                <p className="text-xs text-gray-500">{level.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>



      {/* Fasting */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.doFast || false}
            onChange={e => onUpdate({ doFast: e.target.checked })}
          />
          <span className="text-sm font-medium">Do you practice intermittent fasting?</span>
        </label>
        {profile.doFast && (
          <select
            className="input mt-3"
            value={profile.fastingFrequency || ''}
            onChange={e => onUpdate({ fastingFrequency: e.target.value })}
          >
            <option value="">Select fasting frequency</option>
            <option value="Daily">Daily</option>
            <option value="5 days/week">5 days/week</option>
            <option value="Alternate days">Alternate days</option>
            <option value="Once a week">Once a week</option>
          </select>
        )}
      </div>

      {/* Insulin Dependent (conditional) */}
      {profile.conditions?.includes('DIABETES') && (
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.insulinDependent || false}
              onChange={e => onUpdate({ insulinDependent: e.target.checked })}
            />
            <span className="text-sm font-medium">Are you insulin dependent?</span>
          </label>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Condition, ConditionSeverity, UserProfile } from '@/lib/types'
import { Heart, AlertCircle, Zap } from 'lucide-react'

interface Step1FormProps {
  profile: Partial<UserProfile>
  onUpdate: (updates: Partial<UserProfile>) => void
}

const CONDITION_MAP: Record<Condition, string> = {
  DIABETES: 'Diabetes Type 2',
  HYPERTENSION: 'Hypertension',
  CKD_STAGE_3: 'CKD Stage 3',
  CKD_STAGE_4: 'CKD Stage 4',
  HEART_DISEASE: 'Heart Disease',
  OBESITY: 'Obesity',
  PCOD: 'PCOD',
}

export default function Step1Form({ profile, onUpdate }: Step1FormProps) {
  const [bmi, setBmi] = useState<number | null>(profile.bmi || null)

  // Auto-calculate BMI when weight or height changes
  useEffect(() => {
    if (profile.weightKg && profile.heightCm) {
      const heightM = profile.heightCm / 100
      const calculatedBMI = profile.weightKg / (heightM * heightM)
      const roundedBMI = parseFloat(calculatedBMI.toFixed(1))
      
      // Only update if BMI has actually changed
      if (roundedBMI !== bmi) {
        setBmi(roundedBMI)
        onUpdate({ bmi: roundedBMI })
      }
    }
  }, [profile.weightKg, profile.heightCm])

  const handleConditionToggle = (condition: Condition) => {
    const currentConditions = profile.conditions || []
    const updated = currentConditions.includes(condition)
      ? currentConditions.filter(c => c !== condition)
      : [...currentConditions, condition]
    
    onUpdate({ conditions: updated })
  }

  const getSeverityOptions = (condition: Condition): string[] => {
    switch (condition) {
      case 'DIABETES':
        return ['Controlled', 'Uncontrolled', 'Insulin-dependent']
      case 'HYPERTENSION':
        return ['Stage 1', 'Stage 2', 'Controlled']
      case 'CKD_STAGE_3':
      case 'CKD_STAGE_4':
        return ['Stage 3', 'Stage 4']
      case 'HEART_DISEASE':
        return ['Mild', 'Moderate', 'Severe']
      default:
        return []
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Personal & Medical Information</h2>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
        <input
          type="text"
          className="input"
          value={profile.fullName || ''}
          onChange={e => onUpdate({ fullName: e.target.value })}
          placeholder="Enter your full name"
        />
      </div>

      {/* Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
        <input
          type="number"
          className="input"
          min="18"
          max="90"
          value={profile.age || ''}
          onChange={e => onUpdate({ age: parseInt(e.target.value) })}
          placeholder="Enter your age"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
        <div className="radio-group">
          {['Male', 'Female', 'Other'].map(gender => (
            <label key={gender} className="radio-pill">
              <input
                type="radio"
                name="gender"
                value={gender}
                checked={profile.gender === gender}
                onChange={e => onUpdate({ gender: e.target.value as any })}
              />
              <span className="ml-2">{gender}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Weight & Height with BMI */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
          <input
            type="number"
            className="input"
            value={profile.weightKg || ''}
            onChange={e => onUpdate({ weightKg: parseFloat(e.target.value) })}
            placeholder="Enter weight"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
          <input
            type="number"
            className="input"
            value={profile.heightCm || ''}
            onChange={e => onUpdate({ heightCm: parseInt(e.target.value) })}
            placeholder="Enter height"
          />
        </div>
      </div>

      {bmi && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold">Your BMI: {bmi}</span>
            <br />
            <span className="text-gray-600">
              {bmi < 18.5
                ? 'Underweight'
                : bmi < 25
                  ? 'Normal weight'
                  : bmi < 30
                    ? 'Overweight'
                    : 'Obese'}
            </span>
          </p>
        </div>
      )}

      {/* Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Medical Conditions *</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(CONDITION_MAP) as Condition[]).map(condition => (
            <label key={condition} className="radio-pill cursor-pointer">
              <input
                type="checkbox"
                checked={profile.conditions?.includes(condition) || false}
                onChange={() => handleConditionToggle(condition)}
              />
              <span className="ml-2">{CONDITION_MAP[condition]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Condition Severity */}
      {profile.conditions && profile.conditions.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
          <h3 className="font-semibold text-sm">Condition Severity</h3>
          {profile.conditions.map(condition => (
            <div key={condition}>
              <label className="text-sm font-medium text-gray-700">{CONDITION_MAP[condition]}</label>
              <select
                className="input mt-1"
                value={profile.conditionSeverities?.[condition] || ''}
                onChange={e =>
                  onUpdate({
                    conditionSeverities: {
                      ...profile.conditionSeverities,
                      [condition]: e.target.value,
                    },
                  })
                }
              >
                <option value="">Select severity</option>
                {getSeverityOptions(condition).map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Lab Values */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-4">Optional Lab Values (if available)</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">HbA1c (%)</label>
            <input
              type="number"
              step="0.1"
              className="input mt-1"
              value={profile.labValues?.hbA1c || ''}
              onChange={e =>
                onUpdate({
                  labValues: {
                    ...profile.labValues,
                    hbA1c: parseFloat(e.target.value),
                  },
                })
              }
              placeholder="e.g., 7.2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">BP Systolic (mmHg)</label>
              <input
                type="number"
                className="input mt-1"
                value={profile.labValues?.bpSystolic || ''}
                onChange={e =>
                  onUpdate({
                    labValues: {
                      ...profile.labValues,
                      bpSystolic: parseInt(e.target.value),
                    },
                  })
                }
                placeholder="e.g., 130"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">BP Diastolic (mmHg)</label>
              <input
                type="number"
                className="input mt-1"
                value={profile.labValues?.bpDiastolic || ''}
                onChange={e =>
                  onUpdate({
                    labValues: {
                      ...profile.labValues,
                      bpDiastolic: parseInt(e.target.value),
                    },
                  })
                }
                placeholder="e.g., 85"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">eGFR (mL/min)</label>
            <input
              type="number"
              className="input mt-1"
              value={profile.labValues?.eGFR || ''}
              onChange={e =>
                onUpdate({
                  labValues: {
                    ...profile.labValues,
                    eGFR: parseInt(e.target.value),
                  },
                })
              }
              placeholder="e.g., 45"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

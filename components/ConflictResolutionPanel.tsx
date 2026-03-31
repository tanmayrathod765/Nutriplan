'use client'

import { ConflictResolution } from '@/lib/types'
import { AlertCircle } from 'lucide-react'

interface ConflictResolutionPanelProps {
  conflicts: ConflictResolution[]
}

export default function ConflictResolutionPanel({ conflicts }: ConflictResolutionPanelProps) {
  return (
    <div className="card border-l-4 border-l-amber-500 bg-amber-50 p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-semibold text-amber-900">Conflicts were found between your conditions and resolved automatically</h3>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict, idx) => (
          <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {conflict.nutrient.replace(/_/g, ' ').toUpperCase()}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{conflict.condition1}</span> wants {Array.isArray(conflict.resolvedTo) ? 
                `${conflict.resolvedTo[0]}-${conflict.resolvedTo[1]}` : 
                conflict.resolvedTo} BUT{' '}
              <span className="font-medium">{conflict.condition2}</span> sets stricter limits →{' '}
              <span className="text-amber-600 font-medium">Resolved: {Array.isArray(conflict.resolvedTo) ? 
                `${conflict.resolvedTo[0]}-${conflict.resolvedTo[1]}` : 
                conflict.resolvedTo}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">💡 {conflict.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

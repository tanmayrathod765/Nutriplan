'use client'

export function CardSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  )
}

export function MealCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlanPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton />
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <CardSkeleton />
    </div>
  )
}

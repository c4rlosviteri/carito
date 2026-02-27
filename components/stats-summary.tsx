'use client'

import { TrendingDown, TrendingUp, Target, Hash } from 'lucide-react'
import type { GlucoseReading } from '@/lib/types'

interface StatsSummaryProps {
  readings: GlucoseReading[]
}

export function StatsSummary({ readings }: StatsSummaryProps) {
  if (readings.length === 0) return null

  const values = readings.map((r) => r.glucose_value)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const stats = [
    {
      label: 'Promedio',
      value: avg,
      unit: 'mg/dL',
      icon: Target,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Minimo',
      value: min,
      unit: 'mg/dL',
      icon: TrendingDown,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Maximo',
      value: max,
      unit: 'mg/dL',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Lecturas',
      value: readings.length,
      unit: 'total',
      icon: Hash,
      color: 'text-muted-foreground bg-muted',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${stat.color}`}>
              <stat.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </span>
          </div>
          <p className="text-xl font-bold text-card-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.unit}</p>
        </div>
      ))}
    </div>
  )
}

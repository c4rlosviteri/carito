'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GlucoseReading } from '@/lib/types'
import {
  formatGuayaquilChartLabel,
  formatGuayaquilFullLabel,
  getGuayaquilWeekBounds,
  getGuayaquilMonthBounds,
  formatGuayaquilWeekRangeLabel,
  formatGuayaquilMonthLabel,
} from '@/lib/guayaquil-time'

type ViewMode = 'all' | 'week' | 'month'

interface GlucoseChartProps {
  readings: GlucoseReading[]
}

export function GlucoseChart({ readings }: GlucoseChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [periodOffset, setPeriodOffset] = useState(0)

  const { periodBounds, periodLabel } = useMemo(() => {
    if (viewMode === 'week') {
      const bounds = getGuayaquilWeekBounds(periodOffset)
      return {
        periodBounds: bounds,
        periodLabel: formatGuayaquilWeekRangeLabel(bounds.start, bounds.end),
      }
    }
    if (viewMode === 'month') {
      const bounds = getGuayaquilMonthBounds(periodOffset)
      return {
        periodBounds: bounds,
        periodLabel: formatGuayaquilMonthLabel(bounds.start),
      }
    }
    return { periodBounds: null, periodLabel: null }
  }, [viewMode, periodOffset])

  const filteredReadings = useMemo(() => {
    if (!periodBounds) return readings
    return readings.filter((r) => {
      const t = new Date(r.measured_at).getTime()
      return t >= periodBounds.start.getTime() && t <= periodBounds.end.getTime()
    })
  }, [readings, periodBounds])

  const hasEnoughReadings = readings.length >= 2
  const hasEnoughFiltered = filteredReadings.length >= 2

  const chartData = [...filteredReadings]
    .reverse()
    .map((r) => ({
      date: formatGuayaquilChartLabel(r.measured_at),
      value: r.glucose_value,
      fullDate: formatGuayaquilFullLabel(r.measured_at),
    }))

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    setPeriodOffset(0)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">
        Tendencia de Glucosa
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          ({filteredReadings.length}{viewMode !== 'all' ? ` de ${readings.length}` : ''})
        </span>
      </h3>

      {/* View mode toggle */}
      <div className="mb-3 flex rounded-lg border border-border bg-muted/50 p-0.5">
        {(['all', 'week', 'month'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => changeViewMode(mode)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            {mode === 'all' ? 'Todo' : mode === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      {viewMode !== 'all' && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setPeriodOffset((p) => p - 1)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 text-center text-xs font-medium text-card-foreground">
            {periodLabel}
          </span>
          <button
            onClick={() => setPeriodOffset((p) => p + 1)}
            disabled={periodOffset >= 0}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground disabled:opacity-30"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {!hasEnoughReadings ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Se necesitan al menos 2 lecturas para mostrar la grafica
        </p>
      ) : !hasEnoughFiltered ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Se necesitan al menos 2 lecturas en este periodo
        </p>
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} mg/dL`, 'Glucosa']}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullDate
                    }
                    return ''
                  }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{ value: '70', position: 'left', fontSize: 10, fill: '#3b82f6' }}
                />
                <ReferenceLine
                  y={100}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: '100', position: 'left', fontSize: 10, fill: '#10b981' }}
                />
                <ReferenceLine
                  y={126}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: '126', position: 'left', fontSize: 10, fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--card)' }}
                  activeDot={{ r: 6, fill: 'var(--primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> {'< 70 Bajo'}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 70-100 Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> {'> 126 Alto'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

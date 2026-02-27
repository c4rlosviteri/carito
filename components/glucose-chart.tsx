'use client'

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
import type { GlucoseReading } from '@/lib/types'
import {
  formatGuayaquilChartLabel,
  formatGuayaquilFullLabel,
} from '@/lib/guayaquil-time'

interface GlucoseChartProps {
  readings: GlucoseReading[]
}

export function GlucoseChart({ readings }: GlucoseChartProps) {
  if (readings.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-card-foreground">Tendencia</h3>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Se necesitan al menos 2 lecturas para mostrar la grafica
        </p>
      </div>
    )
  }

  const chartData = [...readings]
    .reverse()
    .map((r) => ({
      date: formatGuayaquilChartLabel(r.measured_at),
      value: r.glucose_value,
      fullDate: formatGuayaquilFullLabel(r.measured_at),
    }))

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">
        Tendencia de Glucosa
      </h3>
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
    </div>
  )
}

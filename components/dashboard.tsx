'use client'

import useSWR from 'swr'
import { CaptureForm } from './capture-form'
import { StatsSummary } from './stats-summary'
import { GlucoseChart } from './glucose-chart'
import { ReadingsList } from './readings-list'
import type { GlucoseReading } from '@/lib/types'

const fetcher = async (url: string): Promise<GlucoseReading[]> => {
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : 'No se pudieron cargar las lecturas'
    throw new Error(message)
  }

  return Array.isArray(data) ? data : []
}

export function Dashboard() {
  const { data, error, isLoading } = useSWR<GlucoseReading[]>(
    '/api/readings',
    fetcher,
    { refreshInterval: 30000 }
  )
  const readings = Array.isArray(data) ? data : []

  return (
    <div className="flex flex-col gap-5 p-4">
      <CaptureForm />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar el historial. Verifica tu conexion y la configuracion de Supabase.
        </div>
      ) : (
        <>
          <StatsSummary readings={readings} />
          <GlucoseChart readings={readings} />
          <ReadingsList readings={readings} />
        </>
      )}
    </div>
  )
}

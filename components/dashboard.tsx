'use client'

import useSWR from 'swr'
import { CaptureForm } from './capture-form'
import { StatsSummary } from './stats-summary'
import { GlucoseChart } from './glucose-chart'
import { ReadingsList } from './readings-list'
import type { GlucoseReading } from '@/lib/types'
import Link from 'next/link'

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

interface DashboardProps {
  canEdit: boolean
}

export function Dashboard({ canEdit }: DashboardProps) {
  const { data, error, isLoading } = useSWR<GlucoseReading[]>(
    '/api/readings',
    fetcher,
    { refreshInterval: 30000 }
  )
  const readings = Array.isArray(data) ? data : []
  const errorMessage =
    error instanceof Error ? error.message : 'No se pudieron cargar las lecturas'

  return (
    <div className="flex flex-col gap-5 p-4">
      {canEdit ? (
        <CaptureForm />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Estas viendo el historial en modo solo lectura. Para registrar o eliminar lecturas, ingresa el codigo de acceso{' '}
          <Link href="/access" className="font-medium text-primary underline underline-offset-2">
            aquí
          </Link>
          .
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>No se pudo cargar el historial.</p>
          <p className="mt-1 text-xs opacity-80">{errorMessage}</p>
        </div>
      ) : (
        <>
          <StatsSummary readings={readings} />
          <GlucoseChart readings={readings} />
          <ReadingsList readings={readings} canEdit={canEdit} />
        </>
      )}
    </div>
  )
}

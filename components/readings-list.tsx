'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, ImageIcon, ChevronDown, ChevronUp, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { deleteGlucoseReading } from '@/app/actions'
import {
  getGlucoseStatus,
  getStatusLabel,
  getStatusColor,
  type GlucoseReading,
} from '@/lib/types'

interface ReadingsListProps {
  readings: GlucoseReading[]
}

export function ReadingsList({ readings }: ReadingsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteGlucoseReading(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lectura eliminada')
        mutate('/api/readings')
      }
      setDeletingId(null)
    })
  }

  if (readings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-card-foreground">Historial</h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No hay lecturas registradas
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Toma una foto de tu glucometro para comenzar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-card-foreground">
          Historial ({readings.length})
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {readings.map((reading) => {
          const status = getGlucoseStatus(reading.glucose_value)
          const statusLabel = getStatusLabel(status)
          const statusColors = getStatusColor(status)
          const isExpanded = expandedId === reading.id

          return (
            <li key={reading.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Value badge */}
                <div
                  className={`flex min-w-16 flex-col items-center rounded-lg border px-3 py-1.5 ${statusColors}`}
                >
                  <span className="text-lg font-bold leading-tight">
                    {reading.glucose_value}
                  </span>
                  <span className="text-[10px] font-medium uppercase leading-tight">
                    {reading.unit}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {statusLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(reading.measured_at), "dd 'de' MMM, yyyy - HH:mm", {
                      locale: es,
                    })}
                  </p>
                  {reading.notes && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
                      <StickyNote className="h-3 w-3" />
                      {reading.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {reading.photo_url && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
                      aria-label={isExpanded ? 'Ocultar foto' : 'Ver foto'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(reading.id)}
                    disabled={isPending && deletingId === reading.id}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="Eliminar lectura"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded photo */}
              {isExpanded && reading.photo_url && (
                <div className="mt-3">
                  <img
                    src={reading.photo_url}
                    alt={`Lectura de ${reading.glucose_value} ${reading.unit}`}
                    className="w-full rounded-lg object-cover"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

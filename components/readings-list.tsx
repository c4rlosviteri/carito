'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Trash2, ImageIcon, ChevronDown, ChevronUp, StickyNote,
  Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { deleteGlucoseReading, updateGlucoseReading } from '@/app/actions'
import {
  getGlucoseStatus,
  getStatusLabel,
  getStatusColor,
  type GlucoseReading,
} from '@/lib/types'
import {
  formatGuayaquilDayLabel,
  formatGuayaquilMonthLabel,
  formatGuayaquilTime,
  guayaquilDayKey,
  guayaquilMonthKey,
  toGuayaquilLocalInput,
  getGuayaquilWeekBounds,
  getGuayaquilMonthBounds,
  formatGuayaquilWeekRangeLabel,
} from '@/lib/guayaquil-time'

type ViewMode = 'all' | 'week' | 'month'

interface ReadingsListProps {
  readings: GlucoseReading[]
  canEdit: boolean
}

interface DayGroup {
  dayKey: string
  dayLabel: string
  readings: GlucoseReading[]
}

interface MonthGroup {
  monthKey: string
  monthLabel: string
  days: DayGroup[]
  totalReadings: number
}

function groupReadingsByMonthAndDay(readings: GlucoseReading[]): MonthGroup[] {
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  )

  const monthMap = new Map<
    string,
    { monthLabel: string; dayMap: Map<string, DayGroup> }
  >()

  for (const reading of sortedReadings) {
    const date = new Date(reading.measured_at)
    const monthKey = guayaquilMonthKey(date)
    const dayKey = guayaquilDayKey(date)

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthLabel: formatGuayaquilMonthLabel(date),
        dayMap: new Map<string, DayGroup>(),
      })
    }

    const monthGroup = monthMap.get(monthKey)
    if (!monthGroup) continue

    if (!monthGroup.dayMap.has(dayKey)) {
      monthGroup.dayMap.set(dayKey, {
        dayKey,
        dayLabel: formatGuayaquilDayLabel(date),
        readings: [],
      })
    }

    const dayGroup = monthGroup.dayMap.get(dayKey)
    if (!dayGroup) continue

    dayGroup.readings.push(reading)
  }

  return Array.from(monthMap.entries()).map(([monthKey, monthGroup]) => ({
    monthKey,
    monthLabel: monthGroup.monthLabel,
    days: Array.from(monthGroup.dayMap.values()),
    totalReadings: Array.from(monthGroup.dayMap.values()).reduce(
      (acc, day) => acc + day.readings.length,
      0
    ),
  }))
}

// ── Inline edit form ──────────────────────────────────────────────────────────

interface EditFormProps {
  reading: GlucoseReading
  onSave: () => void
  onCancel: () => void
}

function EditForm({ reading, onSave, onCancel }: EditFormProps) {
  const [glucoseValue, setGlucoseValue] = useState(String(reading.glucose_value))
  const [measuredAt, setMeasuredAt] = useState(toGuayaquilLocalInput(reading.measured_at))
  const [notes, setNotes] = useState(reading.notes ?? '')
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()

  function handleSave() {
    startTransition(async () => {
      const result = await updateGlucoseReading(reading.id, glucoseValue, measuredAt, notes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lectura actualizada')
        mutate('/api/readings?limit=500')
        onSave()
      }
    })
  }

  return (
    <div className="space-y-2 border-t border-border/60 px-4 py-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Glucosa (mg/dL)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={glucoseValue}
          onChange={(e) => setGlucoseValue(e.target.value)}
          min="20"
          max="600"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Fecha y Hora
        </label>
        <input
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Notas (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ej: En ayunas, despues de comer..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReadingsList({ readings, canEdit }: ReadingsListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()

  // ── Period bounds & label ────────────────────────────────────────────────
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

  // ── Filtered readings ────────────────────────────────────────────────────
  const filteredReadings = useMemo(() => {
    if (!periodBounds) return readings
    return readings.filter((r) => {
      const t = new Date(r.measured_at).getTime()
      return t >= periodBounds.start.getTime() && t <= periodBounds.end.getTime()
    })
  }, [readings, periodBounds])

  const groupedReadings = useMemo(
    () => groupReadingsByMonthAndDay(filteredReadings),
    [filteredReadings]
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteGlucoseReading(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lectura eliminada')
        mutate('/api/readings?limit=500')
      }
      setDeletingId(null)
    })
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    setPeriodOffset(0)
    setEditingId(null)
    setExpandedId(null)
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (readings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-card-foreground">Historial</h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No hay lecturas registradas</p>
          {canEdit && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Toma una foto de tu glucometro para comenzar
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header with title + view mode toggle */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-card-foreground">
            Historial
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              ({filteredReadings.length}{viewMode !== 'all' ? ` de ${readings.length}` : ''})
            </span>
          </h3>
        </div>

        {/* View mode tabs */}
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
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
          <div className="mt-2 flex items-center gap-2">
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
      </div>

      {/* Readings list or empty-period state */}
      {filteredReadings.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin lecturas en este periodo</p>
        </div>
      ) : (
        <div>
          {groupedReadings.map((monthGroup) => (
            <section key={monthGroup.monthKey} className="border-b border-border last:border-0">
              {/* Month header — only show when viewing all or multiple months */}
              {(viewMode === 'all' || viewMode === 'week') && (
                <div className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-card-foreground">
                  <span>{monthGroup.monthLabel}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {monthGroup.totalReadings} lecturas
                  </span>
                </div>
              )}

              {monthGroup.days.map((dayGroup) => (
                <div key={dayGroup.dayKey}>
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{dayGroup.dayLabel}</span>
                    <span>{dayGroup.readings.length}</span>
                  </div>

                  <ul className="divide-y divide-border/70">
                    {dayGroup.readings.map((reading) => {
                      const status = getGlucoseStatus(reading.glucose_value)
                      const statusLabel = getStatusLabel(status)
                      const statusColors = getStatusColor(status)
                      const isExpanded = expandedId === reading.id
                      const isEditing = editingId === reading.id

                      return (
                        <li key={reading.id}>
                          <div className="flex items-center gap-3 px-4 py-3">
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
                                {formatGuayaquilTime(reading.measured_at)}
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
                                  onClick={() =>
                                    setExpandedId(isExpanded ? null : reading.id)
                                  }
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
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingId(isEditing ? null : reading.id)
                                      setExpandedId(null)
                                    }}
                                    className={`rounded-lg p-2 transition-colors ${
                                      isEditing
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
                                    }`}
                                    aria-label={isEditing ? 'Cancelar edicion' : 'Editar lectura'}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(reading.id)}
                                    disabled={isPending && deletingId === reading.id}
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                    aria-label="Eliminar lectura"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inline edit form */}
                          {isEditing && (
                            <EditForm
                              reading={reading}
                              onSave={() => setEditingId(null)}
                              onCancel={() => setEditingId(null)}
                            />
                          )}

                          {/* Expanded photo */}
                          {isExpanded && reading.photo_url && (
                            <div className="px-4 pb-3">
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
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

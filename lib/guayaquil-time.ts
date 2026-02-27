export const GUAYAQUIL_TIME_ZONE = 'America/Guayaquil'
const GUAYAQUIL_UTC_OFFSET_MINUTES = 5 * 60

type DateInput = Date | string

function toValidDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getParts(
  value: DateInput,
  options: Intl.DateTimeFormatOptions
): Record<string, string> | null {
  const date = toValidDate(value)
  if (!date) return null

  const formatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: GUAYAQUIL_TIME_ZONE,
    ...options,
  })
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  return map
}

function capitalize(value: string): string {
  if (!value) return value
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

export function toGuayaquilLocalInput(value: DateInput): string {
  const parts = getParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  if (!parts) return ''

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function guayaquilNowLocalInput(): string {
  return toGuayaquilLocalInput(new Date())
}

export function parseGuayaquilLocalInputToIso(value: string): string | null {
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  )
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const hour = Number.parseInt(match[4], 10)
  const minute = Number.parseInt(match[5], 10)
  const second = Number.parseInt(match[6] ?? '0', 10)

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59 ||
    second < 0 || second > 59
  ) {
    return null
  }

  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second)
    + GUAYAQUIL_UTC_OFFSET_MINUTES * 60_000

  return new Date(utcMillis).toISOString()
}

export function formatGuayaquilMonthLabel(value: DateInput): string {
  const parts = getParts(value, { month: 'long', year: 'numeric' })
  if (!parts) return ''
  return capitalize(`${parts.month} de ${parts.year}`)
}

export function formatGuayaquilDayLabel(value: DateInput): string {
  const parts = getParts(value, { weekday: 'long', day: 'numeric' })
  if (!parts) return ''
  return capitalize(`${parts.weekday} ${parts.day}`)
}

export function guayaquilMonthKey(value: DateInput): string {
  const parts = getParts(value, { year: 'numeric', month: '2-digit' })
  if (!parts) return ''
  return `${parts.year}-${parts.month}`
}

export function guayaquilDayKey(value: DateInput): string {
  const parts = getParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  if (!parts) return ''
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatGuayaquilTime(value: DateInput): string {
  const parts = getParts(value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!parts) return ''
  return `${parts.hour}:${parts.minute}`
}

export function formatGuayaquilChartLabel(value: DateInput): string {
  const parts = getParts(value, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!parts) return ''
  return `${parts.day} ${parts.month} ${parts.hour}:${parts.minute}`
}

export function formatGuayaquilFullLabel(value: DateInput): string {
  const parts = getParts(value, {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!parts) return ''
  return `${parts.day} de ${parts.month}, ${parts.hour}:${parts.minute}`
}

export interface GlucoseReading {
  id: string
  glucose_value: number
  unit: string
  measured_at: string
  photo_url: string | null
  notes: string | null
  created_at: string
}

export type GlucoseStatus = 'low' | 'normal' | 'prediabetic' | 'high'

export function getGlucoseStatus(value: number): GlucoseStatus {
  if (value < 70) return 'low'
  if (value <= 100) return 'normal'
  if (value <= 125) return 'prediabetic'
  return 'high'
}

export function getStatusLabel(status: GlucoseStatus): string {
  switch (status) {
    case 'low':
      return 'Bajo'
    case 'normal':
      return 'Normal'
    case 'prediabetic':
      return 'Pre-diabetes'
    case 'high':
      return 'Alto'
  }
}

export function getStatusColor(status: GlucoseStatus): string {
  switch (status) {
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'normal':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'prediabetic':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'high':
      return 'text-red-700 bg-red-50 border-red-200'
  }
}

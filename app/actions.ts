'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE_NAME, hasValidAccessToken } from '@/lib/access-control'
import { parseGuayaquilLocalInputToIso } from '@/lib/guayaquil-time'

async function ensureAuthorized(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  return hasValidAccessToken(token)
}

function normalizeMeasuredAt(value: string): string {
  const trimmedValue = value.trim()
  if (!trimmedValue) return new Date().toISOString()

  const guayaquilIso = parseGuayaquilLocalInputToIso(trimmedValue)
  if (guayaquilIso) return guayaquilIso

  const parsedDate = new Date(trimmedValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString()
  }

  return parsedDate.toISOString()
}

export async function addGlucoseReading(formData: FormData) {
  try {
    if (!(await ensureAuthorized())) {
      return { error: 'No autorizado' }
    }

    const supabase = await createClient()
    const glucoseValue = Number.parseInt(String(formData.get('glucose_value') ?? ''), 10)
    const measuredAt = String(formData.get('measured_at') ?? '')
    const notesRaw = String(formData.get('notes') ?? '').trim()
    const notes = notesRaw.length > 0 ? notesRaw : null

    if (!Number.isFinite(glucoseValue) || glucoseValue <= 0) {
      return { error: 'Valor de glucosa invalido' }
    }

    const { error } = await supabase.from('glucose_readings').insert({
      glucose_value: glucoseValue,
      unit: 'mg/dL',
      measured_at: normalizeMeasuredAt(measuredAt),
      photo_url: null,
      notes,
    })

    if (error) {
      console.error('Insert error:', error)
      return { error: 'Error al guardar la lectura' }
    }

    revalidateTag('glucose-readings', 'max')
    return { success: true }
  } catch (error) {
    console.error('addGlucoseReading unexpected error:', error)
    return { error: 'No se pudo guardar la lectura. Revisa la configuracion del servidor.' }
  }
}

export async function deleteGlucoseReading(id: string) {
  try {
    if (!(await ensureAuthorized())) {
      return { error: 'No autorizado' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('glucose_readings')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: 'Error al eliminar la lectura' }
    }

    revalidateTag('glucose-readings', 'max')
    return { success: true }
  } catch (error) {
    console.error('deleteGlucoseReading unexpected error:', error)
    return { error: 'No se pudo eliminar la lectura. Revisa la configuracion del servidor.' }
  }
}

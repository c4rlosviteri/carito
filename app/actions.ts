'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

export async function addGlucoseReading(formData: FormData) {
  try {
    const supabase = await createClient()
    const glucoseValue = Number.parseInt(String(formData.get('glucose_value') ?? ''), 10)
    const measuredAt = String(formData.get('measured_at') ?? '')
    const notesRaw = String(formData.get('notes') ?? '').trim()
    const notes = notesRaw.length > 0 ? notesRaw : null
    const photo = formData.get('photo')
    const photoFile = photo instanceof File ? photo : null

    if (!Number.isFinite(glucoseValue) || glucoseValue <= 0) {
      return { error: 'Valor de glucosa invalido' }
    }

    let photoUrl: string | null = null

    if (photoFile && photoFile.size > 0) {
      const fileExt = photoFile.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('glucose-photos')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Error al subir la foto' }
      }

      const { data: urlData } = supabase.storage
        .from('glucose-photos')
        .getPublicUrl(fileName)

      photoUrl = urlData.publicUrl
    }

    const measuredAtDate = measuredAt ? new Date(measuredAt) : new Date()

    const { error } = await supabase.from('glucose_readings').insert({
      glucose_value: glucoseValue,
      unit: 'mg/dL',
      measured_at: Number.isNaN(measuredAtDate.getTime())
        ? new Date().toISOString()
        : measuredAtDate.toISOString(),
      photo_url: photoUrl,
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
    const supabase = await createClient()

    const { data: reading } = await supabase
      .from('glucose_readings')
      .select('photo_url')
      .eq('id', id)
      .single()

    if (reading?.photo_url) {
      const fileName = reading.photo_url.split('/').pop()
      if (fileName) {
        await supabase.storage.from('glucose-photos').remove([fileName])
      }
    }

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

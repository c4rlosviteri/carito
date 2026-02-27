'use client'

import { useState, useRef, useTransition } from 'react'
import { Camera, Upload, X, Clock, Droplets } from 'lucide-react'
import { toast } from 'sonner'
import { addGlucoseReading } from '@/app/actions'
import { useSWRConfig } from 'swr'
import exifr from 'exifr'
import { extractGlucoseValue } from '@/lib/glucose-vision'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxSide = 800
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(dataUrl.split(',')[1])
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function CaptureForm() {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedDate, setExtractedDate] = useState<string>('')
  const [glucoseValue, setGlucoseValue] = useState('')
  const [detectedValue, setDetectedValue] = useState<number | null>(null)
  const [showDetectedConfirmation, setShowDetectedConfirmation] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()

  async function extractExifDate(file: File) {
    try {
      const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate'])
      if (exifData) {
        const dateValue = exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate
        if (dateValue) {
          const d = new Date(dateValue)
          if (!isNaN(d.getTime())) {
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
            setExtractedDate(localIso)
            toast.success('Fecha extraida de los metadatos de la imagen')
            return
          }
        }
      }
      setFallbackDate()
      toast.info('No se encontraron metadatos EXIF, usando fecha actual')
    } catch {
      setFallbackDate()
      toast.info('No se pudieron leer metadatos, usando fecha actual')
    }
  }

  function setFallbackDate() {
    const now = new Date()
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setExtractedDate(localIso)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)

    const base64 = await fileToBase64(file)

    const [, detectedValue] = await Promise.all([
      extractExifDate(file),
      extractGlucoseValue(base64, 'image/jpeg'),
    ])

    if (typeof detectedValue === 'number') {
      setDetectedValue(detectedValue)
      setShowDetectedConfirmation(true)
      toast.success(`Valor detectado: ${detectedValue} mg/dL. Confirma antes de guardar.`)
    } else {
      setDetectedValue(null)
      setShowDetectedConfirmation(false)
      toast.info('No se pudo detectar automaticamente el valor. Puedes ingresarlo manualmente.')
    }
  }

  function clearImage() {
    setImagePreview(null)
    setExtractedDate('')
    setDetectedValue(null)
    setShowDetectedConfirmation(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function applyDetectedValue() {
    if (typeof detectedValue !== 'number') return
    setGlucoseValue(String(detectedValue))
    setShowDetectedConfirmation(false)
    toast.success(`Valor confirmado: ${detectedValue} mg/dL`)
  }

  function rejectDetectedValue() {
    setShowDetectedConfirmation(false)
    toast.info('Valor detectado descartado. Ingresa el valor manualmente.')
  }

  function handleSubmit() {
    if (!glucoseValue || isNaN(parseInt(glucoseValue, 10))) {
      toast.error('Ingresa un valor de glucosa valido')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('glucose_value', glucoseValue)
      formData.append('measured_at', extractedDate || new Date().toISOString())
      if (notes) formData.append('notes', notes)

      const result = await addGlucoseReading(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lectura guardada correctamente')
        setGlucoseValue('')
        setNotes('')
        clearImage()
        mutate('/api/readings')
      }
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-card-foreground">
        <Droplets className="h-5 w-5 text-primary" />
        Nueva Lectura
      </h2>

      {/* Photo capture area */}
      {imagePreview ? (
        <div className="relative mb-4">
          <img
            src={imagePreview}
            alt="Foto del glucometro"
            className="h-48 w-full rounded-lg object-cover"
          />
          <button
            onClick={clearImage}
            className="absolute right-2 top-2 rounded-full bg-foreground/70 p-1.5 text-background transition-colors hover:bg-foreground/90"
            aria-label="Eliminar foto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mb-4 flex gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <Camera className="h-7 w-7" />
            <span className="text-sm font-medium">Tomar Foto</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted p-6 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/80"
          >
            <Upload className="h-7 w-7" />
            <span className="text-sm font-medium">Subir Imagen</span>
          </button>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Capturar foto con camara"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Seleccionar imagen"
      />

      {/* Glucose value input */}
      <div className="mb-3">
        <label htmlFor="glucose_value" className="mb-1.5 block text-sm font-medium text-card-foreground">
          Valor de Glucosa (mg/dL)
        </label>
        <input
          id="glucose_value"
          type="number"
          inputMode="numeric"
          placeholder="ej: 96"
          value={glucoseValue}
          onChange={(e) => {
            setGlucoseValue(e.target.value)
            if (showDetectedConfirmation) {
              setShowDetectedConfirmation(false)
            }
          }}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-2xl font-bold text-card-foreground placeholder:text-muted-foreground/50 placeholder:text-lg placeholder:font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          min="20"
          max="600"
        />
        {showDetectedConfirmation && typeof detectedValue === 'number' && (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-xs text-card-foreground">
              Valor detectado: <span className="font-semibold">{detectedValue} mg/dL</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={applyDetectedValue}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Usar valor detectado
              </button>
              <button
                type="button"
                onClick={rejectDetectedValue}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                No es correcto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extracted date */}
      <div className="mb-3">
        <label htmlFor="measured_at" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-card-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          Fecha y Hora de Medicion
        </label>
        <input
          id="measured_at"
          type="datetime-local"
          value={extractedDate}
          onChange={(e) => setExtractedDate(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        {extractedDate && (
          <p className="mt-1 text-xs text-muted-foreground">
            {imagePreview ? 'Extraida de metadatos EXIF de la imagen' : 'Fecha manual'}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-card-foreground">
          Notas (opcional)
        </label>
        <input
          id="notes"
          type="text"
          placeholder="ej: En ayunas, despues de comer..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !glucoseValue}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar Lectura'}
      </button>
    </section>
  )
}

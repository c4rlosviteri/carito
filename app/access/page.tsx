import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  getExpectedAccessToken,
  hasAccessCodeConfigured,
  hasValidAccessToken,
  isAccessCodeValid,
} from '@/lib/access-control'

function sanitizeNextPath(rawNext: string): string {
  if (!rawNext.startsWith('/')) return '/'
  if (rawNext.startsWith('//')) return '/'
  if (rawNext.startsWith('/access')) return '/'
  return rawNext
}

async function submitAccessCode(formData: FormData) {
  'use server'

  const rawCode = String(formData.get('access_code') ?? '')
  const nextPath = sanitizeNextPath(String(formData.get('next') ?? '/'))

  if (!(await isAccessCodeValid(rawCode))) {
    redirect(`/access?error=1&next=${encodeURIComponent(nextPath)}`)
  }

  const cookieStore = await cookies()
  const token = await getExpectedAccessToken()

  cookieStore.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })

  redirect(nextPath)
}

interface AccessPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = searchParams ? await searchParams : {}
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value

  if (await hasValidAccessToken(token)) {
    redirect('/')
  }

  const nextRaw = params.next
  const nextValue = Array.isArray(nextRaw) ? nextRaw[0] : (nextRaw ?? '/')
  const nextPath = sanitizeNextPath(nextValue)
  const errorRaw = params.error
  const hasError = Array.isArray(errorRaw) ? errorRaw[0] === '1' : errorRaw === '1'
  const hasCode = hasAccessCodeConfigured()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center bg-background p-4">
      <section className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-card-foreground">Acceso privado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa el codigo para acceder al registro de glucosa.
        </p>

        {!hasCode && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Falta configurar <code>APP_ACCESS_CODE</code> en el servidor.
          </p>
        )}

        {hasError && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Codigo incorrecto. Intenta nuevamente.
          </p>
        )}

        <form action={submitAccessCode} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="access_code" className="block text-sm font-medium text-card-foreground">
            Codigo de acceso
          </label>
          <input
            id="access_code"
            name="access_code"
            type="password"
            autoComplete="off"
            required
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Ingresa el codigo"
          />
          <button
            type="submit"
            disabled={!hasCode}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  )
}

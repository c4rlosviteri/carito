import { Activity } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-primary px-4 py-4 shadow-sm">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-primary-foreground">
            GlucoTrack
          </h1>
          <p className="text-xs text-primary-foreground/70">
            Monitor de Glucosa
          </p>
        </div>
      </div>
    </header>
  )
}

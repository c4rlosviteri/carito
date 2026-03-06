import { Activity } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-primary px-4 py-4 shadow-sm">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20 overflow-hidden">
          <Image src="/carito.webp" alt="Carito" width={36} height={36} />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-primary-foreground">
            Carito
          </h1>
          <p className="text-xs text-primary-foreground/70">
            Monitor de Glucosa
          </p>
        </div>
      </div>
    </header>
  )
}

import { Header } from '@/components/header'
import { Dashboard } from '@/components/dashboard'

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-background">
      <Header />
      <Dashboard />
    </main>
  )
}

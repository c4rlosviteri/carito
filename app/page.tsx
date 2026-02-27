import { Header } from '@/components/header'
import { Dashboard } from '@/components/dashboard'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE_NAME, hasValidAccessToken } from '@/lib/access-control'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  const canEdit = await hasValidAccessToken(token)

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-background">
      <Header />
      <Dashboard canEdit={canEdit} />
    </main>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _dmSans = DM_Sans({ subsets: ['latin'], weight: ['500', '600', '700'] })

export const metadata: Metadata = {
  title: 'GlucoTrack - Monitor de Glucosa',
  description: 'Registro fotografico de lecturas de glucosa con extraccion de metadatos EXIF',
  manifest: '/manifest.json',
  icons: {
    icon: '/carito.webp',
    apple: '/carito.webp',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}

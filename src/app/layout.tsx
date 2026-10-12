import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { LocationProvider } from '@/components/providers/LocationProvider'
import { Inter } from 'next/font/google'

import './globals.css'

import { Navbar } from '@/components/layout/Navbar'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister'
import { Toaster } from '@/components/ui/toaster'
import { APP_LONG_NAME, APP_NAME } from '@/lib/constants'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Ward Heat Risk Forecast`,
    template: `%s — ${APP_NAME}`,
  },
  description:
    'Ward-level heatwave risk forecast and public-health advisory system for Indian municipal authorities.',
  applicationName: APP_NAME,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#0E0B08',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>
          <Suspense fallback={<p className="p-4">Loading TAPAS…</p>}><LocationProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
          >
            Skip to content
          </a>
          <Navbar />
          <OfflineBanner />
          <main id="main" className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
          <Toaster />
          <ServiceWorkerRegister />
          </LocationProvider></Suspense>
        </QueryProvider>
        <span className="sr-only">{APP_LONG_NAME}</span>
      </body>
    </html>
  )
}

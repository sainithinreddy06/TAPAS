import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import { createHash } from 'node:crypto'
import { OFFLINE_ROUTES, offlineShellUrl } from './src/lib/pwa'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // The service worker is only useful in a production build; leaving it on in
  // dev makes hot reload fight the precache.
  disable: process.env.NODE_ENV === 'development',
  // ServiceWorkerRegister owns registration and the user-controlled update flow.
  register: false,
  reloadOnOnline: false,
  manifestTransforms: [async (entries) => {
    // Version the public route HTML together with emitted JS/CSS. The internal
    // URL avoids confusing Next RSC requests with HTML in the precache.
    const revision = createHash('sha256').update(JSON.stringify(entries)).digest('hex')
    return {
      manifest: [
        ...entries,
        // Next emits route HTML after this compilation, so its build-time
        // size is unknown; Serwist requires a numeric bookkeeping field.
        ...OFFLINE_ROUTES.map((route) => ({ url: offlineShellUrl(route), revision, size: 0 })),
      ],
      warnings: [],
    }
  }],
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
}

export default withSerwist(nextConfig)

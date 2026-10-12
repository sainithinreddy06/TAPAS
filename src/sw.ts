/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'
import { offlineShellUrl } from './lib/pwa'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * Public shell/assets only. The API adapter owns bounded, validated data
 * persistence and labels cached results with their original provenance.
 */
const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
      handler: new NetworkOnly({
        networkTimeoutSeconds: 5,
        plugins: [{
          handlerDidError: async ({ request }): Promise<Response | undefined> => {
            const shell = offlineShellUrl(new URL(request.url).pathname)
            const saved = (await serwist.matchPrecache(shell)) ?? (await serwist.matchPrecache('/offline.html'))
            if (!saved) return undefined
            // Browser onLine can remain true when a worker restores an offline
            // document. Mark the restored HTML explicitly, without altering URL
            // state or treating any cached scientific value as current.
            const html = (await saved.text()).replace('<head>', '<head><meta name="tapas-offline-shell" content="true">')
            const headers = new Headers(saved.headers)
            headers.delete('content-length')
            return new Response(html, {status: 200, headers})
          },
        }],
      }),
    },
    {
      // APIs, geocoders, POIs, tiles, and Next RSC requests stay outside SW
      // storage. No broad runtime cache can disguise stale safety data.
      matcher: () => true,
      handler: new NetworkOnly({ networkTimeoutSeconds: 10 }),
    },
  ],
})

self.addEventListener('activate', (event) => {
  // Remove only caches used by the previous TAPAS worker. Some held generated
  // responses and must not reappear after this data-integrity upgrade.
  const legacy = new Set([
    'tapas-ward-geometry', 'tapas-risk-map', 'tapas-api', 'tapas-map-tiles',
    'apis', 'cross-origin', 'others', 'static-data-assets', 'next-data',
    'pages', 'pages-rsc', 'pages-rsc-prefetch',
  ])
  event.waitUntil(caches.keys().then((names) =>
    Promise.all(names.filter((name) => legacy.has(name)).map((name) => caches.delete(name))),
  ))
})

serwist.addEventListeners()

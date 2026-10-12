'use client'

import { useEffect, useState } from 'react'

/**
 * Connection state, SSR-safe.
 *
 * Starts optimistic (`true`) so the server-rendered markup never flashes an
 * offline banner, then corrects itself on mount.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine && !document.querySelector('meta[name="tapas-offline-shell"]'))
    const reconnected = () => {
      document.querySelector('meta[name="tapas-offline-shell"]')?.remove()
      update()
    }
    update()

    window.addEventListener('online', reconnected)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', reconnected)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}

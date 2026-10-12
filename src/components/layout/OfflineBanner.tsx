'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Connectivity does not establish whether a particular dataset was cached. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)
  const wasOnline = useRef(true)

  useEffect(() => {
    if (!online && wasOnline.current) setDismissed(false)
    wasOnline.current = online
  }, [online])

  if (online || dismissed) return null

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="flex items-start gap-2 border-b border-[#E5C158] bg-[#FDF3D0] px-3 py-2 text-[#6B5312] no-print sm:px-4"
    >
      <WifiOff className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-xs leading-relaxed sm:text-sm">
        <span className="font-semibold">No internet connection.</span>{' '}
        Saved results, when available, are labelled with their source and time.
        New forecasts, searches, map tiles and directions may be unavailable.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-black/5"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

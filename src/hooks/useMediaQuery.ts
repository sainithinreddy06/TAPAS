'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe media query. Returns `false` until mounted, so the server markup and
 * the first client render always agree.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}

/** Tailwind's `lg` breakpoint — where the dashboard becomes three columns. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

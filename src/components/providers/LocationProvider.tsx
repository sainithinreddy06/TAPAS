'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { coordinateLocation, readLocationParams, selectionParams, type SelectedLocation } from '@/lib/location'
import { reverseLocation } from '@/lib/geocoding'
import { forecastDates, todayIso } from '@/lib/utils'
import { isoDate } from '@/lib/api'

type Selection = { location: SelectedLocation | null; selectedDate: string; selectedWardId: string | null }
interface Context extends Selection {
  dates: string[]
  selectLocation: (location: SelectedLocation | null) => void
  selectWard: (wardId: string | null) => void
  setSelectedDate: (date: string) => void
  selectionQuery: string
}
const LocationContext = createContext<Context | null>(null)
export function LocationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(), params = useSearchParams()
  const [today, setToday] = useState(todayIso)
  const [selection, setSelection] = useState<Selection>(() => {
    const search = new URLSearchParams(params.toString()), location = readLocationParams(search)
    return {location, selectedDate: isoDate(search.get('date')) ?? today, selectedWardId: search.get('ward')?.slice(0,120) ?? null}
  })
  const ref = useRef(selection), lastApplied = useRef(''), pending = useRef<string | null>(null)
  ref.current = selection
  const dates = forecastDates(5, new Date(`${today}T12:00:00+05:30`))
  const serialized = params.toString()

  useEffect(() => {
    const signature = `${pathname}?${serialized}`
    if (lastApplied.current === signature) return
    lastApplied.current = signature
    if (pending.current === serialized) { pending.current = null; return }
    pending.current = null
    const search = new URLSearchParams(serialized), location = readLocationParams(search)
    const date = isoDate(search.get('date')) ?? todayIso()
    setSelection({ location, selectedDate: date, selectedWardId: search.get('ward')?.slice(0, 120) ?? null })
    if (!location) return
    const controller = new AbortController()
    reverseLocation(location.latitude, location.longitude, controller.signal).then(resolved => {
      if (!resolved || controller.signal.aborted) return
      setSelection(current => current.location?.latitude === location.latitude && current.location?.longitude === location.longitude ? { ...current, location: resolved } : current)
    }).catch(() => { /* Shared coordinates remain usable if reverse lookup is unavailable. */ })
    return () => controller.abort()
  }, [pathname, serialized])

  const update = useCallback((next: Selection, replace = false) => {
    ref.current = next; setSelection(next)
    const query = selectionParams(next.location, next.selectedDate, next.selectedWardId)
    pending.current = query
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `${pathname}?${query}`)
  }, [pathname])
  useEffect(() => {
    const check = () => {
      const next = todayIso()
      if (next !== today) {
        setToday(next)
        if (ref.current.selectedDate === today) update({ ...ref.current, selectedDate: next }, true)
      }
    }
    const timer = setInterval(check, 30000)
    window.addEventListener('focus', check)
    return () => { clearInterval(timer); window.removeEventListener('focus', check) }
  }, [today, update])
  const selectLocation = useCallback((location: SelectedLocation | null) => {
    if (location) coordinateLocation(location.latitude, location.longitude)
    update({ ...ref.current, location, selectedWardId: null })
  }, [update])
  const selectWard = useCallback((ward: string | null) => update({ ...ref.current, selectedWardId: ward }), [update])
  const setSelectedDate = useCallback((date: string) => { if (isoDate(date)) update({ ...ref.current, selectedDate: date }) }, [update])
  return <LocationContext.Provider value={{ ...selection, dates, selectLocation, selectWard, setSelectedDate, selectionQuery: selectionParams(selection.location, selection.selectedDate, selection.selectedWardId) }}>{children}</LocationContext.Provider>
}
export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) throw new Error('LocationProvider is required')
  return context
}

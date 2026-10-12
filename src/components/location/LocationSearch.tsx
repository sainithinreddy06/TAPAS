'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LocateFixed, Search, X } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { coordinateLocation, locationContext, type SelectedLocation } from '@/lib/location'
import { reverseLocation, searchLocations } from '@/lib/geocoding'

export function LocationSearch() {
  const { location, selectLocation } = useLocation()
  const [query, setQuery] = useState(''), [debounced, setDebounced] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(-1)
  const [locating, setLocating] = useState(false), [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null), container = useRef<HTMLDivElement>(null), generation = useRef(0)
  const id = useId()
  useEffect(() => { if (active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'}) }, [active,id])
  const submit = () => { if(query.trim().length >= 3) { setDebounced(query.trim()); setOpen(true); setActive(-1) } }
  const results = useQuery({ queryKey: ['place-search', debounced.toLowerCase()], queryFn: ({ signal }) => searchLocations(debounced, signal), enabled: open && debounced.length >= 3 && debounced === query.trim(), staleTime: 3600000, gcTime: 3600000, retry: false })
  const suggestions = debounced === query.trim() ? results.data ?? [] : []
  useEffect(() => { const close = (e: PointerEvent) => { if (!container.current?.contains(e.target as Node)) setOpen(false) }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close) }, [])
  const choose = (next: SelectedLocation) => { generation.current++; setLocating(false); selectLocation(next); setQuery(''); setDebounced(''); setOpen(false); setActive(-1); setMessage(''); input.current?.focus() }
  const currentLocation = () => {
    const request = ++generation.current
    if (!navigator.geolocation) { setMessage('This browser does not support location access. Search or enter coordinates.'); return }
    setLocating(true); setMessage('')
    navigator.geolocation.getCurrentPosition(async position => {
      if (request !== generation.current) return
      try {
        const point = coordinateLocation(position.coords.latitude, position.coords.longitude)
        const resolved = await reverseLocation(point.latitude, point.longitude).catch(() => null)
        if (request !== generation.current) return
        choose(resolved ?? { ...point, source: 'Device location' })
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Location unavailable.') }
      finally { setLocating(false) }
    }, error => { if (request !== generation.current) return; setLocating(false); setMessage(error.code === 1 ? 'Location permission denied. Search for a place or enter coordinates.' : 'Could not obtain your location. Search or try again.') }, { timeout: 10000, maximumAge: 60000 })
  }
  return <section ref={container} className="relative min-w-0 space-y-2" aria-label="Selected location">
    <label htmlFor={id} className="block text-sm font-semibold">Find your place in India</label>
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 tapas-subtext" aria-hidden="true" />
        <Input ref={input} id={id} className="h-11 pl-9 pr-10 text-base" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={active >= 0 && suggestions[active] ? `${id}-${active}` : undefined} placeholder="City, district, PIN or latitude, longitude" value={query} autoComplete="off"
          onFocus={() => setOpen(true)} onChange={e => { generation.current++; setLocating(false); setQuery(e.target.value); setActive(-1); setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setActive(-1) } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(index => suggestions.length ? (index + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length : -1) } else if (e.key === 'Enter') { e.preventDefault(); if(suggestions[active >= 0 ? active : 0]) choose(suggestions[active >= 0 ? active : 0]); else submit() } }} />
        {query ? <button type="button" className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center" aria-label="Clear search" onClick={() => { setQuery(''); setActive(-1); input.current?.focus() }}><X className="h-4 w-4" /></button> : null}
      </div>
      <Button className="h-11 shrink-0 px-3" onClick={submit} aria-label="Search places"><Search className="h-4 w-4"/><span className="hidden sm:inline">Search</span></Button><Button className="h-11 shrink-0 px-3" variant="outline" onClick={currentLocation} disabled={locating} aria-label="Use current location"><LocateFixed className="h-4 w-4" /><span className="hidden sm:inline">{locating ? 'Locating…' : 'Use my location'}</span></Button>
    </div>
    {open && query.trim().length >= 3 ? <div className="absolute left-0 right-0 top-[4.5rem] z-40 max-h-[min(45dvh,20rem)] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
      <ul id={`${id}-options`} role="listbox" aria-label="Indian places">{suggestions.map((place, index) => <li key={`${place.id}-${index}`} id={`${id}-${index}`} role="option" aria-selected={index === active} onPointerDown={e => e.preventDefault()} onClick={() => choose(place)} className={`cursor-pointer rounded px-3 py-3 text-sm ${index === active ? 'bg-secondary' : 'hover:bg-secondary'}`}><span className="block font-semibold">{place.name}</span><span className="block text-xs tapas-subtext">{locationContext(place)}{place.postalCode ? ` · ${place.postalCode}` : ''}</span></li>)}</ul>
      <p role="status" className="px-3 py-2 text-xs tapas-subtext">{query.trim() !== debounced ? 'Press Search or Enter to find this place.' : results.isFetching ? 'Searching…' : results.error ? results.error.message : suggestions.length ? 'Select a result. Arrow keys and Enter also work.' : 'No matching Indian place found. Try a nearby town, state, or coordinates. PIN coverage depends on mapped addresses.'}</p>
      <a className="block px-3 pb-2 text-[11px] underline tapas-subtext" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Nominatim · © OpenStreetMap contributors</a>
    </div> : null}
    {location ? <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{location.name}</p><p className="text-xs tapas-subtext">{locationContext(location)} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p></div><Button variant="ghost" size="icon" aria-label="Clear selected location" onClick={() => { generation.current++; selectLocation(null) }}><X className="h-4 w-4" /></Button></div> : <p className="text-xs tapas-subtext">Enter a place and press Search or Enter. Coordinates use latitude, longitude order.</p>}
    {message ? <p role="status" className="text-sm text-[var(--risk-4)]">{message}</p> : null}
  </section>
}

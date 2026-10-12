'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useQuery } from '@tanstack/react-query'
import maplibregl, {
  type Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl'
import { DataProvenance } from '@/components/data/DataProvenance'
import {
  fetchHeatGrid,
  snapshotGrid,
  viewportKey,
  NATIONAL_BOUNDS,
  type Bounds,
  type HeatPoint,
} from '@/lib/heatGrid'
import { formatHeatIndex, heatIndexBand } from '@/lib/thermal'
import { formatDateTime, formatTemp } from '@/lib/utils'
import { useLocation } from '@/components/providers/LocationProvider'
import { coordinateLocation } from '@/lib/location'

const EMPTY_POINTS: HeatPoint[] = []

export function ThermalLayer({
  map,
  date,
}: {
  map: MapLibreMap | null
  date: string
}) {
  const overlay = useRef<HTMLDivElement>(null)
  const { selectLocation } = useLocation()
  const [viewport, setViewport] = useState<{ bounds: Bounds; zoom: number }>({
    bounds: NATIONAL_BOUNDS,
    zoom: 3.5,
  })
  const [metric, setMetric] = useState<'heatIndex' | 'temperature'>('heatIndex')

  const key = viewportKey(viewport.bounds, viewport.zoom)
  const initial = useMemo(() => {
    const snap =
      snapshotGrid(viewport.bounds, viewport.zoom, date) ??
      snapshotGrid(NATIONAL_BOUNDS, 3, date)
    if (!snap) return undefined
    const now = new Date().toISOString()
    return {
      ...snap,
      points: snap.points.map((p) => ({ ...p, time: now })),
      provenance: {
        ...snap.provenance,
        status: 'live' as const,
        originalAt: now,
        fetchedAt: now,
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, date])

  const query = useQuery({
    queryKey: ['heat-grid', key, date, metric],
    queryFn: ({ signal }) => fetchHeatGrid(viewport.bounds, viewport.zoom, date, signal, metric),
    initialData: initial,
    initialDataUpdatedAt: 0,
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  })

  const online = useOnlineStatus()
  const data = query.data
  const points = data?.points ?? EMPTY_POINTS
  const status =
    data && (query.error || !online || data.provenance.fromCache)
      ? 'cached'
      : data?.provenance.status ?? 'live'

  // Debounced viewport updates on map movement
  useEffect(() => {
    if (!map) return
    let timer: ReturnType<typeof setTimeout>

    const update = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const b = map.getBounds()
        setViewport({
          bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
          zoom: map.getZoom(),
        })
      }, 500)
    }

    map.on('moveend', update)
    update()
    return () => {
      clearTimeout(timer)
      map.off('moveend', update)
    }
  }, [map])

  // Setup circle layer and sync features
  useEffect(() => {
    if (!map) return

    if (!map.getSource('thermal-points')) {
      map.addSource('thermal-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      const beforeLayer = map.getStyle()?.layers?.find(
        (l) => l.type === 'symbol' || l.id === 'dark_labels' || l.id.includes('label')
      )?.id

      map.addLayer({
        id: 'thermal-circles',
        type: 'circle',
        source: 'thermal-points',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3,
            7,
            6,
            12,
            12,
            19,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.2,
          'circle-stroke-opacity': 0.6,
        },
      }, beforeLayer)
    }

    const features = points.map((p) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        id: p.id,
        color:
          metric === 'heatIndex'
            ? heatIndexBand(p.heatIndex)?.color ?? '#64748B'
            : p.temperature === null
            ? '#64748B'
            : p.temperature >= 40
            ? '#641E16'
            : p.temperature >= 35
            ? '#C0392B'
            : p.temperature >= 30
            ? '#E67E22'
            : p.temperature >= 25
            ? '#D4AC0D'
            : '#2471A3',
      },
    }))

    const source = map.getSource('thermal-points') as GeoJSONSource | undefined
    if (source) {
      source.setData({ type: 'FeatureCollection', features })
    }
  }, [map, points, metric])

  // Click & Hover interaction on polka dots
  useEffect(() => {
    if (!map) return
    let popup: maplibregl.Popup | null = null
    let activeHoverId: string | null = null
    let pinnedId: string | null = null

    const createPopupContent = (p: HeatPoint) => {
      const content = document.createElement('div')
      content.className = 'text-xs p-1 text-[#F2E3CC] font-sans leading-relaxed'
      content.textContent = `${p.name}: Heat Index ${formatHeatIndex(
        p.heatIndex
      )}; air ${formatTemp(p.temperature)}. ${status.toUpperCase()} · ${formatDateTime(
        p.time
      )} · ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
      return content
    }

    const showPopup = (p: HeatPoint, pinned = false) => {
      popup?.remove()
      popup = new maplibregl.Popup({
        closeButton: pinned,
        closeOnClick: false,
        maxWidth: '340px',
      })
        .setLngLat([p.longitude, p.latitude])
        .setDOMContent(createPopupContent(p))
        .addTo(map)

      if (pinned) {
        pinnedId = p.id
        popup.on('close', () => {
          pinnedId = null
          popup = null
        })
      }
    }

    const handleMouseMove = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer'
      const id = event.features?.[0]?.properties?.id
      if (id && id !== activeHoverId && id !== pinnedId) {
        activeHoverId = id
        const p = points.find((pt) => pt.id === id)
        if (p) showPopup(p, false)
      }
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      activeHoverId = null
      if (!pinnedId) {
        popup?.remove()
        popup = null
      }
    }

    const handleClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id
      const p = points.find((pt) => pt.id === id)
      if (!p) return
      showPopup(p, true)
      selectLocation({
        ...coordinateLocation(p.latitude, p.longitude),
        name: p.name,
        source: 'Open-Meteo sampled point',
      })
    }

    map.on('mousemove', 'thermal-circles', handleMouseMove)
    map.on('mouseleave', 'thermal-circles', handleMouseLeave)
    map.on('click', 'thermal-circles', handleClick)

    return () => {
      map.off('mousemove', 'thermal-circles', handleMouseMove)
      map.off('mouseleave', 'thermal-circles', handleMouseLeave)
      map.off('click', 'thermal-circles', handleClick)
      popup?.remove()
      popup = null
    }
  }, [map, points, status, selectLocation])

  useEffect(() => {
    if (!map) return
    const inspect = () => {
      if (map.getLayer('thermal-circles') && overlay.current) {
        overlay.current.dataset.renderedPoints = String(
          map.queryRenderedFeatures({ layers: ['thermal-circles'] }).length
        )
      }
    }
    map.on('render', inspect)
    return () => {
      map.off('render', inspect)
    }
  }, [map])

  const select = (p: HeatPoint) =>
    selectLocation({
      ...coordinateLocation(p.latitude, p.longitude),
      name: p.name,
      source: 'Open-Meteo sampled point',
    })

  return (
    <div
      ref={overlay}
      className="relative z-10 shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)]"
      data-testid="heat-layer"
      data-point-count={points.length}
      data-status={status}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 className="text-xs font-semibold text-[var(--text-primary)]">
          {points.length} weather-model points
        </h2>
        <label className="flex min-h-11 items-center gap-2 text-xs text-[var(--text-secondary)]">
          Heat metric
          <select
            aria-label="Heat metric"
            className="min-h-11 max-w-[140px] rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 text-[var(--text-primary)] shadow-sm"
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            <option value="heatIndex">Heat Index</option>
            <option value="temperature">Air temperature</option>
          </select>
        </label>
      </div>

      <DataProvenance
        status={status}
        source={data?.provenance.source}
        timestamp={data?.provenance.originalAt}
        note={
          data?.provenance.status === 'snapshot'
            ? 'Recorded model sample; original dates are shown. Live refresh pending or unavailable.'
            : query.isFetching
            ? 'Refreshing the selected viewport…'
            : undefined
        }
      />

      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        {metric === 'heatIndex'
          ? 'Gold: caution · orange: extreme caution · red: danger · dark red: extreme danger · grey: HI unavailable. Shade/light wind; not an official warning.'
          : 'Blue <25°C · gold 25–30°C · orange 30–35°C · red 35–40°C · dark red ≥40°C. Temperature colours are not official risk categories.'}
      </p>

      {!points.length ? (
        <p role="status" className="mt-1 text-xs text-[var(--text-muted)]">
          No live, cached or recorded weather points for this viewport. Zoom out to the recorded India grid.
        </p>
      ) : null}

      <button
        className="min-h-11 text-xs underline text-[var(--accent)] hover:text-[var(--accent-hover)]"
        onClick={() => {
          if (map && points.length) {
            const b = new maplibregl.LngLatBounds()
            points.forEach((p) => b.extend([p.longitude, p.latitude]))
            map.fitBounds(b, {
              padding: { top: 110, bottom: 25, left: 25, right: 25 },
              maxZoom: 10,
              duration: 0,
            })
          }
        }}
      >
        Fit returned model points
      </button>

      <details className="text-xs text-[var(--text-secondary)]">
        <summary className="flex min-h-11 cursor-pointer items-center py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Inspect model points
        </summary>
        <ul className="max-h-28 overflow-y-auto">
          {points.map((p) => (
            <li key={p.id}>
              <button
                className="min-h-11 text-left underline text-[var(--text-secondary)] hover:text-[var(--accent)]"
                onClick={() => select(p)}
              >
                {p.name}: {formatTemp(p.temperature)}, HI {formatHeatIndex(p.heatIndex)} ·{' '}
                {formatDateTime(p.time)}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

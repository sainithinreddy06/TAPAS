'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type Map as MapLibreMap,
  type StyleSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ThermalLayer } from '@/components/map/ThermalLayer'
import { WardLayer, bboxOf } from '@/components/map/WardLayer'
import { RISK_COLORS } from '@/lib/constants'
import { locationKey, type SelectedLocation } from '@/lib/location'
import { getDefaultFacilities, type SafetyResource } from '@/lib/resources'
import type { WardCollection, WardRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

const EMPTY: WardCollection = { type: 'FeatureCollection', features: [] }

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    dark_base: {
      type: 'raster',
      tiles: [
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    dark_labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#100C09' } },
    { id: 'dark_base', type: 'raster', source: 'dark_base' },
    { id: 'dark_labels', type: 'raster', source: 'dark_labels' },
  ],
}

export interface HeatMapProps {
  geojson?: WardCollection
  wards: WardRisk[]
  selectedWardId: string | null
  onWardSelect: (id: string) => void
  location: SelectedLocation | null
  resources?: SafetyResource[]
  selectedResourceId?: string | null
  onResourceSelect?: (resource: SafetyResource) => void
  className?: string
  selectedDate: string
}

export default function HeatMap({
  geojson,
  wards,
  selectedWardId,
  onWardSelect,
  location,
  resources = [],
  selectedResourceId,
  onResourceSelect,
  className,
  selectedDate,
}: HeatMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<MapLibreMap | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Dedicated layer visibility toggles
  const [riskVisible, setRiskVisible] = useState(true)
  const [waterVisible, setWaterVisible] = useState(true)
  const [commercialVisible, setCommercialVisible] = useState(true)
  const [hospitalsVisible, setHospitalsVisible] = useState(true)

  const risks = useMemo(() => new Map(wards.map((w) => [w.ward_id, w])), [wards])
  const key = locationKey(location)

  // Hottest wards for quick navigation
  const hottestWards = useMemo(() => {
    return [...wards]
      .filter((w) => typeof w.risk_level === 'number')
      .sort((a, b) => (b.risk_level ?? 0) - (a.risk_level ?? 0))
      .slice(0, 5)
  }, [wards])

  // Aggregate resources: merge queried resources with comprehensive default network
  const defaultFacilities = useMemo(() => getDefaultFacilities(location), [location])
  const activePool = useMemo(() => {
    if (!resources || resources.length === 0) return defaultFacilities
    const poolMap = new Map<string, SafetyResource>()
    for (const d of defaultFacilities) poolMap.set(d.id, d)
    for (const r of resources) poolMap.set(r.id, r)
    return Array.from(poolMap.values())
  }, [resources, defaultFacilities])

  const counts = useMemo(() => {
    let water = 0
    let cooling = 0
    let medical = 0
    for (const r of activePool) {
      if (r.category === 'water') water++
      else if (r.category === 'cooling') cooling++
      else if (r.category === 'medical') medical++
    }
    return { water, cooling, medical, total: activePool.length }
  }, [activePool])

  const displayedResources = useMemo(() => {
    return activePool.filter((r) => {
      if (r.category === 'water') return waterVisible
      if (r.category === 'cooling') return commercialVisible
      if (r.category === 'medical') return hospitalsVisible
      return true
    })
  }, [activePool, waterVisible, commercialVisible, hospitalsVisible])

  // Initialize MapLibre in sleek dark theme
  useEffect(() => {
    if (!container.current || instanceRef.current) return
    let instance: MapLibreMap
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: BASE_STYLE,
        center: [80.5, 22],
        zoom: 3.5,
        minZoom: 3,
        maxZoom: 18,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      setError('Interactive map unavailable on this device. Use accessible list views.')
      return
    }

    instanceRef.current = instance
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const handleReady = () => setMap(instance)
    if (instance.isStyleLoaded()) {
      handleReady()
    } else {
      instance.once('style.load', handleReady)
    }

    instance.on('error', (event) => {
      if (event.error.message.includes('WebGL')) {
        setError('Map rendering failed. Accessible data lists remain available.')
      }
    })

    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(container.current)

    return () => {
      observer.disconnect()
      instance.remove()
      instanceRef.current = null
      setMap(null)
    }
  }, [])

  // Handle location update
  useEffect(() => {
    if (!map) return
    if (!location) {
      map.jumpTo({ center: [80.5, 22], zoom: 3.5 })
      return
    }

    const marker = new maplibregl.Marker({ color: '#EA762B' })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    marker.getElement().setAttribute('aria-label', `Selected location: ${location.name}`)

    if (location.bounds) {
      map.fitBounds(location.bounds, { padding: 40, maxZoom: 10, duration: 0 })
    } else {
      map.jumpTo({ center: [location.longitude, location.latitude], zoom: 10 })
    }

    return () => {
      marker.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  // Fit to selected ward polygon
  useEffect(() => {
    if (!map || !geojson || !selectedWardId) return
    const f = geojson.features.find((feat) => feat.properties.ward_id === selectedWardId)
    const bounds = f ? bboxOf([f]) : null
    if (bounds) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 })
    }
  }, [map, geojson, selectedWardId])

  // Resource / POI Layer: Water stations, Commercial AC buildings & Nearby hospitals
  useEffect(() => {
    if (!map) return
    if (!map.getSource('help')) {
      map.addSource('help', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 35,
      })

      map.addLayer({
        id: 'help-clusters',
        type: 'circle',
        source: 'help',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#EA762B',
          'circle-radius': 16,
          'circle-stroke-color': '#0B0907',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'help-cluster-count',
        type: 'symbol',
        source: 'help',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 11,
        },
        paint: {
          'text-color': '#FFFFFF',
        },
      })

      map.addLayer({
        id: 'help-points',
        type: 'circle',
        source: 'help',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'water',
            '#38BDF8', // Cyan/sky blue for water cooling stations
            'cooling',
            '#F59E0B', // Amber/gold for commercial AC buildings
            'medical',
            '#EF4444', // Red for nearby hospitals
            'pharmacy',
            '#10B981',
            'shelter',
            '#8B5CF6',
            '#EA762B',
          ],
          'circle-radius': ['case', ['==', ['get', 'id'], selectedResourceId ?? ''], 11, 7.5],
          'circle-stroke-color': '#0B0907',
          'circle-stroke-width': 1.8,
        },
      })
    }

    const source = map.getSource('help') as GeoJSONSource
    source.setData({
      type: 'FeatureCollection',
      features: displayedResources.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: {
          id: r.id,
          category: r.category,
          name: r.name,
          address: r.address ?? '',
          openingHours: r.openingHours ?? '',
          verification: r.verification,
        },
      })),
    })

    map.setPaintProperty('help-points', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], selectedResourceId ?? ''],
      11,
      7.5,
    ])
  }, [map, displayedResources, selectedResourceId])

  // Click & popup handlers for Help POIs
  useEffect(() => {
    if (!map) return

    const click = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id
      const resource = displayedResources.find((r) => r.id === id)
      if (!resource) return
      onResourceSelect?.(resource)

      const catLabel =
        resource.category === 'water'
          ? '💧 Water Cooling Station'
          : resource.category === 'cooling'
          ? '❄️ Commercial AC & Cooling'
          : resource.category === 'medical'
          ? '🏥 Nearby Hospital / Clinic'
          : resource.category

      const catColor =
        resource.category === 'water'
          ? '#38BDF8'
          : resource.category === 'cooling'
          ? '#F59E0B'
          : '#EF4444'

      const html = `
        <div class="tapas-poi-popup" style="padding: 2px; font-family: sans-serif; min-width: 190px;">
          <div style="font-weight: 700; font-size: 13px; color: #F2E3CC; margin-bottom: 4px; line-height: 1.25;">
            ${resource.name}
          </div>
          <div style="display: inline-block; font-size: 10px; font-weight: 600; color: ${catColor}; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; border: 1px solid ${catColor}60; margin-bottom: 6px;">
            ${catLabel}
          </div>
          ${resource.address ? `<div style="font-size: 11px; color: #C4A986; margin-bottom: 4px;">${resource.address}</div>` : ''}
          ${resource.openingHours ? `<div style="font-size: 10px; color: #8A7359;">Hours: ${resource.openingHours}</div>` : ''}
          <div style="font-size: 9px; color: #8A7359; margin-top: 6px; border-top: 1px solid #322619; padding-top: 4px;">
            ${resource.verification === 'authority-listed' ? '✓ Verified Municipal Network' : 'OpenStreetMap Mapped'}
          </div>
        </div>
      `
      new maplibregl.Popup({ offset: 12, closeButton: true })
        .setLngLat([resource.longitude, resource.latitude])
        .setHTML(html)
        .addTo(map)
    }

    const cluster = (event: MapLayerMouseEvent) => {
      const f = event.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const center = f.geometry.coordinates as [number, number]
      void (map.getSource('help') as GeoJSONSource)
        .getClusterExpansionZoom(Number(f.properties?.cluster_id))
        .then((zoom) => {
          if (instanceRef.current === map) map.easeTo({ center, zoom, duration: 250 })
        })
        .catch(() => {})
    }

    const setCursorPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const resetCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', 'help-points', click)
    map.on('click', 'help-clusters', cluster)
    map.on('mouseenter', 'help-points', setCursorPointer)
    map.on('mouseleave', 'help-points', resetCursor)
    map.on('mouseenter', 'help-clusters', setCursorPointer)
    map.on('mouseleave', 'help-clusters', resetCursor)

    return () => {
      map.off('click', 'help-points', click)
      map.off('click', 'help-clusters', cluster)
      map.off('mouseenter', 'help-points', setCursorPointer)
      map.off('mouseleave', 'help-points', resetCursor)
      map.off('mouseenter', 'help-clusters', setCursorPointer)
      map.off('mouseleave', 'help-clusters', resetCursor)
    }
  }, [map, displayedResources, onResourceSelect])

  // Fly to selected resource
  useEffect(() => {
    const resource = activePool.find((r) => r.id === selectedResourceId)
    if (!map || !resource) return
    map.easeTo({ center: [resource.longitude, resource.latitude], zoom: 15, duration: 300 })
    const content = document.createElement('div')
    content.textContent = `${resource.name} · ${resource.category}`
    content.className = 'text-xs p-1 font-semibold text-[#F2E3CC]'
    const popup = new maplibregl.Popup({ offset: 10 })
      .setLngLat([resource.longitude, resource.latitude])
      .setDOMContent(content)
      .addTo(map)
    return () => {
      popup.remove()
    }
  }, [map, activePool, selectedResourceId])

  return (
    <div
      id="heat-map"
      data-testid="heat-map"
      className={cn(
        'relative flex h-full w-full min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] shadow-2xl',
        className
      )}
    >
      <div className="relative min-h-0 flex-1">
        <div
          ref={container}
          className="h-full w-full min-h-[500px]"
          aria-label={`Heat Risk Map for ${location?.name ?? 'India'}`}
        />

        {/* OVERLAY PANEL 1: Top-Left Layer Selector & Dedicated Resource Toggles */}
        <div className="absolute left-3 top-3 z-10 max-w-[310px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 p-3.5 text-xs shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
            <span className="font-bold text-[var(--text-primary)] text-sm truncate">
              {location?.name ?? 'India National Overview'}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
            {selectedDate} · Live Polka Dot Thermal Grid &amp; Response Network
          </p>

          <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={riskVisible}
                onChange={(e) => setRiskVisible(e.target.checked)}
                className="accent-[var(--accent)] rounded"
              />
              <span>Ward Risk Choropleth</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={waterVisible}
                onChange={(e) => setWaterVisible(e.target.checked)}
                className="accent-sky-400 rounded"
              />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400 shrink-0" aria-hidden="true" />
              <span>Water Cooling Stations ({counts.water})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={commercialVisible}
                onChange={(e) => setCommercialVisible(e.target.checked)}
                className="accent-amber-400 rounded"
              />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <span>Commercial AC Buildings ({counts.cooling})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={hospitalsVisible}
                onChange={(e) => setHospitalsVisible(e.target.checked)}
                className="accent-red-500 rounded"
              />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
              <span>Nearby Hospitals ({counts.medical})</span>
            </label>
          </div>
        </div>

        {/* OVERLAY PANEL 2: Top-Right Hottest Wards Ranking */}
        {hottestWards.length > 0 && (
          <div className="absolute right-3 top-3 z-10 hidden sm:block max-w-[260px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 p-3 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 mb-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                Highest Risk Wards
              </span>
              <span className="text-[10px] font-mono text-[var(--accent)]">Today</span>
            </div>

            <ol className="space-y-1.5">
              {hottestWards.map((w, i) => {
                const isSelected = w.ward_id === selectedWardId
                const color = w.risk_level ? RISK_COLORS[w.risk_level] : 'var(--text-muted)'
                return (
                  <li key={w.ward_id}>
                    <button
                      type="button"
                      onClick={() => onWardSelect(w.ward_id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors',
                        isSelected
                          ? 'bg-[var(--accent)] text-[var(--bg-base)] font-bold'
                          : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span className="truncate text-[11px]">
                        {i + 1}. {w.ward_name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.2 text-[9px] font-black shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#141009' : `${color}30`,
                          color: isSelected ? '#F6E7CF' : color,
                          border: `1px solid ${color}80`,
                        }}
                      >
                        L{w.risk_level ?? '?'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* OVERLAY PANEL 3: Bottom-Left Heat Risk Scale Legend */}
        <div className="absolute left-3 bottom-4 z-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 px-3 py-2 text-[10.5px] shadow-2xl backdrop-blur-md">
          <span className="block font-bold uppercase tracking-wider text-[9px] text-[var(--text-muted)] mb-1.5">
            Heat Risk Scale
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const col = RISK_COLORS[lvl as 1 | 2 | 3 | 4 | 5]
              return (
                <div key={lvl} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: col }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                    L{lvl}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {error ? (
          <p
            role="status"
            className="absolute inset-x-4 bottom-16 rounded-xl border border-[var(--risk-4)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--risk-4)]"
          >
            {error}
          </p>
        ) : null}

        <ul className="sr-only" data-testid="ward-risk-list">
          {wards.map((w) => (
            <li key={w.ward_id} data-ward-id={w.ward_id}>
              {w.ward_name} - {w.risk_level ? `Level ${w.risk_level}` : 'Risk unavailable'}
            </li>
          ))}
        </ul>
      </div>

      <ThermalLayer map={map} date={selectedDate} />
      {map ? (
        <WardLayer
          map={map}
          geojson={riskVisible ? geojson ?? EMPTY : EMPTY}
          risks={risks}
          selectedWardId={selectedWardId}
          onWardSelect={onWardSelect}
        />
      ) : null}
    </div>
  )
}

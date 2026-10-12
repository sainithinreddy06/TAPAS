'use client'

import { useEffect } from 'react'
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LngLatBoundsLike,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from 'maplibre-gl'
import maplibregl from 'maplibre-gl'

import { RISK_COLORS, RISK_LABELS, RISK_TEXT_COLORS } from '@/lib/constants'
import type { RiskLevel, WardCollection, WardRisk } from '@/lib/types'

export const WARD_SOURCE_ID = 'wards'
export const WARD_FILL_LAYER = 'ward-fills'
export const WARD_BORDER_LAYER = 'ward-borders'
export const WARD_SELECTED_LAYER = 'ward-selected'

/** Wards with no risk row yet render neutral grey rather than a false "Low". */
const NO_DATA_COLOR = '#6B5D4F'

const FILL_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'risk_level'],
  1,
  RISK_COLORS[1],
  2,
  RISK_COLORS[2],
  3,
  RISK_COLORS[3],
  4,
  RISK_COLORS[4],
  5,
  RISK_COLORS[5],
  NO_DATA_COLOR,
]

/** Copy of the polygons with the day's risk values folded into properties. */
export function mergeRiskIntoGeojson(
  geojson: WardCollection,
  risks: Map<string, WardRisk>,
): WardCollection {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const risk = risks.get(feature.properties.ward_id)
      return {
        ...feature,
        properties: {
          ...feature.properties,
          risk_level: risk?.risk_level,
          excess_deaths: risk?.excess_deaths,
          utci_max: risk?.utci_max,
        },
      }
    }),
  }
}

function walkCoordinates(
  coordinates: unknown,
  visit: (lng: number, lat: number) => void,
): void {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    visit(coordinates[0], coordinates[1])
    return
  }
  coordinates.forEach((child) => walkCoordinates(child, visit))
}

/** [west, south, east, north] for a set of ward features. */
export function bboxOf(features: WardCollection['features']): LngLatBoundsLike | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  features.forEach((feature) => {
    walkCoordinates(feature.geometry.coordinates, (lng, lat) => {
      west = Math.min(west, lng)
      east = Math.max(east, lng)
      south = Math.min(south, lat)
      north = Math.max(north, lat)
    })
  })

  if (!Number.isFinite(west) || !Number.isFinite(south)) return null
  return [
    [west, south],
    [east, north],
  ]
}

function popupHtml(name: string, level: RiskLevel | undefined): string {
  const safeName = name.replace(/[<>&]/g, '')
  if (!level) {
    return `<div class="text-xs"><div class="font-semibold">${safeName}</div><div style="color:#C8AD8C">No forecast for this day</div></div>`
  }
  return [
    '<div class="text-xs">',
    `<div class="font-semibold" style="margin-bottom:4px">${safeName}</div>`,
    `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;`,
    `background:${RISK_COLORS[level]};color:${RISK_TEXT_COLORS[level]}">`,
    `Level ${level} — ${RISK_LABELS[level]}</span>`,
    '</div>',
  ].join('')
}

export interface WardLayerProps {
  map: MapLibreMap
  geojson: WardCollection
  /** Risk rows for the selected day, keyed by ward_id. */
  risks: Map<string, WardRisk>
  selectedWardId: string | null
  onWardSelect: (wardId: string) => void
}

/**
 * Owns the ward GeoJSON source and its three layers.
 *
 * The source is added once. Every later risk update goes through
 * `setData` — re-adding the source would drop the layers above it and make
 * the map flash on every slider move.
 */
export function WardLayer({
  map,
  geojson,
  risks,
  selectedWardId,
  onWardSelect,
}: WardLayerProps) {
  // Create source + layers once per map instance.
  useEffect(() => {
    if (map.getSource(WARD_SOURCE_ID)) return

    map.addSource(WARD_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'ward_id',
    })

    const labelLayer = map.getStyle()?.layers?.find(
      (l) => l.type === 'symbol' || l.id === 'dark_labels' || l.id.includes('label')
    )?.id

    map.addLayer({
      id: WARD_FILL_LAYER,
      type: 'fill',
      source: WARD_SOURCE_ID,
      paint: {
        'fill-color': FILL_COLOR,
        'fill-opacity': 0.35,
      },
    }, labelLayer)

    map.addLayer({
      id: WARD_BORDER_LAYER,
      type: 'line',
      source: WARD_SOURCE_ID,
      paint: {
        'line-color': '#0E0B08',
        'line-width': 0.8,
      },
    }, labelLayer)

    map.addLayer({
      id: WARD_SELECTED_LAYER,
      type: 'line',
      source: WARD_SOURCE_ID,
      filter: ['==', ['get', 'ward_id'], ''],
      paint: {
        'line-color': '#F4E4CC',
        'line-width': 2.5,
      },
    }, labelLayer)
  }, [map])

  // Repaint when the day changes. Data only — layers stay put.
  useEffect(() => {
    const source = map.getSource(WARD_SOURCE_ID) as GeoJSONSource | undefined
    if (!source?.setData) return
    source.setData(
      mergeRiskIntoGeojson(geojson, risks) as unknown as GeoJSON.FeatureCollection,
    )
    // A map mounted in a hidden tab or collapsed panel gets its animation
    // frames throttled and can miss the paint entirely; asking for one costs
    // nothing and guarantees the new colours land.
    map.triggerRepaint()
  }, [map, geojson, risks])

  // Highlight the selected ward.
  useEffect(() => {
    if (!map.getLayer(WARD_SELECTED_LAYER)) return
    map.setFilter(WARD_SELECTED_LAYER, [
      '==',
      ['get', 'ward_id'],
      selectedWardId ?? '',
    ])
  }, [map, selectedWardId])

  // Click, hover tooltip, and cursor affordance.
  useEffect(() => {
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
    })

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const wardId = feature?.properties?.ward_id
      if (typeof wardId === 'string') onWardSelect(wardId)
    }

    const handleMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature) return
      map.getCanvas().style.cursor = 'pointer'
      const props = feature.properties ?? {}
      const level = props.risk_level as RiskLevel | undefined
      popup
        .setLngLat(event.lngLat)
        .setHTML(popupHtml(String(props.name ?? 'Ward'), level))
        .addTo(map)
    }

    const handleLeave = () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    }

    map.on('click', WARD_FILL_LAYER, handleClick)
    map.on('mousemove', WARD_FILL_LAYER, handleMove)
    map.on('mouseleave', WARD_FILL_LAYER, handleLeave)

    return () => {
      map.off('click', WARD_FILL_LAYER, handleClick)
      map.off('mousemove', WARD_FILL_LAYER, handleMove)
      map.off('mouseleave', WARD_FILL_LAYER, handleLeave)
      popup.remove()
    }
  }, [map, onWardSelect, risks, geojson])

  return null
}

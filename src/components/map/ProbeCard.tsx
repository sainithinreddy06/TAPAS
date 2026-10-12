'use client'

import { colourCss, stressLabel, type HeatMetric } from '@/lib/map/colormap'
import { X } from 'lucide-react'

export interface ProbeCardProps {
  lat: number
  lon: number
  value: number | null
  metric: HeatMetric
  nearest: {
    temperature?: number | null
    mrt?: number | null
    humidity?: number | null
    wind?: number | null
    heatIndex?: number | null
    apparent?: number | null
  } | null
  distanceKm: number | null
  placeName?: string
  validTime: string
  onClose?: () => void
  isPinned?: boolean
  className?: string
}

export function ProbeCard({
  lat,
  lon,
  value,
  metric,
  nearest,
  distanceKm,
  placeName,
  validTime,
  onClose,
  isPinned = false,
  className = '',
}: ProbeCardProps) {
  const metricShort = metric === 'utci' ? 'UTCI' : metric === 'heat_index' ? 'HI' : 'AIR'
  const headlineColor = value != null ? colourCss(value, metric) : 'var(--ink-high)'
  const latStr = `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`

  return (
    <div
      className={`rounded-[10px] border border-[var(--line-soft,#3F3122)] bg-[var(--surface-3,#2E251C)] p-3 text-[var(--ink-mid,#C4A986)] shadow-2xl backdrop-blur-md min-w-[270px] max-w-[320px] ${className}`}
      style={{ fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
    >
      {/* Header: Coordinates & Place name */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--line-hair,#322619)]">
        <div>
          <div className="font-mono text-[11px] font-semibold text-[var(--ink-high,#F2E3CC)] tracking-tight">
            {latStr}, {lonStr}
          </div>
          <div className="text-[11px] text-[var(--ink-low,#8A7359)] truncate max-w-[220px]">
            {placeName ? `near ${placeName}` : 'Subcontinent model grid'}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-[var(--ink-low,#8A7359)] hover:text-[var(--ink-high,#F2E3CC)] hover:bg-[var(--surface-2,#221B15)] transition-colors"
            aria-label="Dismiss card"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Headline: Thermal Stress (28px tabular-nums risk-coloured) */}
      <div className="py-2.5 border-b border-[var(--line-hair,#322619)]">
        <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[var(--ink-low,#8A7359)] mb-1">
          THERMAL STRESS {isPinned && <span className="text-[var(--accent)] font-normal ml-1">· PINNED</span>}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div
            className="text-[26px] sm:text-[28px] font-extrabold font-mono tabular-nums leading-none tracking-tight"
            style={{ color: headlineColor }}
          >
            {value != null ? value.toFixed(1) : '—'}{' '}
            <span className="text-[14px] font-bold text-[var(--ink-high,#F2E3CC)]">°C {metricShort}</span>
          </div>
          <span
            className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded border border-[var(--line-soft,#3F3122)] bg-[var(--surface-2,#221B15)] shrink-0"
            style={{ color: headlineColor }}
          >
            {stressLabel(value, metric)}
          </span>
        </div>
      </div>

      {/* Secondary Values (from nearest sample point) */}
      <div className="py-2 border-b border-[var(--line-hair,#322619)] space-y-1 text-[11px]">
        <div className="flex justify-between items-center text-[10px] text-[var(--ink-low,#8A7359)] mb-1 uppercase font-semibold tracking-wider">
          <span>Model Point Parameters</span>
          <span>Nearest Cell</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-mid,#C4A986)]">Air temperature</span>
          <span className="font-mono text-[var(--ink-high,#F2E3CC)] font-medium">
            {nearest?.temperature != null ? `${nearest.temperature.toFixed(1)} °C` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-mid,#C4A986)]">Mean radiant temp</span>
          <span className="font-mono text-[var(--ink-high,#F2E3CC)] font-medium">
            {nearest?.mrt != null
              ? `${nearest.mrt.toFixed(1)} °C`
              : nearest?.apparent != null
              ? `${(nearest.apparent * 1.15).toFixed(1)} °C`
              : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-mid,#C4A986)]">Relative humidity</span>
          <span className="font-mono text-[var(--ink-high,#F2E3CC)] font-medium">
            {nearest?.humidity != null ? `${nearest.humidity} %` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-mid,#C4A986)]">Wind speed</span>
          <span className="font-mono text-[var(--ink-high,#F2E3CC)] font-medium">
            {nearest?.wind != null ? `${nearest.wind.toFixed(1)} m/s` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--ink-mid,#C4A986)]">Feels like (HI)</span>
          <span className="font-mono text-[var(--ink-high,#F2E3CC)] font-medium">
            {nearest?.heatIndex != null ? `${nearest.heatIndex.toFixed(1)} °C` : '—'}
          </span>
        </div>
      </div>

      {/* Honest Disclosure & Valid Date */}
      <div className="pt-2 text-[10px] text-[var(--ink-low,#8A7359)] leading-relaxed">
        <div>
          Interpolated · nearest model point{' '}
          <strong className="text-[var(--ink-high,#F2E3CC)] font-mono">
            {distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}
          </strong>{' '}
          · ECMWF via Open-Meteo
        </div>
        <div className="mt-0.5 font-medium text-[var(--accent)]">{validTime}</div>
      </div>
    </div>
  )
}

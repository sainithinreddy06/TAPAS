'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { WBGT_BANDS, WBGT_BAND_ORDER } from '@/lib/constants'
import type { OccupationalHour, WbgtBand } from '@/lib/types'
import { cn, formatTemp, hourLabel } from '@/lib/utils'

export const validWbgtBand = (value: unknown): value is WbgtBand =>
  value === 'safe' || value === 'caution' || value === 'warning' || value === 'danger'

export function validWorkRest(work: unknown, rest: unknown): boolean {
  return typeof work === 'number' && typeof rest === 'number' &&
    Number.isFinite(work) && Number.isFinite(rest) &&
    work >= 0 && rest >= 0 && work <= 100 && rest <= 100 &&
    Math.abs(work + rest - 100) < 0.01
}

interface Bar24 extends OccupationalHour { label: string }
export interface WbgtChartProps { hourly: OccupationalHour[]; className?: string }

/** Display supplied measurements and classifications; do not derive a work permit. */
export function WbgtChart({ hourly, className }: WbgtChartProps) {
  const data = useMemo<Bar24[]>(() => hourly
    .filter((h) => Number.isInteger(h.hour) && h.hour >= 0 && h.hour < 24)
    .map((h) => ({ ...h, wbgt: typeof h.wbgt === 'number' && Number.isFinite(h.wbgt) ? h.wbgt : null, label: hourLabel(h.hour) })), [hourly])
  const measurements = data.map((d) => d.wbgt).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (!measurements.length) return <p className={cn('text-sm tapas-subtext', className)}>No WBGT forecast available for this location and day.</p>

  return (
    <div className={cn('w-full min-w-0', className)} data-testid="wbgt-chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#3A2718" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#C8AD8C' }} tickLine={false}
            axisLine={{ stroke: '#3A2718' }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[Math.min(0, Math.floor(Math.min(...measurements) - 2)), Math.ceil(Math.max(...measurements) + 2)]}
            tick={{ fontSize: 11, fill: '#C8AD8C' }} tickLine={false} axisLine={false} width={48} unit="°C" />
          <Tooltip cursor={{ fill: 'rgba(244,228,204,0.06)' }} content={<WbgtTooltip />} />
          <Bar dataKey="wbgt" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {data.map((entry) => <Cell key={entry.hour}
              fill={validWbgtBand(entry.band) ? WBGT_BANDS[entry.band].color : '#6B5D4F'}
              aria-label={`${entry.label}, ${formatTemp(entry.wbgt)}, ${validWbgtBand(entry.band) ? entry.band : 'classification unavailable'}`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] tapas-subtext">
        {WBGT_BAND_ORDER.map((band) => (
          <li key={band} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: WBGT_BANDS[band].color }} aria-hidden="true" />
            {WBGT_BANDS[band].label} (supplied classification)
          </li>
        ))}
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[#6B5D4F]" aria-hidden="true" />Classification unavailable</li>
      </ul>
      {measurements.length !== data.length ? <p className="mt-2 text-xs tapas-subtext">Some hourly WBGT values are unavailable; gaps are not zero.</p> : null}
      <p className="mt-2 text-xs tapas-subtext">Bands and work/rest recommendations require source methodology and a site-specific assessment. No schedule is inferred from missing information.</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer py-2 font-medium">Hourly values and supplied work/rest guidance</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left"><thead><tr><th className="p-2">Time</th><th className="p-2">WBGT</th><th className="p-2">Work / rest</th></tr></thead>
            <tbody>{data.map((point) => <tr key={point.hour} className="border-t border-border"><td className="p-2">{point.label}</td><td className="p-2">{formatTemp(point.wbgt)}</td><td className="p-2">{validWorkRest(point.work_pct, point.rest_pct) ? `${point.work_pct}% / ${point.rest_pct}%` : 'Unavailable'}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

function WbgtTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Bar24 }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const band = validWbgtBand(point.band) ? WBGT_BANDS[point.band] : null
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 shadow-md">
      <p className="text-xs font-semibold">{point.label}</p>
      <p className="mt-1 text-xs">WBGT <strong>{formatTemp(point.wbgt)}</strong></p>
      <p className="text-[11px] font-medium" style={{ color: band?.color }}>{band?.label ?? 'Classification unavailable'}</p>
      <p className="text-[11px] tapas-subtext">{validWorkRest(point.work_pct, point.rest_pct) ? `${point.work_pct}% work / ${point.rest_pct}% rest` : 'Work/rest guidance unavailable'}</p>
    </div>
  )
}

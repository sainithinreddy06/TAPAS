'use client'

import { useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RISK_COLORS } from '@/lib/constants'
import type { ForecastHour } from '@/lib/types'
import { cn, formatTemp } from '@/lib/utils'

interface Point {
  idx: number
  time: string
  label: string
  fullLabel: string
  utci: number | null
  baseline: number | null
  exceedance: number | null
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function forecastDate(time: string, timezone = 'Asia/Kolkata'): string | null {
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function forecastPoints(hourly: ForecastHour[], selectedDate?: string, timezone = 'Asia/Kolkata'): Point[] {
  return hourly
    .filter((hour) => {
      const date = forecastDate(hour.time, timezone)
      return date !== null && (!selectedDate || date === selectedDate)
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .map((hour, idx) => {
      const utci = finite(hour.utci) ? hour.utci : null
      const baseline = finite(hour.baseline_p97) ? hour.baseline_p97 : null
      const date = new Date(hour.time)
      return {
        idx, time: hour.time, utci, baseline,
        exceedance: utci !== null && baseline !== null ? Math.max(0, utci - baseline) : null,
        label: date.toLocaleTimeString('en-IN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }),
        fullLabel: date.toLocaleString('en-IN', { timeZone: timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
      }
    })
}

export interface UtciChartProps {
  hourly: ForecastHour[]
  baselineP97?: number | null
  selectedDate?: string
  timezone?: string
  className?: string
}

export function UtciChart({ hourly, baselineP97, selectedDate, timezone = 'Asia/Kolkata', className }: UtciChartProps) {
  const data = useMemo(() => forecastPoints(hourly, selectedDate, timezone), [hourly, selectedDate, timezone])
  const values = data.flatMap((point) => [point.utci, point.baseline]).filter(finite)
  if (!data.length || !data.some((point) => point.utci !== null)) return (
    <p className={cn('text-xs tapas-subtext', className)}>Hourly UTCI forecast unavailable for {selectedDate ?? 'this period'} ({timezone}).</p>
  )
  const baselineAvailable = data.some((point) => point.baseline !== null)
  return (
    <div className={cn('w-full min-w-0', className)} data-testid="utci-chart">
      <p className="mb-1 text-[11px] tapas-subtext">{data[0].fullLabel} – {data[data.length - 1].fullLabel} · {timezone}</p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#3A2718" vertical={false} />
          <XAxis dataKey="idx" tickFormatter={(idx: number) => data[idx]?.label ?? ''} tick={{ fontSize: 11, fill: '#C8AD8C' }}
            tickLine={false} axisLine={{ stroke: '#3A2718' }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[Math.floor(Math.min(...values) - 2), Math.ceil(Math.max(...values) + 2)]}
            tick={{ fontSize: 11, fill: '#C8AD8C' }} tickLine={false} axisLine={false} width={48} unit="°C" />
          <Tooltip content={<UtciTooltip timezone={timezone} />} />
          <Area dataKey="baseline" stackId="gap" stroke="none" fill="none" fillOpacity={0} isAnimationActive={false} legendType="none" connectNulls={false} />
          <Area dataKey="exceedance" stackId="gap" stroke="none" fill={RISK_COLORS[4]} fillOpacity={0.22} isAnimationActive={false} legendType="none" connectNulls={false} />
          <Line dataKey="baseline" name="Supplied 97th-percentile baseline" stroke="#927B66" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls={false} />
          <Line dataKey="utci" name="UTCI forecast" stroke={RISK_COLORS[4]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] tapas-subtext">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-[var(--risk-4)]" />UTCI forecast</span>
        {baselineAvailable ? <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed border-[#927B66]" />Supplied hourly 97th-percentile baseline</span> : <span>Hourly baseline unavailable; comparison not shown</span>}
      </div>
      {finite(baselineP97) ? <p className="mt-1 text-[11px] tapas-subtext">Supplied daily baseline: {formatTemp(baselineP97)}. Hourly gaps remain unavailable.</p> : null}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer py-2 font-medium">Forecast values as a table</summary>
        <div className="overflow-x-auto"><table className="w-full text-left">
          <thead><tr><th className="p-2">Time ({timezone})</th><th className="p-2">UTCI</th><th className="p-2">Baseline</th></tr></thead>
          <tbody>{data.map((point) => <tr key={point.time} className="border-t border-border"><td className="p-2">{point.fullLabel}</td><td className="p-2">{formatTemp(point.utci)}</td><td className="p-2">{formatTemp(point.baseline)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  )
}

function UtciTooltip({ active, payload, timezone }: { active?: boolean; payload?: { payload?: Point }[]; timezone: string }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const delta = point.utci !== null && point.baseline !== null ? point.utci - point.baseline : null
  return (
    <div className="max-w-[16rem] rounded-md border border-border bg-card px-2.5 py-2 shadow-md">
      <p className="text-xs font-semibold">{point.fullLabel} · {timezone}</p>
      <p className="mt-1 text-xs">UTCI <strong>{formatTemp(point.utci)}</strong></p>
      <p className="text-[11px] tapas-subtext">Baseline {formatTemp(point.baseline)}</p>
      {delta !== null ? <p className="mt-1 text-[11px] font-medium">{Math.abs(delta).toFixed(1)}°C {delta >= 0 ? 'above' : 'below'} supplied baseline</p> : null}
    </div>
  )
}

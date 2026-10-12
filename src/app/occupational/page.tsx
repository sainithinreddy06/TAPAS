'use client'
import { WeatherKpis } from '@/components/weather/WeatherKpis'
import { Precautions } from '@/components/help/Precautions'
import { useWeather } from '@/hooks/useWeather'
import { weatherReading } from '@/lib/weather'
import { heatIndexCelsius } from '@/lib/thermal'
import { DataStatus } from '@/components/data/DataStatus'

import { Printer } from 'lucide-react'
import { LocationSearch } from '@/components/location/LocationSearch'
import { useLocation } from '@/components/providers/LocationProvider'
import { WbgtChart } from '@/components/occupational/WbgtChart'
import { ScheduleTable } from '@/components/occupational/ScheduleTable'
import { Button } from '@/components/ui/button'
import { useOccupational } from '@/hooks/useWard'
import { useRiskMap } from '@/hooks/useRiskMap'
import { longDate, cn } from '@/lib/utils'
import { WardSelector } from '@/components/ward/WardSelector'

export default function OccupationalPage() {
  const { location, selectedWardId, selectWard, selectedDate, setSelectedDate, dates } = useLocation()
  const weather = useWeather(), reading = weatherReading(weather.data).reading
  const riskMap = useRiskMap(selectedDate)
  const wards = riskMap.data && riskMap.data.date === selectedDate ? riskMap.data.wards : []
  const { data, isPending, isError, error } = useOccupational(selectedWardId, selectedDate)
  const matched = data?.ward_id === selectedWardId && data?.date === selectedDate ? data : undefined
  const wardName = matched?.ward_name ?? wards.find((ward) => ward.ward_id === selectedWardId)?.ward_name ?? selectedWardId
  const state = !location || !selectedWardId ? 'unavailable' : isPending ? 'loading' : isError ? 'error' : matched ? 'ready' : 'unavailable'

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Occupational heat exposure — work/rest schedule</h1>
        <p className="mt-1 text-xs tapas-subtext">Hourly WBGT and supplied work/rest guidance for outdoor workers. {longDate(selectedDate)} · {location?.timezone ?? 'Asia/Kolkata'}</p>
      </header>
      <div className="no-print mb-4 space-y-3">
        <LocationSearch />
        <div className="flex flex-wrap items-start gap-4">
          <WardSelector
            wards={wards.map((w) => ({ ward_id: w.ward_id, ward_name: w.ward_name, risk_level: w.risk_level }))}
            selectedWardId={selectedWardId}
            onSelectWard={selectWard}
            label="Covered ward"
            className="flex-1 min-w-[280px]"
          />

          <div className="flex flex-col gap-1 text-xs font-medium">
            <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)] mb-0.5">Forecast date</span>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] p-1">
              {(dates.includes(selectedDate) ? dates : [...dates, selectedDate].sort()).map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors font-variant-numeric tabular-nums',
                    date === selectedDate
                      ? 'bg-[var(--surface-3)] text-[var(--ink-high)] border border-[var(--accent)] font-semibold'
                      : 'text-[var(--ink-mid)] hover:text-[var(--ink-high)] hover:bg-[var(--surface-1)]'
                  )}
                >
                  {longDate(date)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="print-page space-y-4"><WeatherKpis /><Precautions heatIndex={heatIndexCelsius(reading?.temperature, reading?.humidity)} selectedDate={selectedDate} />
        <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Hourly WBGT — {wardName || location?.name || 'choose a location'}</h2>
            <span className="text-xs tapas-subtext">{longDate(selectedDate)}</span>
          </div>
          {state === 'loading' ? <p className="py-8 text-center text-sm tapas-subtext">Loading WBGT forecast…</p>
            : state === 'error' ? <p role="status" className="py-8 text-center text-sm text-[var(--risk-4)]">{error instanceof Error ? error.message : 'WBGT forecast unavailable for this location and date.'}</p>
            : <WbgtChart hourly={matched?.hourly ?? []} />}
          <DataStatus label="Occupational guidance" provenance={matched?.provenance} />
        </div>
        <ScheduleTable data={matched} state={state} />
        <p className="text-xs tapas-subtext">WBGT depends on working conditions and exposure. Supplied guidance needs site-specific review; unavailable data does not establish safe working conditions.</p>
      </div>
      <div className="no-print mt-4">
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Download schedule PDF</Button>
        <p className="mt-1.5 text-[11px] tapas-subtext">Opens the browser print dialog — choose “Save as PDF”. Date and source status are included.</p>
      </div>
    </div>
  )
}

'use client'

import { Slider } from '@/components/ui/slider'
import { RiskSwatch } from '@/components/risk/RiskBadge'
import { LEGEND_NOTE, RISK_LABELS, RISK_LEVELS } from '@/lib/constants'
import { cn, dayLabel, longDate, shortDate } from '@/lib/utils'

export interface MapControlsProps {
  dates: string[]
  selectedDate: string
  onDateChange: (date: string) => void
  className?: string
}

/** Day slider and colour legend, stacked under the map. */
export function MapControls({
  dates,
  selectedDate,
  onDateChange,
  className,
}: MapControlsProps) {
  dates = dates.includes(selectedDate) ? dates : [...dates, selectedDate].sort()
  const index = Math.max(0, dates.indexOf(selectedDate))

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
            Forecast day
          </h3>
          <p className="text-xs font-medium">{longDate(selectedDate)}</p>
        </div>

        <Slider
          className="mt-3"
          aria-label="Forecast day"
          value={[index]}
          min={0}
          max={Math.max(0, dates.length - 1)}
          step={1}
          onValueChange={([next]) => {
            const date = dates[next]
            if (date) onDateChange(date)
          }}
        />

        <div className="mt-2 flex justify-between gap-1">
          {dates.map((date, i) => {
            const active = date === selectedDate
            return (
              <button
                key={date}
                type="button"
                onClick={() => onDateChange(date)}
                aria-pressed={active}
                data-testid={`day-tick-${i}`}
                className={cn(
                  'min-h-11 flex-1 rounded px-1 py-1 text-center text-[11px] leading-tight transition-colors',
                  active
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'tapas-subtext hover:bg-secondary/60',
                )}
              >
                <span className="block">{dayLabel(date, i)}</span>
                <span className="block text-[10px] opacity-70">
                  {shortDate(date)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="rounded-lg border border-border bg-card p-3"
        data-testid="map-legend"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
          Risk level
        </h3>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {RISK_LEVELS.map((level) => (
            <li key={level} className="flex items-center gap-1.5">
              <RiskSwatch level={level} />
              <span className="text-xs">
                <span className="font-medium">{level}</span>{' '}
                {RISK_LABELS[level]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] tapas-subtext">{LEGEND_NOTE}</p>
      </div>
    </div>
  )
}

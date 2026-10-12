'use client'

import { Moon } from 'lucide-react'

import { RiskBadge } from '@/components/risk/RiskBadge'
import { DeathsInline } from '@/components/risk/DeathsDisplay'
import type { WardRisk } from '@/lib/types'
import { cn, shortDate } from '@/lib/utils'

export interface RiskStripProps {
  days: WardRisk[]
  selectedDate: string
  onDaySelect: (date: string) => void
  className?: string
}

/**
 * The 5-day outlook for one ward. Clicking a column moves the whole dashboard
 * — map included — to that day, so the strip doubles as navigation.
 */
export function RiskStrip({
  days,
  selectedDate,
  onDaySelect,
  className,
}: RiskStripProps) {
  if (days.length === 0) {
    return (
      <p className={cn('text-xs tapas-subtext', className)}>
        No multi-day outlook available for this ward.
      </p>
    )
  }

  return (
    <div
      className={cn('flex gap-1.5 overflow-x-auto pb-2', className)}
      data-testid="risk-strip"
    >
      {[...days].sort((a, b) => a.date.localeCompare(b.date)).map((day) => {
        const selected = day.date === selectedDate

        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onDaySelect(day.date)}
            aria-pressed={selected}
            aria-label={`${shortDate(day.date)}, ${day.risk_level === null ? 'risk unavailable' : `level ${day.risk_level}`}`}
            className={cn(
              'min-w-[7rem] flex-1 rounded-md border p-1.5 text-center transition-all',
              selected
                ? 'border-foreground/40 bg-secondary shadow-sm'
                : 'border-transparent hover:bg-secondary/60',
            )}
          >
            <span className="flex items-center justify-center gap-1 text-[11px] font-medium tapas-subtext">
              {shortDate(day.date)}
              {day.hot_night ? (
                <Moon
                  className="h-3 w-3 text-[var(--risk-4)]"
                  aria-label="Hot night"
                />
              ) : null}
            </span>

            <RiskBadge
              level={day.risk_level}
              size="sm"
              compact
              block
              className="mt-1 py-1.5"
            />

            <DeathsInline value={day.excess_deaths} low={day.excess_deaths_low} high={day.excess_deaths_high} className="mt-1 block text-[10px] leading-tight" />
          </button>
        )
      })}
    </div>
  )
}

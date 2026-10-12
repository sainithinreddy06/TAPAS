'use client'

import { Activity, TrendingUp } from 'lucide-react'
import type { PatientHealthSignal } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PatientLoadCardProps {
  data?: PatientHealthSignal | null
  className?: string
}

export function PatientLoadCard({ data, className }: PatientHealthSignalCardProps) {
  const signal = data || {
    id: 'pat-default',
    ward_id: 'default',
    name: 'Ward Surveillance Cluster',
    latitude: 17.49,
    longitude: 78.4,
    status: 'Elevated Heat Inflow',
    source: 'Integrated Disease Surveillance Programme (IDSP) Demo Mock',
    is_demo: true,
    updated_at: new Date().toISOString(),
    today_count: 37,
    yesterday_count: 31,
    seven_day_avg: 22.0,
    surge_percentage: 68.2,
    surge_level: 'HIGH' as const,
    history_14d: [
      { date: '08-27', count: 18 },
      { date: '08-28', count: 19 },
      { date: '08-29', count: 21 },
      { date: '08-30', count: 20 },
      { date: '08-31', count: 22 },
      { date: '09-01', count: 24 },
      { date: '09-02', count: 23 },
      { date: '09-03', count: 25 },
      { date: '09-04', count: 27 },
      { date: '09-05', count: 26 },
      { date: '09-06', count: 28 },
      { date: '09-07', count: 30 },
      { date: '09-08', count: 31 },
      { date: '09-09', count: 37 },
    ],
  }

  const maxCount = Math.max(...signal.history_14d.map((d) => d.count), 40)

  return (
    <div className={cn('hairline-grid', className)}>
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-4)] text-[var(--bg-base)]">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 className="metric-label text-[var(--text-secondary)]">
              Heat-Related Patient Load
            </h3>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Observed health-facility heat admissions and dehydration caseload surge index.
        </p>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="hairline-cell p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            <span className="text-[10px] uppercase text-[var(--text-muted)] block">Today</span>
            <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)] mt-1 block">
              {signal.today_count}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Reported admissions</span>
          </div>

          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            <span className="text-[10px] uppercase text-[var(--text-muted)] block">Yesterday</span>
            <span className="text-2xl font-bold tabular-nums text-[var(--text-secondary)] mt-1 block">
              {signal.yesterday_count}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Prior day total</span>
          </div>

          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            <span className="text-[10px] uppercase text-[var(--text-muted)] block">7-day average</span>
            <span className="text-2xl font-bold tabular-nums text-[var(--text-secondary)] mt-1 block">
              {signal.seven_day_avg.toFixed(0)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Baseline mean</span>
          </div>

          <div className="rounded border border-[var(--risk-4)] bg-[var(--risk-5)]/20 p-3">
            <span className="text-[10px] uppercase font-bold text-[var(--risk-4)] block">Surge Index</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold tabular-nums text-[var(--risk-4)]">
                +{signal.surge_percentage.toFixed(0)}%
              </span>
              <span className="rounded bg-[var(--risk-4)] px-1.5 py-0.5 text-[9px] font-black text-white">
                {signal.surge_level}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">Vs 7-day mean</span>
          </div>
        </div>

        {/* 14-day Trend Sparkline Bars */}
        <div className="mt-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2.5">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />
              14-Day Admission Trend
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Peak: {signal.today_count} cases
            </span>
          </div>

          <div className="flex items-end gap-1.5 h-24 pt-2">
            {signal.history_14d.map((item, idx) => {
              const heightPct = Math.max(12, Math.round((item.count / maxCount) * 100))
              const isToday = idx === signal.history_14d.length - 1

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      isToday
                        ? 'bg-[var(--risk-4)] shadow-[0_0_8px_rgba(211,68,63,0.5)]'
                        : idx > 9
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--text-muted)]/40 group-hover:bg-[var(--text-secondary)]'
                    )}
                    style={{ height: `${heightPct}%` }}
                    title={`${item.date}: ${item.count} cases`}
                  />
                  <span className="text-[9px] text-[var(--text-muted)] tabular-nums truncate w-full text-center">
                    {item.date.slice(-2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Provenance */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>Feeds into the ward health-risk signal as an observed biostatistical indicator.</span>
        <span>Designed for direct integration with IDSP / state health data exchange.</span>
      </div>
    </div>
  )
}

type PatientHealthSignalCardProps = PatientLoadCardProps

'use client'
import { DataStatus } from '@/components/data/DataStatus'

import { AlertTriangle, Moon } from 'lucide-react'

import { DeathsInline } from '@/components/risk/DeathsDisplay'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { useRiskRanking } from '@/hooks/useRiskMap'
import { cn, formatTemp, longDate } from '@/lib/utils'

export interface RiskRankingProps {
  date: string
  selectedWardId: string | null
  onSelect: (wardId: string) => void
  limit?: number
  className?: string
}

/**
 * Highest-risk wards for the selected day. This is the triage list — the thing
 * a duty officer reads first to decide where the day's effort goes.
 */
export function RiskRanking({
  date,
  selectedWardId,
  onSelect,
  limit = 10,
  className,
}: RiskRankingProps) {
  const { data, isLoading: isPending, isError, isFetching } = useRiskRanking(date, limit)
  const wards = data && data.date === date ? data.wards.filter((ward) => ward.date === date) : []

  return (
    <section
      className={cn('flex h-full flex-col', className)}
      aria-label="Ward risk ranking"
    >
      <header className="px-3 pb-2 pt-3">
        <h2 className="text-sm font-semibold">Highest risk wards</h2>
        <p className="text-xs tapas-subtext">{longDate(date)}</p>
        <DataStatus label="Ranking" provenance={data?.provenance} refreshing={isFetching} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isPending ? (
          <p className="px-1 py-4 text-xs tapas-subtext">Loading ranking…</p>
        ) : null}

        {isError ? (
          <p className="flex items-start gap-2 px-1 py-4 text-xs text-[var(--risk-4)]">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Ranking unavailable. Check the connection to the forecast service.
          </p>
        ) : null}

        {!isPending && !isError && wards.length === 0 ? (
          <p className="px-1 py-4 text-xs tapas-subtext">
            No wards ranked for this day.
          </p>
        ) : null}

        <ol className="space-y-1.5">
          {wards.map((ward, index) => {
            const selected = ward.ward_id === selectedWardId
            return (
              <li key={ward.ward_id}>
                <button
                  type="button"
                  onClick={() => onSelect(ward.ward_id)}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'w-full rounded-md border p-2 text-left transition-colors',
                    selected
                      ? 'border-foreground/40 bg-secondary'
                      : 'border-border bg-card hover:bg-secondary/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="text-xs font-semibold tapas-subtext">
                        {index + 1}.
                      </span>
                      <span className="break-words text-sm font-medium">
                        {ward.ward_name}
                      </span>
                    </span>
                    {ward.hot_night ? (
                      <Moon
                        className="h-3.5 w-3.5 shrink-0 text-[var(--risk-4)]"
                        aria-label="Hot night expected"
                      />
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <RiskBadge level={ward.risk_level} size="sm" compact />
                    <span className="text-[11px] tapas-subtext">
                      {formatTemp(ward.utci_max)} UTCI
                    </span>
                  </div>

                  <DeathsInline
                    value={ward.excess_deaths}
                    low={ward.excess_deaths_low}
                    high={ward.excess_deaths_high}
                    className="mt-1 block"
                  />
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

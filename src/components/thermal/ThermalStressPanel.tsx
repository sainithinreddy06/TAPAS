'use client'

import { Flame, Info, AlertTriangle } from 'lucide-react'
import type { HumanThermalStressBreakdown } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ThermalStressPanelProps {
  data?: HumanThermalStressBreakdown | null
  className?: string
}

export function ThermalStressPanel({ data, className }: ThermalStressPanelProps) {
  if (!data) {
    return (
      <div className={cn('hairline-grid', className)}>
        <div className="hairline-cell p-5">
          <span className="metric-label">Human Thermal Stress Index</span>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Thermal stress calculation is unavailable for this unselected location.
          </p>
        </div>
      </div>
    )
  }

  const { score_0_10, category, air_temp, rh, wind, mrt, felt_temperature, factors, why_high, method } = data

  const categoryColor =
    category === 'EXTREME'
      ? 'var(--risk-5)'
      : category === 'VERY HIGH'
      ? 'var(--risk-4)'
      : category === 'HIGH'
      ? 'var(--risk-3)'
      : category === 'MODERATE'
      ? 'var(--risk-2)'
      : 'var(--risk-1)'

  return (
    <section
      aria-label="Human Thermal Stress Index"
      className={cn('hairline-grid', className)}
    >
      {/* Header Band */}
      <div className="hairline-cell flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <Flame className="h-3 w-3" />
            </span>
            <h3 className="metric-label text-[var(--text-secondary)]">Human Thermal Stress Index</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Physiological biometeorological strain model
          </p>
        </div>

        <div className="flex items-baseline gap-3 text-right">
          <div className="metric-large" style={{ color: categoryColor }}>
            {score_0_10.toFixed(1)}{' '}
            <span className="text-xl font-medium text-[var(--text-muted)]">/ 10</span>
          </div>
          <span
            className="rounded px-2.5 py-1 text-xs font-bold tracking-wider"
            style={{ backgroundColor: `${categoryColor}25`, color: categoryColor, border: `1px solid ${categoryColor}60` }}
          >
            {category}
          </span>
        </div>
      </div>

      {/* Main Grid: Comparison & Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: Factor Contribution Breakdown */}
        <div className="hairline-cell border-b md:border-b-0 md:border-r border-[var(--border-subtle)] p-5 space-y-4">
          <span className="metric-label">Contributing Factors (UTCI Model)</span>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-medium text-[var(--text-primary)]">
                <span>Air temperature</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {air_temp.toFixed(1)} °C · contributes {factors.air_temp_pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${factors.air_temp_pct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[var(--text-primary)]">
                <span>Relative humidity</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {rh.toFixed(0)} % · contributes {factors.rh_pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--risk-3)]"
                  style={{ width: `${factors.rh_pct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[var(--text-primary)]">
                <span>Wind speed (cooling deficit)</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {wind.toFixed(1)} m/s · contributes {factors.wind_pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--risk-2)]"
                  style={{ width: `${factors.wind_pct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[var(--text-primary)]">
                <span>Radiant heat (MRT)</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {mrt.toFixed(1)} °C · contributes {factors.mrt_pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--risk-4)]"
                  style={{ width: `${factors.mrt_pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Why it is high & Thermometer Comparison */}
        <div className="hairline-cell p-5 space-y-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
            <span className="metric-label flex items-center gap-1.5 text-[var(--accent)]">
              <Info className="h-3.5 w-3.5" />
              Why physiological stress is elevated
            </span>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-primary)]">
              {why_high}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
            <span className="metric-label flex items-center gap-1.5 text-[var(--risk-4)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Thermometer vs Human Body Strain
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Thermometer alone</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums text-[var(--text-primary)]">{air_temp.toFixed(1)}°C</div>
                <div className="text-[10px] text-[var(--text-muted)]">Sensible air heat</div>
              </div>
              <div className="rounded border border-[var(--risk-4)] bg-[var(--risk-5)]/20 p-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--risk-4)]">Effective Strain</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums text-[var(--risk-4)]">{felt_temperature.toFixed(1)}°C</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Cardiovascular load</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Provenance */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">
        <span>{method}</span>
        <span className="text-[var(--text-secondary)]">
          Standard weather apps display air temperature alone; TAPAS evaluates human thermoregulation limits.
        </span>
      </div>
    </section>
  )
}

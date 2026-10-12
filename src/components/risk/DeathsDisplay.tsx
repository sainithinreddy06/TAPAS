import { RISK_COLORS } from '@/lib/constants'
import type { RiskLevel } from '@/lib/types'
import { cn, isRiskLevel } from '@/lib/utils'

export interface DeathsDisplayProps {
  value: number | null | undefined
  low: number | null | undefined
  high: number | null | undefined
  level?: RiskLevel | null
  when?: string
  showCitation?: boolean
  /** Use only source and uncertainty metadata supplied with the estimate. */
  source?: string | null
  intervalLabel?: string | null
  className?: string
}

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/** Never repair an invalid interval into apparently precise evidence. */
export function mortalitySummary(value: unknown, low: unknown, high: unknown) {
  if (!validCount(value)) return null
  const intervalValid = validCount(low) && validCount(high) && low <= value && value <= high
  return {
    central: value > 0 && value < 1 ? '<1' : String(Math.round(value)),
    range: intervalValid ? `${Math.floor(low)}–${Math.ceil(high)}` : null,
  }
}

export function DeathsDisplay({
  value, low, high, level, when = 'for this date', source, intervalLabel,
  showCitation = true, className,
}: DeathsDisplayProps) {
  const summary = mortalitySummary(value, low, high)
  return (
    <div className={cn('space-y-1', className)} data-testid="deaths-display">
      {summary ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-3xl font-bold leading-none" style={{ color: isRiskLevel(level) ? RISK_COLORS[level] : undefined }}>
              {summary.central}
            </span>
            <span className="text-sm tapas-subtext">
              modelled extra {value === 1 ? 'death' : 'deaths'} {when}
            </span>
          </p>
          <p className="text-xs tapas-subtext">
            {summary.range ? `Reported range ${summary.range}${intervalLabel ? ` (${intervalLabel})` : '; confidence level not supplied'}` : 'Uncertainty range unavailable or invalid'}
          </p>
          <p className="text-[11px] tapas-subtext">A model estimate, not an observed death count or a personal risk prediction.</p>
        </>
      ) : (
        <p className="text-sm tapas-subtext">Mortality estimate unavailable</p>
      )}
      {showCitation && summary ? (
        <p className="text-xs italic tapas-subtext">{source ? `Source: ${source}` : 'Estimate source not supplied'}</p>
      ) : null}
    </div>
  )
}

export function DeathsInline({ value, low, high, className }: Pick<DeathsDisplayProps, 'value' | 'low' | 'high' | 'className'>) {
  const summary = mortalitySummary(value, low, high)
  return (
    <span className={cn('text-[11px] tapas-subtext', className)}>
      {summary ? `~${summary.central} modelled extra (${summary.range ?? 'range unavailable'})` : 'Mortality unavailable'}
    </span>
  )
}

'use client'

import { useState } from 'react'
import { ShieldCheck, Users, HardHat, HeartPulse, CheckCircle2, ExternalLink } from 'lucide-react'
import { heatIndexBand } from '@/lib/thermal'
import {
  HEALTH_GUIDANCE_SOURCE,
  HEAT_FIRST_AID_SOURCE,
  NDMA_PRECAUTIONS_BY_LEVEL,
  heatPrecautions,
  type GuidanceAudience,
} from '@/lib/content/precautions'
import { RISK_LABELS } from '@/lib/constants'
import type { RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Precautions({
  riskLevel,
  selectedDate,
  heatIndex,
  className,
}: {
  riskLevel?: RiskLevel | null
  selectedDate?: string
  heatIndex?: number | null
  className?: string
}) {
  const band = heatIndexBand(heatIndex)
  const effectiveLevel: RiskLevel = riskLevel
    ? riskLevel
    : band
    ? band.severity >= 4
      ? 5
      : band.severity >= 3
      ? 4
      : band.severity >= 2
      ? 3
      : 2
    : 2

  const [tab, setTab] = useState<'general-public' | 'outdoor-workers' | 'elderly-vulnerable'>('general-public')
  const bundle = NDMA_PRECAUTIONS_BY_LEVEL[effectiveLevel]
  const precautions = heatPrecautions(effectiveLevel, tab as GuidanceAudience)

  const levelColor = `var(--risk-${effectiveLevel})`

  return (
    <section
      aria-labelledby="precautions-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-2)] text-[var(--bg-base)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h3 id="precautions-heading" className="metric-label text-[var(--text-secondary)]">
                Extreme Heat Precautions
              </h3>
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {bundle.headline}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${levelColor}20`,
                color: levelColor,
                border: `1px solid ${levelColor}50`,
              }}
            >
              Level {effectiveLevel} · {RISK_LABELS[effectiveLevel]}
            </span>
          </div>
        </div>

        {/* 3 Audience Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'general-public'}
            onClick={() => setTab('general-public')}
            className={cn(
              'flex min-h-10 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors',
              tab === 'general-public'
                ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            General Public
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'outdoor-workers'}
            onClick={() => setTab('outdoor-workers')}
            className={cn(
              'flex min-h-10 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors',
              tab === 'outdoor-workers'
                ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <HardHat className="h-3.5 w-3.5" />
            Outdoor Workers
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'elderly-vulnerable'}
            onClick={() => setTab('elderly-vulnerable')}
            className={cn(
              'flex min-h-10 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors',
              tab === 'elderly-vulnerable'
                ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            Elderly &amp; Vulnerable
          </button>
        </div>
      </div>

      {/* Advisory Content */}
      <div className="hairline-cell p-4 sm:p-5">
        <ul className="space-y-3" data-testid="precautions-list">
          {precautions.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-[var(--text-primary)]">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: levelColor }}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Source Footnote */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <span>Sources:</span>
          <a
            className="inline-flex items-center gap-1 text-[var(--text-secondary)] underline hover:text-[var(--accent)]"
            href={HEALTH_GUIDANCE_SOURCE}
            target="_blank"
            rel="noopener noreferrer"
          >
            NDMA Heat-Wave Guidelines <ExternalLink className="h-3 w-3" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-[var(--text-secondary)] underline hover:text-[var(--accent)]"
            href={HEAT_FIRST_AID_SOURCE}
            target="_blank"
            rel="noopener noreferrer"
          >
            IMD Heat Protocol <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {selectedDate ? `Applicable for ${selectedDate}` : 'Model-calibrated guidance'}
        </span>
      </div>
    </section>
  )
}

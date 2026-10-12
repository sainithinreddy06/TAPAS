'use client'

import { Scale, CheckCircle2, Info } from 'lucide-react'
import type { ExplainableRiskScore } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ExplainableRiskProps {
  data?: ExplainableRiskScore | null
  wardName?: string
  className?: string
}

export function ExplainableRisk({
  data,
  wardName = 'Ward 42, Kukatpally',
  className,
}: ExplainableRiskProps) {
  const scoreData = data || {
    score_0_100: 87,
    category: 'EXTREME' as const,
    factors: [
      { label: 'High thermal stress', points: 28, detail: 'UTCI 8.4/10 with elevated radiant heat' },
      { label: 'High outdoor-worker exposure', points: 21, detail: '8.2% of ward workforce in unshaded zones (Census 2011 derived rate)' },
      { label: 'Elderly population above median', points: 16, detail: '6.5% vulnerable demographics 65+ (Census 2011 district rate)' },
      { label: 'Patient surge detected', points: 12, detail: '+68% vs 7-day health facility baseline' },
      { label: 'Poor night-time recovery', points: 10, detail: 'Minimum night UTCI stayed above 95th percentile' },
    ],
    methodology: 'TAPAS Multi-Dimensional Heat-Health Risk Model v2.1',
    derivation_note:
      'Ward-level demographics estimated from Census 2011 Hyderabad district aggregates using uniform distribution. Not ward-enumerated. Replace with municipal ward data when available.',
  }

  const categoryColor =
    scoreData.category === 'EXTREME'
      ? 'var(--risk-5)'
      : scoreData.category === 'VERY HIGH'
      ? 'var(--risk-4)'
      : scoreData.category === 'HIGH'
      ? 'var(--risk-3)'
      : 'var(--risk-2)'

  return (
    <section
      aria-labelledby="explainable-risk-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="explainable-risk-heading" className="metric-label text-[var(--text-secondary)]">
              Explainable Risk Engine
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{wardName}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Transparent formula breakdown: Thermal Stress + Exposure + Vulnerability + Workforce + Observed Caseload.
        </p>
      </div>

      {/* Main Score Header */}
      <div className="hairline-cell flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
            Total Composite Risk Score
          </span>
          <div className="metric-large flex items-baseline gap-2 mt-1" style={{ color: categoryColor }}>
            <span>{scoreData.score_0_100}</span>
            <span className="text-xl font-medium text-[var(--text-muted)]">/ 100</span>
          </div>
        </div>

        <span
          className="rounded px-3 py-1.5 text-xs font-black tracking-widest uppercase"
          style={{
            backgroundColor: `${categoryColor}25`,
            color: categoryColor,
            border: `1px solid ${categoryColor}60`,
          }}
        >
          {scoreData.category}
        </span>
      </div>

      {/* Factor Additive Breakdown */}
      <div className="hairline-cell p-4 sm:p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
          Score Factor Breakdown (No Black-Box Calculation)
        </span>

        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]">
          {scoreData.factors.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 text-xs gap-3">
              <div className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-[var(--accent)] text-sm shrink-0">
                  +{item.points}
                </span>
                <div>
                  <span className="font-semibold text-[var(--text-primary)] block">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {item.detail}
                  </span>
                </div>
              </div>

              <CheckCircle2 className="h-4 w-4 text-[var(--border-strong)] shrink-0" />
            </div>
          ))}
        </div>

        {scoreData.derivation_note && (
          <div className="mt-3 flex items-start gap-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[11px] text-[var(--text-muted)]">
            <Info className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[var(--text-secondary)] font-semibold">Demographics Provenance: </strong>
              {scoreData.derivation_note}
            </div>
          </div>
        )}
      </div>

      {/* Footer Provenance */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>{scoreData.methodology}</span>
        <span className="text-[var(--text-secondary)]">Method documented · thresholds configurable</span>
      </div>
    </section>
  )
}

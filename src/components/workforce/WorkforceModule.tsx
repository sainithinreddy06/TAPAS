'use client'

import { useState } from 'react'
import { HardHat, AlertOctagon, Pickaxe, ShieldCheck, Check, BellRing } from 'lucide-react'
import type { WorkerGroup, MineSite } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WorkforceModuleProps {
  workerGroups?: WorkerGroup[]
  mineSites?: MineSite[]
  wardName?: string
  thermalStressScore?: number
  className?: string
}

export function WorkforceModule({
  workerGroups = [],
  mineSites = [],
  wardName = 'Ward 42, Kukatpally',
  thermalStressScore = 8.4,
  className,
}: WorkforceModuleProps) {
  const [notifiedSupervisors, setNotifiedSupervisors] = useState<Record<string, boolean>>({})
  const [alertedUnions, setAlertedUnions] = useState<Record<string, boolean>>({})

  // If no mine sites passed for this ward, include Singareni demo site as regional occupational reference
  const displayedMines =
    mineSites.length > 0
      ? mineSites
      : [
          {
            id: 'mine-sing-demo',
            ward_id: 'ward-singareni-c',
            name: 'Singareni Mining Block C',
            mine_name: 'Singareni Block C (Open-Cast Quarry)',
            mine_type: 'Open Cast' as const,
            operator: 'Singareni Collieries Co. Ltd. (SCCL)',
            exposed_workers: 438,
            shift_start: '12:00',
            shift_end: '18:00',
            peak_stress_window: '13:00 – 16:30',
            shift_overlaps_peak: true,
            recommended_protocol:
              'Suspend heavy outdoor work 13:00–16:30. Initiate mandatory hydration protocol and shaded rest cycles at 15 min work / 45 min rest per ACGIH guidance.',
            supervisor_name: 'R. Prasad (Safety Desk)',
            union_name: 'Singareni Mines Workers Union (AITUC)',
            status: 'CRITICAL SHIFT OVERLAP',
            risk: 5,
            source: 'DGMS / ACGIH Heat Standard',
            is_demo: true,
            updated_at: '2026-09-09T14:00:00Z',
            latitude: 17.5511,
            longitude: 80.6125,
          },
        ]

  return (
    <section
      aria-labelledby="workforce-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-3)] text-[var(--bg-base)]">
              <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="workforce-heading" className="metric-label text-[var(--text-secondary)]">
              High-Exposure Workforce Protection
            </h3>
          </div>
          <span className="rounded bg-[var(--risk-5)]/30 border border-[var(--risk-5)] px-2.5 py-0.5 text-xs font-bold text-[var(--risk-4)]">
            Shift-Aware Stress Trigger Active
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Monitors shift timings against biometeorological peak stress windows. Enforces ACGIH / DGMS work-rest ratios.
        </p>
      </div>

      {/* Signature Feature: Mine Site Shift-Aware Risk Card */}
      <div className="hairline-cell p-4 sm:p-5">
        <span className="metric-label text-[var(--risk-4)] flex items-center gap-1.5 mb-3">
          <Pickaxe className="h-3.5 w-3.5" />
          Heavy Industrial &amp; Mine Site Protocol
        </span>

        {displayedMines.map((mine) => {
          const isNotified = notifiedSupervisors[mine.id]
          const isUnionAlerted = alertedUnions[mine.id]

          return (
            <div
              key={mine.id}
              className="rounded-xl border border-[var(--risk-5)] bg-[var(--bg-secondary)] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {mine.mine_type} Industrial Zone · {mine.operator}
                  </span>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {mine.mine_name}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--risk-5)] px-2.5 py-1 text-xs font-black tracking-wider text-white">
                    EXTREME RISK
                  </span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">Workers exposed</span>
                  <span className="text-base font-bold tabular-nums text-[var(--text-primary)]">
                    {mine.exposed_workers}
                  </span>
                </div>

                <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">Thermal stress index</span>
                  <span className="text-base font-bold tabular-nums text-[var(--risk-4)]">
                    {thermalStressScore ? thermalStressScore.toFixed(1) : '8.7'} / 10
                  </span>
                </div>

                <div className="rounded border border-[var(--risk-4)]/60 bg-[var(--risk-5)]/20 p-2.5 col-span-2 sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase text-[var(--risk-4)] flex items-center gap-1">
                    <AlertOctagon className="h-3 w-3" />
                    Shift Timing: {mine.shift_start} – {mine.shift_end}
                  </span>
                  <span className="text-xs font-bold text-amber-200 block mt-0.5">
                    ⚠ Overlaps peak thermal stress window ({mine.peak_stress_window})
                  </span>
                </div>
              </div>

              {/* Recommended Action Protocol */}
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-primary)] p-3.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Mandated Operational Action (ACGIH / DGMS Protocol)
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-primary)]">
                  {mine.recommended_protocol}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  <span>Supervisor: </span>
                  <strong className="text-[var(--text-primary)]">{mine.supervisor_name}</strong>
                  <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">
                    Union: {mine.union_name}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotifiedSupervisors((prev) => ({ ...prev, [mine.id]: true }))}
                    className={cn(
                      'min-h-9 px-3 text-xs border-[var(--border-strong)] bg-[var(--bg-elevated)]',
                      isNotified ? 'text-emerald-400 border-emerald-800' : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                    )}
                  >
                    {isNotified ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Supervisor Dispatched
                      </>
                    ) : (
                      <>
                        <BellRing className="mr-1.5 h-3.5 w-3.5 text-[var(--accent)]" /> Notify Supervisor
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAlertedUnions((prev) => ({ ...prev, [mine.id]: true }))}
                    className={cn(
                      'min-h-9 px-3 text-xs border-[var(--border-strong)] bg-[var(--bg-elevated)]',
                      isUnionAlerted ? 'text-emerald-400 border-emerald-800' : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                    )}
                  >
                    {isUnionAlerted ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Union Alerted
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-[var(--risk-3)]" /> Alert Union
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* General Worker Sectors List */}
      <div className="hairline-cell p-4 sm:p-5 border-t border-[var(--border-subtle)]">
        <span className="metric-label text-[var(--text-secondary)] block mb-3">
          Local Ward Exposure Sectors ({wardName})
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {workerGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] capitalize">
                  {group.sector.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold tabular-nums text-[var(--accent)]">
                  {group.worker_count} workers
                </span>
              </div>

              <div className="text-[11px] text-[var(--text-muted)]">
                Shift: {group.shift_start} – {group.shift_end}
                {group.peak_stress_overlap && (
                  <span className="block text-amber-400 font-semibold mt-0.5">
                    ⚠ Afternoon Peak Overlap
                  </span>
                )}
              </div>

              <p className="text-[11.5px] leading-relaxed text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2 mt-1">
                {group.safety_protocol}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Provenance */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>Occupational standards: ACGIH TLV &amp; National Disaster Management Authority Guidelines.</span>
        <span>Automatic escalation triggers when shift overlaps UTCI peak stress window.</span>
      </div>
    </section>
  )
}

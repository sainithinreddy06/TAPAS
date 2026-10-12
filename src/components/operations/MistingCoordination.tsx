'use client'

import { useState } from 'react'
import { Droplets, Truck, Send, Check } from 'lucide-react'
import type { MistingTeam, RiskLevel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MistingCoordinationProps {
  teams: MistingTeam[]
  riskLevel?: RiskLevel
  wardName?: string
  className?: string
  onDeploy?: (teamId: string, location: string) => void
}

export function MistingCoordination({
  teams,
  riskLevel = 5,
  wardName = 'Ward 42, Kukatpally',
  className,
  onDeploy,
}: MistingCoordinationProps) {
  const [fleet, setFleet] = useState<MistingTeam[]>(teams)
  const [deployingId, setDeployingId] = useState<string | null>(null)

  const recommendation =
    riskLevel >= 5
      ? 'Extreme Risk: Prioritise immediate deployment to unshaded markets, open bus terminals, and exposed labour corridors.'
      : riskLevel >= 4
      ? 'High Risk: Target misting cannons along heavy pedestrian market intersections and outdoor vendor rows.'
      : riskLevel >= 3
      ? 'Moderate Risk: Prepare vehicle tanks and stage misting units on standby at municipal depots.'
      : 'Low Risk: No active misting deployment required.'

  const handleDeploy = (teamId: string) => {
    setDeployingId(teamId)
    setTimeout(() => {
      setFleet((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                status: 'En Route',
                last_deployment: `Dispatched ${new Date().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} IST`,
              }
            : t
        )
      )
      setDeployingId(null)
      onDeploy?.(teamId, wardName)
    }, 400)
  }

  return (
    <section
      aria-labelledby="misting-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-3)] text-[var(--bg-base)]">
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="misting-heading" className="metric-label text-[var(--text-secondary)]">
              Misting Team Coordination Fleet
            </h3>
          </div>
          <span className="rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
            {wardName}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Mobile evaporative cooling cannons and water-misting tankers for exposed public zones.
        </p>
      </div>

      {/* Deployment Recommendation Banner */}
      <div className="hairline-cell p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-start gap-2.5">
          <Truck className="h-4 w-4 shrink-0 text-[var(--accent)] mt-0.5" />
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Level {riskLevel} Deployment Directive
            </span>
            <p className="mt-1 text-[var(--text-primary)] leading-relaxed">
              {recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Unit ID &amp; Type</th>
              <th className="py-2.5 px-4">Current Staging Location</th>
              <th className="py-2.5 px-4">Assigned Ward</th>
              <th className="py-2.5 px-4">Capacity</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Dispatch Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {fleet.map((unit) => {
              const isDeploying = deployingId === unit.id

              const statusBadge =
                unit.status === 'En Route' ? (
                  <span className="inline-flex rounded bg-amber-950/70 border border-amber-800 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    En Route
                  </span>
                ) : unit.status === 'Assigned' ? (
                  <span className="inline-flex rounded bg-blue-950/70 border border-blue-800 text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                    Assigned
                  </span>
                ) : unit.status === 'Completed' ? (
                  <span className="inline-flex rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex rounded bg-stone-900 border border-stone-700 text-stone-300 px-2 py-0.5 text-[10px] font-bold">
                    Available
                  </span>
                )

              return (
                <tr key={unit.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[var(--text-secondary)]">
                    <div>{unit.name}</div>
                    <div className="text-[10.5px] text-[var(--text-muted)] font-normal">
                      {unit.vehicle_type} · Priority: {unit.priority}
                    </div>
                  </td>

                  <td className="py-3 px-4">{unit.current_location_name}</td>

                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {unit.assigned_ward}
                  </td>

                  <td className="py-3 px-4 tabular-nums text-[var(--text-secondary)]">
                    {unit.water_capacity_litres} L
                  </td>

                  <td className="py-3 px-4">{statusBadge}</td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isDeploying || unit.status === 'En Route'}
                      onClick={() => handleDeploy(unit.id)}
                      className={cn(
                        'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                        unit.status === 'En Route'
                          ? 'text-amber-400 border-amber-800'
                          : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                      )}
                    >
                      {isDeploying ? (
                        'Deploying…'
                      ) : unit.status === 'En Route' ? (
                        <>
                          <Check className="mr-1 h-3 w-3" /> Dispatched
                        </>
                      ) : (
                        <>
                          <Send className="mr-1 h-3 w-3 text-[var(--accent)]" /> Deploy to Ward
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

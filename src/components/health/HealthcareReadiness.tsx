'use client'

import { useState, useEffect } from 'react'
import { Hospital, Send, CheckCircle2, Clock, CheckCheck, AlertCircle, Plus, X, Activity, AlertTriangle } from 'lucide-react'
import type { HealthcareFacility, FacilityReadinessState } from '@/lib/types'
import { useDemoRole } from '@/lib/auth/demoAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HealthcareReadinessProps {
  facilities: HealthcareFacility[]
  wardName?: string
  className?: string
  onNotifyFacility?: (facilityId: string) => void
  canReportSurge?: boolean
}

export function HealthcareReadiness({
  facilities,
  wardName = 'Ward 42, Kukatpally',
  className,
  onNotifyFacility,
  canReportSurge,
}: HealthcareReadinessProps) {
  const role = useDemoRole()
  const isOfficerOrAuthority = canReportSurge ?? (role === 'officer' || role === 'authority')
  const [facilityList, setFacilityList] = useState<HealthcareFacility[]>(facilities)
  const [facilityStates, setFacilityStates] = useState<Record<string, FacilityReadinessState>>(() => {
    const map: Record<string, FacilityReadinessState> = {}
    for (const f of facilities) {
      map[f.id] = f.notification_state
    }
    return map
  })

  const [simulatingId, setSimulatingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [targetFacilityId, setTargetFacilityId] = useState<string>(facilities[0]?.id || '')
  const [admissionsCount, setAdmissionsCount] = useState('12')
  const [surgeLevel, setSurgeLevel] = useState<HealthcareFacility['heat_risk_status']>('Severe')
  const [bedOccupancy, setBedOccupancy] = useState('88%')

  // Sync facility prop changes
  useEffect(() => {
    setFacilityList(facilities)
    if (facilities.length > 0 && !targetFacilityId) {
      setTargetFacilityId(facilities[0].id)
    }
  }, [facilities])

  const handleAdvanceState = (facilityId: string) => {
    setSimulatingId(facilityId)
    setTimeout(() => {
      setFacilityStates((prev) => {
        const current = prev[facilityId] || 'NOT_SENT'
        let next: FacilityReadinessState = 'SENT'
        if (current === 'NOT_SENT') next = 'SENT'
        else if (current === 'SENT') next = 'DELIVERED'
        else if (current === 'DELIVERED') next = 'ACKNOWLEDGED'
        else next = 'ACKNOWLEDGED'
        return { ...prev, [facilityId]: next }
      })
      setSimulatingId(null)
      onNotifyFacility?.(facilityId)
    }, 450)
  }

  const handleReportSurge = (e: React.FormEvent) => {
    e.preventDefault()
    setFacilityList((prev) =>
      prev.map((f) => {
        if (f.id === targetFacilityId) {
          return {
            ...f,
            heat_risk_status: surgeLevel,
            status: `Active Surge (${admissionsCount} cases, ${bedOccupancy} beds)`,
            notification_state: 'SENT',
          }
        }
        return f
      })
    )
    setFacilityStates((prev) => ({ ...prev, [targetFacilityId]: 'SENT' }))
    setModalOpen(false)
  }

  return (
    <section
      aria-labelledby="healthcare-readiness-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-4)] text-[var(--bg-base)]">
              <Hospital className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="healthcare-readiness-heading" className="metric-label text-[var(--text-secondary)]">
              Healthcare Facility Surge Readiness
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
              {wardName}
            </span>
            {isOfficerOrAuthority && (
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                className="h-8 bg-[var(--risk-4)] text-black hover:opacity-90 text-xs font-bold px-2.5"
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" /> + Report Facility Surge
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Monitors hospital, PHC and CHC readiness status and operational transmission logs.
        </p>
      </div>

      {/* Facilities Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Facility Name &amp; Level</th>
              <th className="py-2.5 px-4">Distance</th>
              <th className="py-2.5 px-4">Heat Surge Alert</th>
              <th className="py-2.5 px-4">Notification State</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {facilityList.map((fac) => {
              const currentState = facilityStates[fac.id] ?? fac.notification_state
              const isSimulating = simulatingId === fac.id

              const stateBadge =
                currentState === 'ACKNOWLEDGED' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <CheckCheck className="h-3 w-3" /> ACKNOWLEDGED
                  </span>
                ) : currentState === 'DELIVERED' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <CheckCircle2 className="h-3 w-3" /> DELIVERED
                  </span>
                ) : currentState === 'SENT' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-orange-950/70 border border-orange-800 text-orange-300 px-2 py-0.5 font-bold text-[10.5px]">
                    <Clock className="h-3 w-3" /> SENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-stone-900 border border-stone-700 text-stone-400 px-2 py-0.5 font-semibold text-[10.5px]">
                    <AlertCircle className="h-3 w-3" /> NOT SENT
                  </span>
                )

              return (
                <tr key={fac.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text-primary)]">{fac.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {fac.bed_capacity_label || 'Bed Capacity: Unavailable'} · {fac.source ? `Source: ${fac.source}` : 'OpenStreetMap Verified'}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                    {fac.distance_km.toFixed(1)} km
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10.5px] font-bold uppercase',
                        fac.heat_risk_status === 'Critical' || fac.heat_risk_status === 'Severe'
                          ? 'bg-[var(--risk-5)]/40 border border-[var(--risk-4)] text-[var(--risk-4)]'
                          : 'bg-[var(--risk-3)]/20 border border-[var(--risk-3)] text-[var(--risk-3)]'
                      )}
                    >
                      {fac.heat_risk_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">{stateBadge}</td>

                  <td className="py-3 px-4 text-right">
                    {isOfficerOrAuthority ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSimulating || currentState === 'ACKNOWLEDGED'}
                        onClick={() => handleAdvanceState(fac.id)}
                        className={cn(
                          'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                          currentState === 'ACKNOWLEDGED'
                            ? 'opacity-60 cursor-default'
                            : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                        )}
                      >
                        {isSimulating ? (
                          'Updating…'
                        ) : currentState === 'NOT_SENT' ? (
                          <>
                            <Send className="mr-1 h-3 w-3 text-[var(--accent)]" /> Send Surge Alert
                          </>
                        ) : currentState === 'SENT' ? (
                          'Confirm Delivery'
                        ) : currentState === 'DELIVERED' ? (
                          'Acknowledge Reception'
                        ) : (
                          'Acknowledged'
                        )}
                      </Button>
                    ) : (
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {currentState}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Surge Reporting Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--risk-4)]" /> Report Facility Heat Surge
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReportSurge} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Target Healthcare Facility
                </label>
                <select
                  value={targetFacilityId}
                  onChange={(e) => setTargetFacilityId(e.target.value)}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  {facilityList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.bed_capacity_label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Surge Severity Level
                </label>
                <select
                  value={surgeLevel}
                  onChange={(e) => setSurgeLevel(e.target.value as any)}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="Low">Low — Normal Baseline Capacity</option>
                  <option value="Moderate">Moderate — Rising Heat Exhaustion Cases (+25%)</option>
                  <option value="High">High — Heightened Influx (+40%)</option>
                  <option value="Severe">Severe — Emergency Heat Stroke Influx (+50%)</option>
                  <option value="Critical">Critical — Full Capacity / ER Overrun (+100%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Heat Influx Cases Today
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={admissionsCount}
                    onChange={(e) => setAdmissionsCount(e.target.value)}
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Emergency Bed Occupancy
                  </label>
                  <input
                    type="text"
                    required
                    value={bedOccupancy}
                    onChange={(e) => setBedOccupancy(e.target.value)}
                    placeholder="e.g. 92%"
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[var(--risk-4)] text-black hover:opacity-90 text-xs font-bold"
                >
                  Submit Surge Alert
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Printer,
  Download,
  X,
} from 'lucide-react'
import {
  getStoredOperation,
  createDefaultOperation,
  updateOperationalStatus,
  storeBackendOperation,
  type EmergencyOperation,
  type OperationalStatus,
} from '@/lib/operationsStore'
import { DEFAULT_KUKATPALLY_SCHEDULE } from '@/lib/workSchedule'
import { downloadCapXmlFile } from '@/lib/cap'
import { cn } from '@/lib/utils'

interface OperationalFollowthroughProps {
  isOpen: boolean
  onClose: () => void
  wardName?: string
  wardId?: string
}

export function OperationalFollowthrough({
  isOpen,
  onClose,
  wardName = 'Kukatpally Ward',
  wardId = 'ward-42-kukatpally',
}: OperationalFollowthroughProps) {
  const [operation, setOperation] = useState<EmergencyOperation | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'recipients' | 'schedule' | 'timeline'>('recipients')

  useEffect(() => {
    let op = getStoredOperation()
    if (!op) op = createDefaultOperation(wardId, wardName)
    setOperation(op)

    const handleUpdate = () => {
      setOperation(getStoredOperation())
    }
    window.addEventListener('tapas_operation_updated', handleUpdate)

    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    const interval = setInterval(async () => {
      const current = getStoredOperation()
      if (!current?.id) return
      try {
        const res = await fetch(`${base}/api/response/${encodeURIComponent(current.id)}`, { credentials: 'include' })
        if (res.ok) {
          const live = await res.json()
          storeBackendOperation(live, wardName)
        }
      } catch {
        // ignore
      }
    }, 2500)

    return () => {
      window.removeEventListener('tapas_operation_updated', handleUpdate)
      clearInterval(interval)
    }
  }, [wardId, wardName])

  if (!isOpen || !operation) return null

  const handleManualStatusChange = (token: string, newStatus: OperationalStatus) => {
    updateOperationalStatus(token, newStatus, 'Updated manually by officer')
    setOperation(getStoredOperation())
  }

  const handleCompleteOperation = () => {
    const updated = {
      ...operation,
      status: 'COMPLETED' as const,
      timeline: [
        ...operation.timeline,
        {
          id: `t-${Date.now()}`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          text: 'Response actions completed by Officer S. Kumar. Handover brief logged.',
        },
      ],
    }
    localStorage.setItem('tapas_active_operation_v2', JSON.stringify(updated))
    window.dispatchEvent(new Event('tapas_operation_updated'))
    setOperation(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="relative w-full max-w-5xl rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--line-soft)] bg-[var(--surface-2)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-dim)] text-[var(--ink-high)]">
              <Clock className="h-4 w-4 text-[var(--accent)]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-high)]">
                  ACTIVE RESPONSE COMMAND — {operation.wardName}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10.5px] font-bold uppercase',
                    operation.status === 'ACTIVE'
                      ? 'bg-[var(--risk-5)] text-[var(--risk-4)]'
                      : 'bg-[var(--surface-3)] text-[var(--ok)]'
                  )}
                >
                  {operation.status === 'ACTIVE' ? 'Response Active' : 'Response Actions Completed'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-low)] font-mono">
                Operation Ref: {operation.id} · Window: {operation.riskWindow}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {operation.capXml && (
              <button
                type="button"
                onClick={() => downloadCapXmlFile(operation.capXml!, `${operation.id}-CAP12.xml`)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[var(--line-soft)] bg-[var(--surface-3)] text-xs text-[var(--accent)] hover:text-[var(--ink-high)] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CAP 1.2 XML</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--ink-low)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-high)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex border-b border-[var(--line-hair)] bg-[var(--surface-2)] px-5 pt-2 gap-2 text-xs">
          {[
            { id: 'recipients', label: '3.5 Two Status Tracking (Recipients)' },
            { id: 'schedule', label: '3.3 Revised Work Schedule (ISO 7243)' },
            { id: 'timeline', label: '3.7 Stored Event Timeline' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={cn(
                'px-3.5 py-2 font-bold transition-colors border-b-2 -mb-px',
                activeSubTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--ink-high)] bg-[var(--surface-1)] rounded-t-md'
                  : 'border-transparent text-[var(--ink-low)] hover:text-[var(--ink-mid)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto text-xs">
          {/* TAB 1: RECIPIENTS & TWO STATUS SYSTEMS */}
          {activeSubTab === 'recipients' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-low)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--line-hair)]">
                <div>
                  <strong className="text-[var(--ink-high)]">Two decoupled systems:</strong> Delivery status tracks transmission. Operational status tracks physical response action taken by recipient.
                </div>
                <div className="text-[var(--accent)] font-medium">
                  Escalation clock: Level 5 unacknowledged &gt; 15 min flags in iron-oxide
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)]">
                <table className="w-full text-left font-variant-numeric tabular-nums">
                  <thead className="bg-[var(--surface-3)] text-[10.5px] uppercase tracking-wider text-[var(--ink-low)] border-b border-[var(--line-hair)]">
                    <tr>
                      <th className="p-3">Recipient / Role</th>
                      <th className="p-3">Channels</th>
                      <th className="p-3">Message Delivery</th>
                      <th className="p-3">Operational Response</th>
                      <th className="p-3">Action / Note</th>
                      <th className="p-3 text-right">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-hair)] text-xs">
                    {operation.recipients.map((r) => {
                      const isOverdue = r.isOverdue || (r.operationalStatus === 'NOT_ACKNOWLEDGED' && r.group === 'asha_mro')
                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            'hover:bg-[var(--surface-3)]/60 transition-colors',
                            isOverdue && 'bg-[var(--risk-5)]/15'
                          )}
                        >
                          <td className="p-3">
                            <div className="font-bold text-[var(--ink-high)] flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {isOverdue && (
                                <span className="rounded bg-[var(--risk-4)] px-1.5 py-0.2 text-[9.5px] font-extrabold text-[var(--surface-0)] uppercase">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-[var(--ink-low)]">{r.role}</div>
                            <div className="text-[10px] text-[var(--ink-faint)] font-mono">{r.phone}</div>
                          </td>

                          <td className="p-3">
                            <div className="flex gap-1">
                              {r.channels.map((ch) => (
                                <span
                                  key={ch}
                                  className="rounded bg-[var(--surface-1)] border border-[var(--line-hair)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink-low)] uppercase"
                                >
                                  {ch.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Column 1: Delivery Status */}
                          <td className="p-3">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold font-mono uppercase',
                                r.deliveryStatus === 'DELIVERED' || r.deliveryStatus === 'READ'
                                  ? 'bg-[var(--risk-1)]/20 text-[var(--risk-1)]'
                                  : r.deliveryStatus === 'SENT'
                                  ? 'bg-[var(--risk-2)]/20 text-[var(--risk-2)]'
                                  : r.deliveryStatus === 'QUEUED'
                                  ? 'bg-[var(--surface-3)] text-[var(--ink-low)]'
                                  : 'bg-[var(--risk-4)]/20 text-[var(--risk-4)]'
                              )}
                            >
                              {r.deliveryStatus}
                            </span>
                          </td>

                          {/* Column 2: Operational Status (Separate!) */}
                          <td className="p-3">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold uppercase',
                                r.operationalStatus === 'COMPLETED' || r.operationalStatus === 'ACKNOWLEDGED'
                                  ? 'bg-[var(--risk-1)]/20 text-[var(--risk-1)]'
                                  : r.operationalStatus === 'IN_PROGRESS'
                                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                                  : r.operationalStatus === 'NEEDS_ASSISTANCE' || r.operationalStatus === 'UNABLE_TO_COMPLY'
                                  ? 'bg-[var(--risk-4)]/20 text-[var(--risk-4)]'
                                  : isOverdue
                                  ? 'bg-[var(--risk-5)] text-[var(--risk-4)] font-extrabold'
                                  : 'bg-[var(--surface-3)] text-[var(--ink-low)]'
                              )}
                            >
                              {r.operationalStatus.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="p-3 text-[11px] text-[var(--ink-mid)]">
                            {r.responseNote ? (
                              <span>{r.responseNote}</span>
                            ) : (
                              <span className="text-[var(--ink-faint)] italic">No reply recorded</span>
                            )}
                            {r.acknowledgedAt && (
                              <div className="text-[10px] text-[var(--ink-low)] font-mono">
                                Ack: {r.acknowledgedAt}
                              </div>
                            )}
                          </td>

                          {/* Quick Manual Transition for Officer Override */}
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={`/respond/${encodeURIComponent(r.token)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[10.5px] text-[var(--accent)] border border-[var(--line-soft)] font-medium underline"
                              >
                                Open Task
                              </a>
                              <button
                                type="button"
                                title="Acknowledge response"
                                onClick={() => handleManualStatusChange(r.token, 'ACKNOWLEDGED')}
                                className="px-2 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-1)] text-[10.5px] text-[var(--ink-high)] border border-[var(--line-soft)]"
                              >
                                Ack
                              </button>
                              <button
                                type="button"
                                title="Mark Completed"
                                onClick={() => handleManualStatusChange(r.token, 'COMPLETED')}
                                className="px-2 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--surface-1)] text-[10.5px] text-[var(--ok)] border border-[var(--line-soft)]"
                              >
                                Done
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Link to mobile responder surface */}
              <div className="p-3 rounded-lg border border-[var(--line-hair)] bg-[var(--surface-2)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--ink-low)]">
                  Mobile responder links active at: <code className="text-[var(--accent)] font-mono">/respond/[token]</code>
                </span>
                <a
                  href="/respond/tok-asha-01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline font-semibold"
                >
                  Open ASHA Responder Surface (tok-asha-01) ↗
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: REVISED WORK SCHEDULE */}
          {activeSubTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink-high)]">
                    Work / Rest Schedule Generated for {operation.wardName}
                  </h3>
                  <p className="text-xs text-[var(--ink-low)]">
                    Derived from today&apos;s hourly WBGT numerical forecast mapped to ISO 7243 / ACGIH standards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line-soft)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-high)] hover:border-[var(--accent)] transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Printable Noticeboard Notice</span>
                </button>
              </div>

              {/* Horizontal Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {DEFAULT_KUKATPALLY_SCHEDULE.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-lg p-3 border',
                      b.isSuspended
                        ? 'bg-[var(--risk-5)]/40 border-[var(--risk-4)] text-[var(--risk-4)]'
                        : b.band === 'warning'
                        ? 'bg-[var(--risk-3)]/20 border-[var(--risk-3)] text-[var(--risk-3)]'
                        : b.band === 'caution'
                        ? 'bg-[var(--risk-2)]/20 border-[var(--risk-2)] text-[var(--risk-2)]'
                        : 'bg-[var(--risk-1)]/20 border-[var(--risk-1)] text-[var(--risk-1)]'
                    )}
                  >
                    <div className="font-mono font-bold text-sm">{b.timeStart} – {b.timeEnd}</div>
                    <div className="text-xs font-bold mt-1 uppercase">
                      {b.isSuspended ? 'SUSPEND WORK' : `${b.workPct}% work / ${b.restPct}% rest`}
                    </div>
                    <div className="text-[11px] mt-1 text-[var(--ink-mid)] font-mono">
                      WBGT {b.wbgtMin}–{b.wbgtMax} °C
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)]">
                <table className="w-full text-left font-variant-numeric tabular-nums">
                  <thead className="bg-[var(--surface-3)] text-[10.5px] uppercase tracking-wider text-[var(--ink-low)] border-b border-[var(--line-hair)]">
                    <tr>
                      <th className="p-3">Time Window</th>
                      <th className="p-3">Operational Requirement</th>
                      <th className="p-3">WBGT Threshold</th>
                      <th className="p-3">Compliance Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-hair)] text-xs">
                    {DEFAULT_KUKATPALLY_SCHEDULE.map((b) => (
                      <tr key={b.id} className={b.isSuspended ? 'text-[var(--risk-4)] font-semibold' : 'text-[var(--ink-mid)]'}>
                        <td className="p-3 font-mono font-bold">{b.timeStart} – {b.timeEnd}</td>
                        <td className="p-3 font-bold">{b.guidance}</td>
                        <td className="p-3 font-mono">{b.wbgtMin} – {b.wbgtMax} °C</td>
                        <td className="p-3 text-[11px] text-[var(--ink-low)]">
                          {b.isSuspended
                            ? 'Mandatory hydration every 15m; immediate shaded retreat.'
                            : 'Shaded rest station within 50m; supervisor health checks.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeSubTab === 'timeline' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-high)]">
                Stored Operational Event Audit Log (Never scripted)
              </div>

              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] p-4 divide-y divide-[var(--line-hair)]">
                {operation.timeline.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-[var(--ink-low)] shrink-0 w-12">
                      {entry.time}
                    </span>
                    <span
                      className={cn(
                        'text-xs leading-relaxed',
                        entry.isWarning ? 'font-bold text-[var(--risk-4)]' : 'text-[var(--ink-mid)]'
                      )}
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] px-4 py-2 text-xs font-medium text-[var(--ink-mid)] hover:text-[var(--ink-high)] transition-colors"
          >
            Close Overview
          </button>

          {/* Rule 10: Never label Cleared or Safe. Use "Response actions completed" */}
          {operation.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={handleCompleteOperation}
              className="rounded-lg bg-[var(--surface-3)] border border-[var(--line-firm)] hover:border-[var(--ok)] text-[var(--ok)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Mark Response Actions Completed
            </button>
          ) : (
            <span className="text-xs text-[var(--ok)] font-bold uppercase tracking-wider">
              ✓ Response actions completed (Audit logged)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { AlertCircle, Clock, CheckCircle2, ArrowUpRight, X } from 'lucide-react'
import type { ActionRecommendation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActionPriorityListProps {
  actions: ActionRecommendation[]
  wardName?: string
  generatedAt?: string
  className?: string
  onActionComplete?: (actionId: string) => void
}

export function ActionPriorityList({
  actions,
  wardName = 'Ward 42, Kukatpally',
  generatedAt = '14:12 IST',
  className,
  onActionComplete,
}: ActionPriorityListProps) {
  const [actionList, setActionList] = useState<ActionRecommendation[]>(actions)
  const [selectedAction, setSelectedAction] = useState<ActionRecommendation | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmAction = () => {
    if (!selectedAction) return
    setIsSubmitting(true)
    setTimeout(() => {
      setActionList((prev) =>
        prev.map((a) =>
          a.id === selectedAction.id
            ? { ...a, acknowledged: true, in_progress: true, status: 'In Progress / Mobilized' }
            : a
        )
      )
      setIsSubmitting(false)
      onActionComplete?.(selectedAction.id)
      setSelectedAction(null)
      setReviewNotes('')
    }, 400)
  }

  return (
    <section
      aria-labelledby="urgent-actions-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--risk-4)] text-[var(--bg-base)]">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="urgent-actions-heading" className="metric-label text-[var(--text-secondary)]">
              Urgent Response Action Priorities
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{wardName}</span>
            <span>·</span>
            <span className="font-mono">{generatedAt}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Ranked municipal and public-health interventions generated from multi-factor risk detection.
        </p>
      </div>

      {/* Action Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4 w-12 text-center">#</th>
              <th className="py-2.5 px-4">Mandated Action</th>
              <th className="py-2.5 px-4">Priority</th>
              <th className="py-2.5 px-4">Trigger Reason</th>
              <th className="py-2.5 px-4">Target Entity</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Execute</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {actionList.map((item, index) => {
              const priorityBadge =
                item.priority === 'HIGH' ? (
                  <span className="rounded bg-[var(--risk-5)]/50 border border-[var(--risk-4)] px-2 py-0.5 text-[10px] font-bold text-[var(--risk-4)]">
                    HIGH
                  </span>
                ) : (
                  <span className="rounded bg-amber-950/60 border border-amber-700/80 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    MEDIUM
                  </span>
                )

              return (
                <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-[var(--text-muted)]">
                    {index + 1}
                  </td>

                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </td>

                  <td className="py-3 px-4">{priorityBadge}</td>

                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {item.reason}
                  </td>

                  <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                    {item.target}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px]',
                        item.acknowledged ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                      )}
                    >
                      {item.acknowledged ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelectedAction(item)}
                      className={cn(
                        'min-h-8 px-3 text-xs',
                        item.acknowledged
                          ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          : 'bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 font-bold'
                      )}
                    >
                      {item.acknowledged ? 'Review' : 'Act'}
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Action Review & Confirmation Modal */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Action Review Panel · Priority {selectedAction.priority}
                </span>
                <h4 className="text-base font-bold text-[var(--text-primary)] mt-1">
                  {selectedAction.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <div>
                <strong className="text-[var(--text-primary)] block">Operational Rationale:</strong>
                <p className="mt-0.5">{selectedAction.reason}</p>
              </div>

              <div>
                <strong className="text-[var(--text-primary)] block">Target Entity:</strong>
                <p className="mt-0.5 font-mono text-[var(--accent)]">{selectedAction.target}</p>
              </div>

              <div>
                <strong className="text-[var(--text-primary)] block">Recommended Timing:</strong>
                <p className="mt-0.5">{selectedAction.recommended_time}</p>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-3">
              <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1.5">
                Officer Directives / Execution Notes:
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Specify execution details, dispatch units, or timing constraints…"
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedAction(null)}
                className="border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleConfirmAction}
                className="bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 font-bold"
              >
                {isSubmitting ? 'Confirming…' : 'Authorize & Dispatch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>Interventions automatically ranked by severity, exposure count and threshold crossing.</span>
        <span>Every dispatch requires officer confirmation — never a bare one-click toast.</span>
      </div>
    </section>
  )
}

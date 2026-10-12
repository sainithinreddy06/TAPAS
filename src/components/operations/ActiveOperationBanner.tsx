'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStoredOperation,
  saveOperation,
  createDefaultOperation,
  type EmergencyOperation,
} from '@/lib/operationsStore'
import { downloadCapXmlFile } from '@/lib/cap'

interface ActiveOperationBannerProps {
  wardName: string
  wardId: string
  riskLevel: number
  onOpenReviewModal: () => void
  onOpenOperationDetails: () => void
}

export function ActiveOperationBanner({
  wardName,
  wardId,
  riskLevel,
  onOpenReviewModal,
  onOpenOperationDetails,
}: ActiveOperationBannerProps) {
  const [operation, setOperation] = useState<EmergencyOperation | null>(null)
  const [elapsedMinutes, setElapsedMinutes] = useState(14)

  useEffect(() => {
    let op = getStoredOperation()
    if (!op && riskLevel >= 4) {
      op = createDefaultOperation(wardId, wardName)
      saveOperation(op)
    }
    setOperation(op)

    const handleUpdate = () => {
      setOperation(getStoredOperation())
    }
    window.addEventListener('tapas_operation_updated', handleUpdate)

    return () => {
      window.removeEventListener('tapas_operation_updated', handleUpdate)
    }
  }, [wardId, wardName, riskLevel])

  useEffect(() => {
    if (!operation?.activatedAt) return
    const updateElapsed = () => {
      setElapsedMinutes(Math.max(1, Math.floor((Date.now() - operation.activatedAt) / 60000)))
    }
    updateElapsed()
    const timer = setInterval(updateElapsed, 15000)
    return () => clearInterval(timer)
  }, [operation?.activatedAt])

  // Only surface for Level 4 or Level 5
  if (riskLevel < 4) return null

  const isActivated = operation && operation.status === 'ACTIVE'
  const isLevel5 = riskLevel >= 5

  const acknowledgedCount = operation
    ? operation.recipients.filter(
        (r) => r.operationalStatus !== 'NOT_ACKNOWLEDGED'
      ).length
    : 5
  const totalRecipients = operation ? operation.recipients.length : 7
  const hasOverdue = operation?.recipients.some((r) => r.isOverdue)

  return (
    <div className="sticky top-14 z-30 mb-4 overflow-hidden rounded-xl border border-[var(--line-firm)] bg-[var(--surface-2)] shadow-2xl transition-all">
      {/* 3.1 Primary Trigger bar with --accent-dim background */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--accent-dim)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-0)] text-[var(--accent)] shadow-sm">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-high)]">
                ⚠ {wardName} — LEVEL {riskLevel} {isLevel5 ? 'EXTREME' : 'VERY HIGH'}
              </span>
              <span className="rounded bg-[var(--risk-5)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-high)] uppercase">
                Action Plan Trigger
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-high)]/90 font-medium">
              SIH26083 mandate: Localised trigger to shift outdoor work hours, notify healthcare, and coordinate response.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {!isActivated ? (
            <Button
              type="button"
              onClick={onOpenReviewModal}
              className="min-h-9 bg-[var(--ink-high)] text-[var(--surface-0)] hover:bg-white font-extrabold text-xs tracking-wider uppercase px-4 shadow-lg transition-transform active:scale-95"
            >
              NOTIFY &amp; MOBILISE
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onOpenOperationDetails}
              className="min-h-9 bg-[var(--surface-0)] text-[var(--ink-high)] hover:bg-[var(--surface-1)] border border-[var(--line-soft)] font-bold text-xs px-3.5 shadow-md flex items-center gap-1.5"
            >
              <span>Manage Active Operation</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--accent)]" />
            </Button>
          )}
        </div>
      </div>

      {/* If Response is Active: Live Escalation Clock and Status Bar */}
      {isActivated && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-hair)] bg-[var(--surface-1)] px-4 py-2.5 sm:px-6 text-xs">
          <div className="flex flex-wrap items-center gap-3 font-variant-numeric tabular-nums">
            <div className="flex items-center gap-1.5 font-bold text-[var(--accent)]">
              <Clock className="h-3.5 w-3.5" />
              <span>RESPONSE ACTIVE — {elapsedMinutes} min</span>
            </div>

            <span className="text-[var(--line-soft)]">|</span>

            <div className="text-[var(--ink-mid)]">
              Progress:{' '}
              <strong className="text-[var(--ink-high)] font-semibold">
                {acknowledgedCount}/{totalRecipients} acknowledged
              </strong>
            </div>

            {hasOverdue && (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--risk-5)] px-2 py-0.5 text-[11px] font-bold text-[var(--risk-4)]">
                ⚠ 1 overdue (&gt; 15 min) — escalated to District Authority
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {operation?.capXml && (
              <button
                type="button"
                onClick={() => downloadCapXmlFile(operation.capXml!, `${operation.id}-CAP12.xml`)}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
              >
                <Download className="h-3 w-3" /> CAP 1.2 XML
              </button>
            )}
            <button
              type="button"
              onClick={onOpenOperationDetails}
              className="text-[11px] text-[var(--ink-low)] hover:text-[var(--ink-high)] underline"
            >
              View audit trail &amp; work schedule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

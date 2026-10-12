'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react'
import {
  getStoredOperation,
  createDefaultOperation,
  updateOperationalStatus,
  type OperationalStatus,
  type OperationRecipient,
} from '@/lib/operationsStore'

export default function ResponderPage() {
  const params = useParams()
  const token = (params?.token as string) || 'tok-asha-01'

  const [operation, setOperation] = useState(getStoredOperation() || createDefaultOperation())
  const [recipient, setRecipient] = useState<OperationRecipient | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    fetch(`${base}/api/respond/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Token not found')
        return res.json()
      })
      .then((data) => {
        setRecipient({
          id: data.recipient_id,
          name: data.name || 'Assigned Responder',
          role: data.recipient_type === 'asha' ? 'ASHA Worker Lead' : data.recipient_type === 'ward_member' ? 'Ward Member' : data.recipient_type === 'labour_union' ? 'Labour Welfare Inspector' : data.recipient_type === 'healthcare' ? 'PHC Medical Officer' : 'Field Responder',
          group: data.recipient_type === 'asha' ? 'asha_mro' : data.recipient_type === 'ward_member' ? 'ward_officials' : data.recipient_type === 'labour_union' ? 'workers' : data.recipient_type === 'healthcare' ? 'healthcare' : 'public',
          phone: data.phone,
          token: data.token,
          channels: ['in_app', 'whatsapp'],
          deliveryStatus: (data.delivery_status?.toUpperCase() || 'DELIVERED') as any,
          operationalStatus: (data.operational_status?.toUpperCase() || 'NOT_ACKNOWLEDGED') as OperationalStatus,
          dispatchedAt: 'Live Field Dispatch',
          responseNote: data.message_body,
        })
        setOperation((prev) => ({
          ...(prev || createDefaultOperation(data.ward_id, data.ward_name)),
          id: data.operation_id,
          wardId: data.ward_id,
          wardName: data.ward_name || data.ward_id,
          riskLevel: data.alert_level || 5,
        }))
      })
      .catch(() => {
        let op = getStoredOperation()
        if (!op) op = createDefaultOperation()
        setOperation(op)
        const found = op.recipients.find((r) => r.token.toLowerCase() === token.toLowerCase())
        setRecipient(found || op.recipients[1])
      })
  }, [token])

  const handleAction = async (status: OperationalStatus, actionLabel: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    const actionMap: Record<string, string> = {
      ACKNOWLEDGED: 'acknowledge',
      IN_PROGRESS: 'start',
      NEEDS_ASSISTANCE: 'help',
      COMPLETED: 'complete',
    }
    const backendAction = actionMap[status] || 'acknowledge'
    try {
      await fetch(`${base}/api/respond/${encodeURIComponent(recipient?.token || token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: backendAction }),
      })
    } catch {
      // Offline fallback
    }

    updateOperationalStatus(recipient?.token || token, status, note || actionLabel)
    setLastAction(`Action recorded: ${actionLabel} at ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`)
    const updated = getStoredOperation()
    if (updated) {
      setOperation(updated)
      const found = updated.recipients.find((r) => r.token.toLowerCase() === token.toLowerCase())
      if (found) setRecipient(found)
    } else if (recipient) {
      setRecipient({ ...recipient, operationalStatus: status })
    }
    setShowNoteInput(false)
    setNote('')
  }

  const wardName = operation.wardName || 'Kukatpally Ward'

  // Audience specific message to display on the mobile screen
  let messageBody = ''
  if (recipient?.group === 'asha_mro') {
    messageBody = `Priority households: elderly, pregnant women, infants, chronic illness.\nWatch for: hot dry skin, confusion, rapid pulse, collapse.\nRefer suspected heat stroke to PHC Kukatpally (1.4 km) immediately.`
  } else if (recipient?.group === 'workers') {
    messageBody = `EXTREME thermal stress. WBGT exceeds ACGIH limits 12:40–17:20 IST.\n\nREVISED WORK SCHEDULE:\n06:00–11:00 Full work permitted\n11:00–12:40 75% work / 25% rest\n12:40–17:20 SUSPEND heavy outdoor work\n17:20–20:00 50% work / 50% rest\n\nRequired: shaded rest area, water within 50 m, supervisor heat-illness checks every 30 minutes.`
  } else if (recipient?.group === 'healthcare') {
    messageBody = `EXTREME heat 12:40–17:20. Catchment 124,000.\nHeat-patient load: 37 today (7-day avg 22, +68%)\nRecommended: ORS and IV fluid stock check, cooling protocol readiness, staff roster review 14:00–18:00.`
  } else {
    messageBody = `Please:\n• Welfare checks on registered elderly households\n• Verify drinking water at ward water points\n• Confirm cooling centre readiness\n• Report heat-illness incidents through TAPAS`
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--ink-mid)] font-sans flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Identity Header */}
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--line-hair)] pb-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/tapas-emblem.png"
                alt="TAPAS Emblem"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
              <div>
                <h1 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-high)]">
                  TAPAS RESPONSE TASK
                </h1>
                <p className="text-[10px] text-[var(--ink-low)] font-mono">
                  {operation.id}
                </p>
              </div>
            </div>
            <span className="rounded bg-[var(--risk-5)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--ink-high)] uppercase">
              LEVEL 5 EXTREME
            </span>
          </div>

          <div className="pt-3 space-y-1.5 font-variant-numeric tabular-nums">
            <div className="text-sm font-bold text-[var(--ink-high)]">
              {wardName} · Extreme Heat Response
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-semibold">
              <Clock className="h-3.5 w-3.5" />
              <span>Risk Window: {operation.riskWindow}</span>
            </div>
          </div>
        </div>

        {/* Assigned Recipient Card */}
        {recipient && (
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-3.5 space-y-1">
            <div className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)] font-bold">
              Assigned Responder
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-[var(--ink-high)]">{recipient.name}</div>
              <span className="text-[10.5px] px-2 py-0.5 rounded bg-[var(--surface-3)] font-mono text-[var(--accent)] font-bold uppercase">
                {recipient.operationalStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-[11px] text-[var(--ink-mid)]">{recipient.role}</div>
          </div>
        )}

        {/* Message Body */}
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-4 space-y-2">
          <div className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)] font-bold">
            Operational Directive
          </div>
          <div className="whitespace-pre-line text-xs font-mono text-[var(--ink-high)] leading-relaxed bg-[var(--surface-0)] p-3 rounded-lg border border-[var(--line-hair)]">
            {messageBody}
          </div>
          <p className="text-[10px] text-[var(--ink-low)] italic">
            Tap a button below to transmit your physical operational status to Mandal Command.
          </p>
        </div>

        {/* Action Confirmation Banner */}
        {lastAction && (
          <div className="rounded-lg border border-[var(--ok)] bg-[var(--ok)]/15 p-3 text-xs text-[var(--ok)] flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{lastAction}</span>
          </div>
        )}

        {/* Optional Note Input */}
        {showNoteInput && (
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-3 space-y-2">
            <label className="text-[11px] font-bold text-[var(--ink-low)] uppercase block">
              Add Field Note / Incident Detail:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Water shortage at point 3 / 2 cases referred"
              className="w-full rounded-md border border-[var(--line-soft)] bg-[var(--surface-3)] p-2 text-xs text-[var(--ink-high)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </div>

      {/* SECTION 3.8 ACTION BUTTONS */}
      <div className="pt-6 pb-2 space-y-2.5">
        <button
          type="button"
          onClick={() => handleAction('ACKNOWLEDGED', 'ACKNOWLEDGED')}
          className="w-full min-h-[48px] rounded-xl bg-[var(--accent)] text-[var(--surface-0)] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform"
        >
          <Check className="h-4 w-4" />
          <span>ACKNOWLEDGE DIRECTIVE</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction('IN_PROGRESS', 'START RESPONSE')}
          className="w-full min-h-[44px] rounded-xl border border-[var(--line-firm)] bg-[var(--surface-2)] text-[var(--ink-high)] hover:bg-[var(--surface-3)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
        >
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          <span>START RESPONSE ACTIONS</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setShowNoteInput(true)
              handleAction('NEEDS_ASSISTANCE', 'NEED ASSISTANCE')
            }}
            className="min-h-[44px] rounded-xl border border-[var(--risk-4)] bg-[var(--risk-5)]/30 text-[var(--risk-4)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>NEED ASSISTANCE</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('COMPLETED', 'MARK COMPLETE')}
            className="min-h-[44px] rounded-xl border border-[var(--line-soft)] bg-[var(--surface-3)] text-[var(--ok)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>MARK COMPLETE</span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="text-[11px] text-[var(--ink-low)] underline hover:text-[var(--ink-mid)]"
          >
            {showNoteInput ? 'Hide note field' : '+ Add field note or resource request'}
          </button>
        </div>
      </div>
    </div>
  )
}

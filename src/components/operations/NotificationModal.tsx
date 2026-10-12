'use client'

import { useState } from 'react'
import { Send, BellRing, Eye, Check, X, AlertTriangle } from 'lucide-react'
import type { Notification } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationCenterProps {
  notifications: Notification[]
  wardName?: string
  className?: string
  onSendNew?: (payload: Partial<Notification>) => void
}

export function NotificationCenter({
  notifications,
  wardName = 'Ward 42, Kukatpally',
  className,
  onSendNew,
}: NotificationCenterProps) {
  const [list, setList] = useState<Notification[]>(notifications)
  const [composeOpen, setComposeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Form State
  const [headline, setHeadline] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [targetAudience, setTargetAudience] = useState('All Ward Residents & Workforce')
  const [severity, setSeverity] = useState<'Warning' | 'Emergency' | 'Watch'>('Warning')
  const channels = ['SMS', 'WhatsApp Broadcast']

  const audienceEstimate =
    targetAudience.includes('All') ? 34200 : targetAudience.includes('Workforce') ? 4800 : 250

  const handleOpenPreview = () => {
    if (!headline || !messageBody) return
    setPreviewOpen(true)
  }

  const handleConfirmDispatch = () => {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      ward_id: 'ward-42-kukatpally',
      name: headline,
      headline,
      message_body: messageBody,
      notification_type: severity === 'Emergency' ? 'extreme_heat_warning' : 'heat_warning',
      target_audience: targetAudience,
      audience_count: audienceEstimate,
      channels,
      severity,
      delivery_status: 'SENT',
      response_status: 'NOT_ACKNOWLEDGED',
      status: 'Broadcast Dispatched',
      source: 'TAPAS Alert Engine',
      is_demo: true,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      latitude: 17.4933,
      longitude: 78.4018,
    }

    setList((prev) => [newNotif, ...prev])
    onSendNew?.(newNotif)
    setPreviewOpen(false)
    setComposeOpen(false)
    setHeadline('')
    setMessageBody('')
  }

  return (
    <section
      aria-labelledby="notification-center-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="notification-center-heading" className="metric-label text-[var(--text-secondary)]">
              Operational Notification &amp; Delivery Centre
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Decoupled tracking: Message Delivery Status vs. Operational Field Response Status.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setComposeOpen(true)}
          className="bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 font-bold text-xs"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" /> Compose Broadcast
        </Button>
      </div>

      {/* Dispatched Notifications Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Headline / Severity</th>
              <th className="py-2.5 px-4">Target &amp; Reach</th>
              <th className="py-2.5 px-4">Channels</th>
              {/* Separate column 1 */}
              <th className="py-2.5 px-4 font-bold text-amber-300">Message Delivery</th>
              {/* Separate column 2 */}
              <th className="py-2.5 px-4 font-bold text-emerald-300">Operational Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {list.map((n) => (
              <tr key={n.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-[var(--text-primary)]">{n.headline}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Severity: <strong className="text-[var(--risk-4)]">{n.severity}</strong> · Expires{' '}
                    {n.expires_at ? n.expires_at.slice(11, 16) : 'N/A'} IST
                  </div>
                </td>

                <td className="py-3 px-4">
                  <div className="text-[var(--text-secondary)]">{n.target_audience}</div>
                  <div className="text-[10px] text-[var(--text-muted)] tabular-nums">
                    {n.audience_count ? `${n.audience_count.toLocaleString()} recipients` : 'Target group'}
                  </div>
                </td>

                <td className="py-3 px-4 text-[11px] text-[var(--text-muted)]">
                  {n.channels ? n.channels.join(' · ') : 'SMS · WhatsApp'}
                </td>

                {/* Delivery Status Column */}
                <td className="py-3 px-4">
                  <span className="inline-block rounded bg-amber-950/70 border border-amber-800 text-amber-300 px-2 py-0.5 text-[10.5px] font-mono font-bold">
                    {n.delivery_status}
                  </span>
                </td>

                {/* Operational Response Status Column */}
                <td className="py-3 px-4">
                  <span className="inline-block rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 text-[10.5px] font-mono font-bold">
                    {n.response_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-base font-bold text-[var(--text-primary)]">
                Compose Targeted Heat Response Broadcast
              </h4>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Target Geographic Audience:
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]"
                >
                  <option value="All Ward Residents & Workforce">All Ward Residents &amp; Workforce (34,200)</option>
                  <option value="High-Exposure Outdoor Workforce">High-Exposure Outdoor Workforce (4,800)</option>
                  <option value="Primary Health Centres & Hospitals">Primary Health Centres &amp; Hospitals (14)</option>
                  <option value="Mine Safety Supervisors & Labour Leads">Mine Safety Supervisors &amp; Labour Leads (35)</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Alert Severity:
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as 'Warning' | 'Emergency' | 'Watch')}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]"
                >
                  <option value="Warning">Warning (Level 4 Significant Strain)</option>
                  <option value="Emergency">Emergency (Level 5 Extreme Life Danger)</option>
                  <option value="Watch">Watch (Pre-emptive Notice)</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Alert Headline:
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. EXTREME HEAT PROTOCOL: Work suspension ordered in Ward 42"
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Message Body:
                </label>
                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Provide precise instructions, shaded cooling location directions, and medical guidance…"
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                variant="outline"
                onClick={() => setComposeOpen(false)}
                className="border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                Cancel
              </Button>
              <Button
                disabled={!headline || !messageBody}
                onClick={handleOpenPreview}
                className="bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 font-bold"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Preview & Confirmation Modal (No accidental one-click broadcast) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--risk-4)] bg-[var(--bg-primary)] p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2 text-[var(--risk-4)]">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="text-base font-bold text-white">Explicit Broadcast Confirmation</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Confirm before transmitting alert to active channels. This action triggers mass SMS and municipal gateway alerts.
            </p>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Audience Count:</span>
                <strong className="text-[var(--accent)]">{audienceEstimate.toLocaleString()} recipients</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Geography:</span>
                <span className="text-[var(--text-primary)] font-medium">{wardName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Channels:</span>
                <span className="text-[var(--text-primary)]">{channels.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Severity:</span>
                <span className="text-[var(--risk-4)] font-bold">{severity}</span>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-2 mt-2">
                <div className="font-bold text-[var(--text-primary)] mb-1">{headline}</div>
                <p className="text-[var(--text-secondary)] leading-relaxed italic">
                  &ldquo;{messageBody}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                className="border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleConfirmDispatch}
                className="bg-[var(--risk-4)] text-white hover:bg-[var(--risk-5)] font-bold"
              >
                <Check className="mr-1.5 h-4 w-4" /> Authorize &amp; Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>Crucial operational rule: &ldquo;A message being read is not an action being taken.&rdquo;</span>
        <span>Every dispatch requires preview and confirmation · No accidental one-click broadcast.</span>
      </div>
    </section>
  )
}

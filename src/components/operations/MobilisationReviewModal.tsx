'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Send,
  Download,
  Lock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateCapXml, downloadCapXmlFile } from '@/lib/cap'
import { DEFAULT_KUKATPALLY_SCHEDULE } from '@/lib/workSchedule'
import { cn } from '@/lib/utils'

interface MobilisationReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmActivation: (data: {
    reference: string
    groups: string[]
    capXml: string
  }) => void
  wardName?: string
  wardId?: string
  riskLevel?: number
  thermalStressScore?: number
}

export function MobilisationReviewModal({
  isOpen,
  onClose,
  onConfirmActivation,
  wardName = 'Kukatpally Ward',
  wardId = 'ward-42-kukatpally',
  riskLevel = 5,
  thermalStressScore = 8.7,
}: MobilisationReviewModalProps) {
  const isLevel5 = riskLevel >= 5
  const shortCode = wardId.toUpperCase().includes('KKP') || wardName.toLowerCase().includes('kukat') ? 'KKP' : wardId.slice(0, 3).toUpperCase()
  const reference = `TAPAS-${shortCode}-20260909-L${riskLevel}`

  // Recipient group selection state
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({
    ward_officials: true,
    asha_mro: true,
    workers: true,
    healthcare: true,
    misting: false,
    public: false,
    authority: isLevel5, // Auto-checked & locked at Level 5
  })

  // Active message preview tab
  const [activeTab, setActiveTab] = useState<'officials' | 'asha' | 'workers' | 'health' | 'citizen'>('workers')

  // Citizen message is editable
  const [citizenMessage, setCitizenMessage] = useState(
    `TAPAS Heat Alert — ${wardName}\nEXTREME heat today 12:40–17:20. Feels like 43 °C.\n\nAvoid outdoor activity these hours. Water every 20–30 min. Check on elderly neighbours. Nearest cooling point: Community Hall Kukatpally, 800 m.`
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleGroupToggle = (key: string) => {
    if (key === 'authority' && isLevel5) {
      // Locked at Level 5! An officer cannot silently handle an Extreme event alone.
      return
    }
    setSelectedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Generate CAP 1.2 XML with <status>Exercise</status>
  const capXmlContent = generateCapXml({
    identifier: reference,
    event: 'Extreme Heat Stress Advisory',
    urgency: 'Immediate',
    severity: isLevel5 ? 'Extreme' : 'Severe',
    certainty: 'Likely',
    expires: '2026-09-09T17:20:00+05:30',
    senderName: `TAPAS — Mandal ${wardName}`,
    headline: `Extreme heat stress 12:40–17:20 IST in ${wardName}`,
    description: `UTCI ${thermalStressScore}/10. High outdoor worker exposure. Expected impact: 6 excess deaths (range 4-9) de Bont et al. (2024).`,
    instruction: `Suspend heavy outdoor work 12:40–17:20 IST. Hydration and shaded rest cycles per ACGIH/ISO 7243. Activate cooling centres.`,
    areaDesc: `${wardName}, GHMC, Telangana`,
  })

  const handleDownloadCap = () => {
    downloadCapXmlFile(capXmlContent, `${reference}-CAP12.xml`)
  }

  const handleConfirm = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      onConfirmActivation({
        reference,
        groups: Object.keys(selectedGroups).filter((k) => selectedGroups[k]),
        capXml: capXmlContent,
      })
      setIsSubmitting(false)
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] bg-[var(--surface-2)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-dim)] text-[var(--ink-high)]">
              <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-high)]">
                NOTIFY &amp; MOBILISE — {wardName}
              </h2>
              <p className="text-[11px] text-[var(--ink-low)] font-mono">
                Reference: {reference} · Localised Heat Action Trigger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--ink-low)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-high)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto font-sans text-xs">
          {/* SECTION A: SITUATION */}
          <section className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] p-4 space-y-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)] border-b border-[var(--line-hair)] pb-2">
              A. Situation Intelligence (Live Engine Readout)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-variant-numeric tabular-nums">
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)]">Risk Level</span>
                <p className="text-sm font-extrabold text-[var(--risk-5)]">
                  LEVEL {riskLevel} — EXTREME
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)]">Thermal Stress</span>
                <p className="text-sm font-extrabold text-[var(--ink-high)]">
                  {thermalStressScore} / 10 <span className="text-xs font-normal text-[var(--ink-low)]">(UTCI 43.1 °C)</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)]">Risk Window</span>
                <p className="text-xs font-bold text-[var(--accent)]">
                  Today 12:40 – 17:20 IST
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase tracking-wider text-[var(--ink-low)]">Population Exposed</span>
                <p className="text-sm font-bold text-[var(--ink-high)]">
                  124,000 residents
                </p>
              </div>
            </div>

            {/* Impact & Why this ward */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--line-hair)] text-[11px]">
              <div>
                <span className="font-semibold text-[var(--ink-low)] uppercase tracking-wider">Expected Impact:</span>
                <p className="font-bold text-[var(--ink-high)] mt-0.5">
                  6 excess deaths (range 4–9)
                </p>
                <p className="text-[10px] text-[var(--ink-low)] italic mt-0.5">
                  Epidemiological source: de Bont et al., Environ. Int. 184:108461 (2024)
                </p>
              </div>
              <div>
                <span className="font-semibold text-[var(--ink-low)] uppercase tracking-wider">Why this ward was flagged:</span>
                <ul className="mt-0.5 space-y-0.5 text-[var(--ink-mid)]">
                  <li>+ High thermal stress (UTCI 43.1 °C)</li>
                  <li>+ 34% outdoor-worker share in local workforce</li>
                  <li>+ Elderly population above district median (18%)</li>
                  <li>+ No verified cooling point within 2 km radius</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION B: RECIPIENT GROUPS */}
          <section className="space-y-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)]">
              B. Recipient Groups &amp; Live Contact Rollup
            </div>

            <div className="hairline-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* 1. Ward Members */}
              <label
                onClick={() => handleGroupToggle('ward_officials')}
                className="hairline-cell flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.ward_officials}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--accent)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--ink-high)]">Ward Members &amp; Community Heads</div>
                  <div className="text-[10.5px] text-[var(--ink-low)]">4 contacts registered</div>
                </div>
              </label>

              {/* 2. ASHA Workers & MRO */}
              <label
                onClick={() => handleGroupToggle('asha_mro')}
                className="hairline-cell flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.asha_mro}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--accent)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--ink-high)]">ASHA Workers &amp; MRO</div>
                  <div className="text-[10.5px] text-[var(--ink-low)]">3 contacts on duty</div>
                </div>
              </label>

              {/* 3. Labour Unions */}
              <label
                onClick={() => handleGroupToggle('workers')}
                className="hairline-cell flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.workers}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--accent)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--ink-high)]">Labour Unions &amp; Worksites</div>
                  <div className="text-[10.5px] text-[var(--accent)] font-semibold">6 orgs · 1,240 workers</div>
                </div>
              </label>

              {/* 4. Healthcare Facilities */}
              <label
                onClick={() => handleGroupToggle('healthcare')}
                className="hairline-cell flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.healthcare}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--accent)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--ink-high)]">Healthcare Facilities</div>
                  <div className="text-[10.5px] text-[var(--ink-low)]">5 facilities (PHC + CHC)</div>
                </div>
              </label>

              {/* 5. Misting Teams */}
              <label
                onClick={() => handleGroupToggle('misting')}
                className="hairline-cell flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.misting}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--accent)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--ink-high)]">Misting &amp; Water Response</div>
                  <div className="text-[10.5px] text-[var(--ink-low)]">2 teams available</div>
                </div>
              </label>

              {/* 6. Escalate to District Authority (Auto-checked & locked at Level 5) */}
              <label
                onClick={() => handleGroupToggle('authority')}
                className={cn(
                  'hairline-cell flex items-start gap-3 p-3 transition-colors',
                  isLevel5 ? 'bg-[var(--surface-2)] border-l-2 border-[var(--risk-4)]' : 'cursor-pointer'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.authority}
                  disabled={isLevel5}
                  onChange={() => {}}
                  className="mt-0.5 rounded border-[var(--line-soft)] text-[var(--risk-4)] focus:ring-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--ink-high)]">
                    <span>Escalate to District Authority</span>
                    {isLevel5 && <Lock className="h-3 w-3 text-[var(--risk-4)]" />}
                  </div>
                  <div className="text-[10.5px] text-[var(--risk-4)] font-medium">
                    {isLevel5 ? 'Mandatory at Level 5 — Auto-locked' : '1 recipient'}
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* SECTION C: MESSAGE PREVIEW & WORK SCHEDULE */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)]">
                C. Audience-Specific Message Preview &amp; Revised Work Schedule
              </div>
              <span className="text-[10.5px] font-mono text-[var(--ink-low)]">
                Locked templates with variable substitution
              </span>
            </div>

            {/* Audience Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-[var(--line-hair)] pb-1">
              {[
                { id: 'workers', label: 'Labour & Worksites (Signature)' },
                { id: 'officials', label: 'Ward Member' },
                { id: 'asha', label: 'ASHA Worker' },
                { id: 'health', label: 'Healthcare' },
                { id: 'citizen', label: 'Citizen Advisory (Editable)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-[var(--surface-3)] text-[var(--ink-high)] border border-[var(--line-firm)] font-bold'
                      : 'text-[var(--ink-low)] hover:text-[var(--ink-mid)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Labour Union & Worksite with REVISED WORK SCHEDULE */}
            {activeTab === 'workers' && (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--line-hair)] pb-2 text-[11px]">
                  <span className="font-bold text-[var(--accent)] uppercase tracking-wider">
                    TAPAS WORKER PROTECTION NOTICE — {wardName}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-low)]">
                    Ref: {reference}
                  </span>
                </div>

                <p className="text-xs text-[var(--ink-mid)] leading-relaxed">
                  EXTREME thermal stress. WBGT exceeds ACGIH limits 12:40–17:20 IST.
                </p>

                {/* Concrete Auto-Generated Work Schedule */}
                <div className="space-y-2 border border-[var(--line-hair)] rounded-lg p-3 bg-[var(--surface-1)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-high)]">
                      REVISED WORK SCHEDULE — From today&apos;s hourly WBGT forecast
                    </span>
                    <span className="text-[10px] text-[var(--ink-low)]">ISO 7243 / ACGIH TLV</span>
                  </div>

                  {/* Horizontal Timeline */}
                  <div className="grid grid-cols-4 gap-1 pt-2 pb-1">
                    {DEFAULT_KUKATPALLY_SCHEDULE.map((b) => (
                      <div
                        key={b.id}
                        className={cn(
                          'rounded p-2 text-center border',
                          b.isSuspended
                            ? 'bg-[var(--risk-5)]/40 border-[var(--risk-4)] text-[var(--risk-4)]'
                            : b.band === 'warning'
                            ? 'bg-[var(--risk-3)]/20 border-[var(--risk-3)] text-[var(--risk-3)]'
                            : b.band === 'caution'
                            ? 'bg-[var(--risk-2)]/20 border-[var(--risk-2)] text-[var(--risk-2)]'
                            : 'bg-[var(--risk-1)]/20 border-[var(--risk-1)] text-[var(--risk-1)]'
                        )}
                      >
                        <div className="font-mono font-bold text-xs">{b.timeStart}–{b.timeEnd}</div>
                        <div className="text-[10px] mt-0.5 font-semibold">
                          {b.isSuspended ? 'SUSPEND WORK' : `${b.workPct}% work / ${b.restPct}% rest`}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Schedule Details Table */}
                  <div className="overflow-x-auto text-[11px]">
                    <table className="w-full text-left font-variant-numeric tabular-nums">
                      <thead>
                        <tr className="border-b border-[var(--line-hair)] text-[var(--ink-low)]">
                          <th className="py-1">Window</th>
                          <th className="py-1">Guidance</th>
                          <th className="py-1">WBGT Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line-hair)]">
                        {DEFAULT_KUKATPALLY_SCHEDULE.map((b) => (
                          <tr key={b.id} className={b.isSuspended ? 'text-[var(--risk-4)] font-bold' : 'text-[var(--ink-mid)]'}>
                            <td className="py-1.5 font-mono">{b.timeStart} – {b.timeEnd}</td>
                            <td className="py-1.5">{b.guidance}</td>
                            <td className="py-1.5 font-mono">{b.wbgtMin} – {b.wbgtMax} °C</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10.5px] text-[var(--ink-low)] leading-relaxed pt-1">
                    Required: shaded rest area, drinking water within 50 m, supervisor heat-illness checks every 30 minutes.
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[var(--line-hair)]">
                  <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--surface-2)] text-[var(--ink-mid)] text-[11px] font-mono">
                    [ACKNOWLEDGE]
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded bg-[var(--surface-2)] text-[var(--risk-4)] text-[11px] font-mono">
                    [CANNOT COMPLY — REPORT]
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Ward Member */}
            {activeTab === 'officials' && (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 space-y-3 font-mono text-xs text-[var(--ink-mid)] leading-relaxed">
                <div className="font-bold text-[var(--accent)]">
                  TAPAS RESPONSE ACTIVATION — {wardName}
                </div>
                <div>Risk: EXTREME · 12:40–17:20 IST today</div>
                <div className="space-y-1 text-[var(--ink-high)]">
                  <div>Please:</div>
                  <div>• Welfare checks on registered elderly households</div>
                  <div>• Verify drinking water at ward water points</div>
                  <div>• Confirm cooling centre readiness</div>
                  <div>• Report heat-illness incidents through TAPAS</div>
                </div>
                <div className="flex gap-2 pt-2 text-[11px]">
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[ACKNOWLEDGE]</span>
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[NEED ASSISTANCE]</span>
                  <span className="text-[var(--ink-low)] ml-auto">Ref: {reference}</span>
                </div>
              </div>
            )}

            {/* Tab 3: ASHA Worker */}
            {activeTab === 'asha' && (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 space-y-3 font-mono text-xs text-[var(--ink-mid)] leading-relaxed">
                <div className="font-bold text-[var(--accent)]">
                  TAPAS HEALTH ALERT — {wardName} · EXTREME 12:40–17:20
                </div>
                <div className="space-y-1 text-[var(--ink-high)]">
                  <div>Priority households: elderly, pregnant women, infants, chronic illness.</div>
                  <div>Watch for: hot dry skin, confusion, rapid pulse, collapse.</div>
                  <div>Refer suspected heat stroke to PHC Kukatpally (1.4 km) immediately.</div>
                </div>
                <div className="flex gap-2 pt-2 text-[11px]">
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[ACKNOWLEDGE]</span>
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[REPORT CASE]</span>
                  <span className="text-[var(--ink-low)] ml-auto">Ref: {reference}</span>
                </div>
              </div>
            )}

            {/* Tab 4: Healthcare */}
            {activeTab === 'health' && (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 space-y-3 font-mono text-xs text-[var(--ink-mid)] leading-relaxed">
                <div className="font-bold text-[var(--accent)]">
                  TAPAS HEALTHCARE READINESS — PHC {wardName}
                </div>
                <div>EXTREME heat 12:40–17:20. Catchment 124,000.</div>
                <div className="text-[var(--risk-3)]">
                  Heat-patient load: 37 today (7-day avg 22, +68%)
                </div>
                <div className="space-y-1 text-[var(--ink-high)]">
                  <div>Recommended: ORS and IV fluid stock check, cooling protocol readiness, staff roster review 14:00–18:00.</div>
                </div>
                <div className="flex gap-2 pt-2 text-[11px]">
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[ACKNOWLEDGE]</span>
                  <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded">[REQUEST SUPPORT]</span>
                  <span className="text-[var(--ink-low)] ml-auto">Ref: {reference}</span>
                </div>
              </div>
            )}

            {/* Tab 5: Citizen Advisory (Editable) */}
            {activeTab === 'citizen' && (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-low)] block">
                  Citizen Public Broadcast (Officer may edit phrasing before dispatch):
                </label>
                <textarea
                  value={citizenMessage}
                  onChange={(e) => setCitizenMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-[var(--line-soft)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink-high)] focus:border-[var(--accent)] outline-none"
                />
                <p className="text-[10px] text-[var(--ink-low)]">
                  Broadcast via SMS &amp; WhatsApp subscribers. Includes mandatory &ldquo;Reply STOP to opt out&rdquo; footer.
                </p>
              </div>
            )}
          </section>

          {/* SECTION D: CONFIRMATION & AUDIT */}
          <section className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-2)] p-4 space-y-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ink-low)]">
              D. Dispatch Confirmation &amp; Government Standard Integration
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px] font-variant-numeric tabular-nums">
              <div>
                <span className="text-[10.5px] text-[var(--ink-low)] uppercase">Recipients</span>
                <p className="font-bold text-[var(--ink-high)]">18 across 4 groups</p>
                <p className="text-[10px] text-[var(--ink-low)]">1,240 workers reached</p>
              </div>
              <div>
                <span className="text-[10.5px] text-[var(--ink-low)] uppercase">Channels</span>
                <p className="font-bold text-[var(--ink-high)]">In-app · WhatsApp · SMS</p>
                <p className="text-[10px] text-[var(--ink-low)]">Twilio Sandbox + Webhooks</p>
              </div>
              <div>
                <span className="text-[10.5px] text-[var(--ink-low)] uppercase">Validity</span>
                <p className="font-bold text-[var(--accent)]">Today 12:40 – 17:20 IST</p>
                <p className="text-[10px] text-[var(--ink-low)]">Auto-expires 17:20</p>
              </div>
              <div>
                <span className="text-[10.5px] text-[var(--ink-low)] uppercase">CAP 1.2 Schema</span>
                <p className="font-bold text-[var(--ok)]">OASIS Standard ✓</p>
                <p className="text-[10px] text-[var(--ink-low)]">Status: Exercise</p>
              </div>
            </div>

            {/* CAP XML notice */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line-hair)] text-[11px] text-[var(--ink-low)]">
              <span>
                CAP 1.2 XML is consumed by SACHET (NDMA India). Operational deployment requires an NDMA/SDMA agreement.
              </span>
              <button
                type="button"
                onClick={handleDownloadCap}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--ink-high)] font-semibold transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download CAP 1.2 XML</span>
              </button>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--surface-2)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] px-4 py-2 text-xs font-medium text-[var(--ink-mid)] hover:border-[var(--line-firm)] hover:text-[var(--ink-high)] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="bg-[var(--accent)] text-[var(--surface-0)] hover:brightness-110 font-bold text-xs uppercase tracking-wider px-5 min-h-10 transition-all shadow-md"
            >
              {isSubmitting ? (
                <span>Activating response…</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  CONFIRM &amp; ACTIVATE RESPONSE
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

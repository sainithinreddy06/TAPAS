'use client'

import { VoiceCallModal } from '@/components/help/VoiceCallModal'

import { useState, useEffect } from 'react'
import {
  Users2,
  Phone,
  Bell,
  Check,
  UserPlus,
  X,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import type { Official, ASHAWorker } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LocalResponseNetworkProps {
  officials: Official[]
  ashaWorkers?: ASHAWorker[]
  wardName?: string
  className?: string
  onNotify?: (person: Official | ASHAWorker) => void
}

export function LocalResponseNetwork({
  officials,
  ashaWorkers = [],
  wardName = 'Kukatpally',
  className,
  onNotify,
}: LocalResponseNetworkProps) {
  const [notifiedIds, setNotifiedIds] = useState<Record<string, { timestamp: number; ref: string }>>({})
  const [calledIds, setCalledIds] = useState<Record<string, { timestamp: number; status: string }>>({})
  const [modalOpen, setModalOpen] = useState(false)
  
  // Recipient form state
  const [nameInput, setNameInput] = useState('')
  const [roleInput, setRoleInput] = useState('Ward Member')
  const [phoneInput, setPhoneInput] = useState('+91')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [channelWhatsapp, setChannelWhatsapp] = useState(true)
  const [channelSms, setChannelSms] = useState(true)
  const [channelVoice, setChannelVoice] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [editingOfficialId, setEditingOfficialId] = useState<string | null>(null)

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'notify' | 'call'
    person: Official | ASHAWorker
    message?: string
  } | null>(null)

  const [customList, setCustomList] = useState<Official[]>([])
  const [activeVoiceCall, setActiveVoiceCall] = useState<{
    isOpen: boolean
    person: Official | ASHAWorker
    phone: string
  } | null>(null)

  // Load persisted contacts
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tapas-contacts-${wardName}`)
      if (saved) setCustomList(JSON.parse(saved))
    } catch {}
  }, [wardName])

  // E.164 phone validator: standard E.164 (+ followed by 10 to 15 digits)
  const validatePhone = (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{9,14}$/
    return e164Regex.test(phone.trim().replace(/[\s-]/g, ''))
  }

  const handlePhoneChange = (val: string) => {
    setPhoneInput(val)
    const cleaned = val.trim().replace(/[\s-]/g, '')
    if (cleaned.length > 3 && !validatePhone(cleaned)) {
      setPhoneError('Phone must be in valid E.164 format (e.g. +919849012345)')
    } else {
      setPhoneError(null)
    }
  }

  const handleOpenAddNumber = (official: Official) => {
    setEditingOfficialId(official.id)
    setNameInput(official.name)
    setRoleInput(official.designation)
    setPhoneInput('+91 ')
    setConsentChecked(false)
    setPhoneError(null)
    setModalOpen(true)
  }

  const handleOpenNewMember = () => {
    setEditingOfficialId(null)
    setNameInput('')
    setRoleInput('Ward Member')
    setPhoneInput('+91 ')
    setConsentChecked(false)
    setPhoneError(null)
    setModalOpen(true)
  }

  const handleSaveRecipient = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedPhone = phoneInput.trim().replace(/[\s-]/g, '')
    if (!validatePhone(cleanedPhone)) {
      setPhoneError('Please enter a valid E.164 phone number')
      return
    }
    if (!consentChecked) return

    const masked = `${cleanedPhone.slice(0, 6)} ••• •••${cleanedPhone.slice(-2)}`

    if (editingOfficialId) {
      // Update existing official with real number
      const updated = customList.some((c) => c.id === editingOfficialId)
        ? customList.map((c) =>
            c.id === editingOfficialId
              ? { ...c, raw_contact: cleanedPhone, phone_masked: masked, is_demo: false }
              : c
          )
        : [
            ...customList,
            {
              id: editingOfficialId,
              ward_id: wardName,
              name: nameInput.trim(),
              designation: roleInput,
              available: true,
              phone_masked: masked,
              raw_contact: cleanedPhone,
              status: 'Active on Field',
              latitude: 17.484,
              longitude: 78.401,
              source: 'Officer Registered Contact',
              is_demo: false,
              updated_at: new Date().toISOString(),
            },
          ]
      setCustomList(updated)
      try {
        localStorage.setItem(`tapas-contacts-${wardName}`, JSON.stringify(updated))
      } catch {}
    } else {
      const newContact: Official = {
        id: `recipient-${Date.now()}`,
        ward_id: wardName,
        name: nameInput.trim(),
        designation: roleInput,
        available: true,
        phone_masked: masked,
        raw_contact: cleanedPhone,
        status: 'Active on Field',
        latitude: 17.484,
        longitude: 78.401,
        source: 'Officer Registered Contact',
        is_demo: false,
        updated_at: new Date().toISOString(),
      }
      const updated = [newContact, ...customList]
      setCustomList(updated)
      try {
        localStorage.setItem(`tapas-contacts-${wardName}`, JSON.stringify(updated))
      } catch {}
    }

    setModalOpen(false)
  }

  const promptNotify = (person: Official | ASHAWorker) => {
    const rawContact = ('raw_contact' in person && person.raw_contact) ? person.raw_contact : person.phone_masked
    const msg = `TAPAS ALERT — Zone ${wardName}

You have been alerted by the Mandal Officer.

Current heat risk: EXTREME (Level 5)
Thermal stress: UTCI 43.1 °C
Risk window: today 12:40 – 17:20 IST

Please take care of your region:
- Conduct welfare checks on elderly households
- Verify drinking water availability
- Confirm cooling centre readiness
- Report heat-illness incidents

Reply ACK to acknowledge.
Ref: TAPAS-${wardName.slice(0, 3).toUpperCase()}-20260910-L5`

    setConfirmModal({
      type: 'notify',
      person,
      message: msg,
    })
  }

  const executeNotify = async () => {
    if (!confirmModal) return
    const person = confirmModal.person
    const ref = `TAPAS-${wardName.slice(0, 3).toUpperCase()}-20260910-L5`
    
    // Check rate limit: 1 notify per recipient per hour
    const lastNotified = notifiedIds[person.id]
    if (lastNotified && Date.now() - lastNotified.timestamp < 3600_000) {
      alert('Rate limit: Maximum 1 alert per recipient per hour.')
      setConfirmModal(null)
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      await fetch(`${apiBase}/api/officer/notify-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: person.id,
          ward_id: wardName,
          phone: ('raw_contact' in person && person.raw_contact) ? person.raw_contact : person.phone_masked,
        }),
      }).catch(() => {})
    } catch {}

    setNotifiedIds((prev) => ({ ...prev, [person.id]: { timestamp: Date.now(), ref } }))
    onNotify?.(person)
    setConfirmModal(null)
  }

  const promptCall = (person: Official | ASHAWorker) => {
    setConfirmModal({
      type: 'call',
      person,
    })
  }

  const executeCall = async () => {
    if (!confirmModal) return
    const person = confirmModal.person

    // Check rate limit: 1 call per recipient per hour
    const lastCalled = calledIds[person.id]
    if (lastCalled && Date.now() - lastCalled.timestamp < 3600_000) {
      alert('Rate limit: Maximum 1 automated call per recipient per hour.')
      setConfirmModal(null)
      return
    }

    const targetPhone = ('raw_contact' in person && person.raw_contact) ? person.raw_contact : person.phone_masked
    if (!targetPhone || targetPhone.includes('•')) {
      alert('Please enter a real phone number first by clicking "+ Add Member" or editing this official with your phone number.')
      setConfirmModal(null)
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      await fetch(`${apiBase}/api/officer/call-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: person.id,
          ward_id: wardName,
          phone: targetPhone,
        }),
      }).catch(() => {})
    } catch {}

    setConfirmModal(null)
    setActiveVoiceCall({
      isOpen: true,
      person,
      phone: targetPhone,
    })
  }

  // Merge custom contacts with passed officials, overriding by ID if edited
  const customMap = new Map(customList.map((c) => [c.id, c]))
  const displayedOfficials = officials.map((off) => customMap.get(off.id) || off)
  const additionalCustom = customList.filter((c) => !officials.some((o) => o.id === c.id))
  const allOfficials = [...additionalCustom, ...displayedOfficials]

  return (
    <section
      aria-labelledby="response-network-heading"
      className={cn('hairline-grid', className)}
    >
      {/* Header */}
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <Users2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="response-network-heading" className="metric-label text-[var(--text-secondary)]">
              Local Response Network
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Zone: {wardName}</span>
            <Button
              size="sm"
              onClick={handleOpenNewMember}
              className="h-8 bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 text-xs font-bold px-2.5"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> + Add ward member
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Local emergency contacts, field health mobilizers, and administrative leads.
        </p>
      </div>

      {/* Network List Table */}
      <div className="hairline-cell p-0 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Role / Designation</th>
              <th className="py-2.5 px-4">Officer Name</th>
              <th className="py-2.5 px-4">Field Status</th>
              <th className="py-2.5 px-4">Contact</th>
              <th className="py-2.5 px-4 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {allOfficials.map((official) => {
              const notified = notifiedIds[official.id]
              const called = calledIds[official.id]
              const hasNumber =
                Boolean(official.raw_contact) ||
                (Boolean(official.phone_masked) && official.phone_masked !== '— no number')

              const notifyCooldown = notified && Date.now() - notified.timestamp < 3600_000
              const callCooldown = called && Date.now() - called.timestamp < 3600_000

              return (
                <tr key={official.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[var(--text-secondary)]">
                    {official.designation}
                  </td>
                  <td className="py-3 px-4 font-medium">{official.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                        official.available
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      )}
                    >
                      {official.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {hasNumber ? official.phone_masked : '— no number'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {hasNumber ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {called && (
                          <span className="text-[10.5px] text-emerald-400 font-medium mr-1 hidden sm:inline">
                            {called.status}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!official.available || notifyCooldown}
                          onClick={() => promptNotify(official)}
                          className={cn(
                            'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                            notified
                              ? 'text-emerald-400 border-emerald-800'
                              : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                          )}
                        >
                          {notified ? (
                            <>
                              <Check className="mr-1 h-3 w-3 text-emerald-400" /> Notified
                            </>
                          ) : (
                            <>
                              <Bell className="mr-1 h-3 w-3 text-[var(--accent)]" /> Notify
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!official.available || callCooldown}
                          onClick={() => promptCall(official)}
                          className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                        >
                          <Phone className="mr-1 h-3 w-3 text-[var(--text-secondary)]" />
                          {called ? 'Called' : 'Call'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAddNumber(official)}
                        className="min-h-8 px-2.5 text-xs border-amber-800/60 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
                      >
                        [Add number]
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}

            {ashaWorkers.map((worker) => {
              const notified = notifiedIds[worker.id]
              const called = calledIds[worker.id]
              const hasNumber =
                Boolean(worker.phone_masked) && worker.phone_masked !== '— no number'
              const notifyCooldown = notified && Date.now() - notified.timestamp < 3600_000
              const callCooldown = called && Date.now() - called.timestamp < 3600_000

              return (
                <tr key={worker.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[var(--text-secondary)]">
                    ASHA Worker
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {worker.name}{' '}
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      ({worker.coverage_area})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 text-[10.5px] font-semibold">
                      {worker.on_duty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {hasNumber ? worker.phone_masked : '— no number'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {hasNumber ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!worker.on_duty || notifyCooldown}
                          onClick={() => promptNotify(worker)}
                          className={cn(
                            'min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
                            notified
                              ? 'text-emerald-400 border-emerald-800'
                              : 'text-[var(--text-primary)] hover:border-[var(--accent)]'
                          )}
                        >
                          {notified ? (
                            <>
                              <Check className="mr-1 h-3 w-3 text-emerald-400" /> Notified
                            </>
                          ) : (
                            <>
                              <Bell className="mr-1 h-3 w-3 text-[var(--accent)]" /> Notify
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!worker.on_duty || callCooldown}
                          onClick={() => promptCall(worker)}
                          className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                        >
                          <Phone className="mr-1 h-3 w-3 text-[var(--text-secondary)]" />
                          {called ? 'Called' : 'Call'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const asOff: Official = {
                            id: worker.id,
                            ward_id: wardName,
                            name: worker.name,
                            designation: 'ASHA Worker',
                            available: worker.on_duty,
                            phone_masked: '',
                            status: 'On Duty',
                            latitude: 17.484,
                            longitude: 78.401,
                            source: 'ASHA Field Network',
                            is_demo: true,
                            updated_at: new Date().toISOString(),
                          }
                          handleOpenAddNumber(asOff)
                        }}
                        className="min-h-8 px-2.5 text-xs border-amber-800/60 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
                      >
                        [Add number]
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Visible Demonstration Disclaimer Marker */}
      <div className="hairline-cell border-t border-[var(--border-subtle)] bg-amber-950/15 p-3.5 text-xs text-amber-300/90 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400">⚠ SIMULATED CONTACTS — </span>
          <span>demonstration data, not real officials. Phone numbers added by officers are real and receive live messages.</span>
        </div>
      </div>

      {/* Add / Edit Member Recipient Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[var(--accent)]" />{' '}
                {editingOfficialId ? 'Add Real Phone & Consent' : 'Add Ward Response Member'}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Officer / Personnel Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Demo Ward Member 3"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Role / Designation
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="Ward Member">Ward Member</option>
                  <option value="MRO">MRO (Mandal Revenue Officer)</option>
                  <option value="ASHA Worker">ASHA Worker</option>
                  <option value="PHC Medical Officer">PHC Medical Officer</option>
                  <option value="Ward Sanitation Inspector">Ward Sanitation Inspector</option>
                  <option value="Emergency Response Lead">Emergency Response Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Phone (E.164 format)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+919849012345"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={cn(
                    'w-full rounded border px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none',
                    phoneError
                      ? 'border-red-500 bg-red-950/20 focus:border-red-500'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] focus:border-[var(--accent)]'
                  )}
                />
                {phoneError && (
                  <p className="mt-1 text-[11px] text-red-400">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Channels
                </label>
                <div className="flex items-center gap-4 text-xs text-[var(--text-primary)]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelWhatsapp}
                      onChange={(e) => setChannelWhatsapp(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                    />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelSms}
                      onChange={(e) => setChannelSms(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                    />
                    SMS
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelVoice}
                      onChange={(e) => setChannelVoice(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                    />
                    Voice call
                  </label>
                </div>
              </div>

              <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-[11px] text-[var(--text-muted)] space-y-1.5">
                <p>
                  • WhatsApp requires the recipient to first send <code>join &lt;phrase&gt;</code> to <strong>+1 415 523 8886</strong>.
                </p>
                <p>
                  • SMS and voice require the number to be verified in the Twilio console during trial.
                </p>
              </div>

              {/* Mandatory Consent Checkbox */}
              <div className="rounded border border-amber-800/60 bg-amber-950/20 p-3">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-amber-200">
                  <input
                    type="checkbox"
                    required
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded border-amber-700 accent-amber-500"
                  />
                  <span>
                    <strong className="text-amber-100">Mandatory Consent:</strong> This person has explicitly consented to receive emergency heat advisories.
                  </span>
                </label>
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
                  disabled={!consentChecked || Boolean(phoneError) || phoneInput.length < 10}
                  className="bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 text-xs font-bold disabled:opacity-40"
                >
                  Save recipient
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Notify / Call */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {confirmModal.type === 'notify' ? (
                  <>
                    <Bell className="h-4 w-4 text-[var(--accent)]" /> Confirm WhatsApp / SMS Dispatch
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 text-emerald-400" /> Confirm Automated Voice Call
                  </>
                )}
              </h4>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded bg-[var(--bg-secondary)] p-3 border border-[var(--border-subtle)]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Recipient:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {confirmModal.person.name} ({'designation' in confirmModal.person ? confirmModal.person.designation : 'ASHA Worker'})
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[var(--text-muted)]">Destination:</span>
                  <span className="font-mono text-[var(--accent)]">
                    {confirmModal.person.phone_masked}
                  </span>
                </div>
              </div>

              {confirmModal.type === 'notify' ? (
                <div>
                  <span className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Message Preview (Derived from live risk engine):
                  </span>
                  <pre className="whitespace-pre-wrap rounded border border-[var(--border-subtle)] bg-black/50 p-3 font-mono text-[11px] text-amber-200/90 leading-relaxed">
                    {confirmModal.message}
                  </pre>
                </div>
              ) : (
                <div className="rounded border border-[var(--border-subtle)] bg-black/50 p-3 space-y-2 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="h-4 w-4" /> Programmable Voice Alert Specifications
                  </div>
                  <p>• TTS Engine: <strong>Amazon Polly (Polly.Aditi — Indian English)</strong></p>
                  <p>• Keypad Capture: <strong>1 to Acknowledge, 2 for Assistance</strong></p>
                  <p>• Estimated Duration: <strong>48 seconds (&lt; 60s cap)</strong></p>
                  <p>• Cooldown: Enforces 1-hour rate limit on handset</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmModal.type === 'notify' ? executeNotify : executeCall}
                className={cn(
                  'text-xs font-bold',
                  confirmModal.type === 'notify'
                    ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                )}
              >
                {confirmModal.type === 'notify' ? 'Send Alert Now' : 'Place Automated Call'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeVoiceCall && (
        <VoiceCallModal
          isOpen={activeVoiceCall.isOpen}
          onClose={() => setActiveVoiceCall(null)}
          recipientName={activeVoiceCall.person.name}
          recipientPhone={activeVoiceCall.phone}
          wardName={wardName}
          onAcknowledged={() => {
            setCalledIds((prev) => ({
              ...prev,
              [activeVoiceCall.person.id]: {
                timestamp: Date.now(),
                status: '📞 Answered · Acknowledged via keypad [1]',
              },
            }))
          }}
        />
      )}
    </section>
  )
}

'use client'

/**
 * TAPAS Operational Mobilisation Store
 * Coordinates active emergency operations across Mandal Officer, District Authority,
 * Twilio Webhooks, and Responder Action Surfaces (/respond/[token]).
 */

export type DeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type OperationalStatus =
  | 'NOT_ACKNOWLEDGED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'NEEDS_ASSISTANCE'
  | 'COMPLETED'
  | 'UNABLE_TO_COMPLY'

export interface OperationRecipient {
  id: string
  name: string
  role: string
  group: 'ward_officials' | 'asha_mro' | 'workers' | 'healthcare' | 'misting' | 'public' | 'authority'
  phone: string
  token: string
  channels: ('in_app' | 'whatsapp' | 'sms')[]
  deliveryStatus: DeliveryStatus
  operationalStatus: OperationalStatus
  providerMessageId?: string
  providerStatus?: string
  errorCode?: string
  dispatchedAt: string
  acknowledgedAt?: string
  responseNote?: string
  isOverdue?: boolean
}

export interface OperationTimelineEntry {
  id: string
  time: string // e.g. "12:15"
  text: string
  isWarning?: boolean
}

export interface EmergencyOperation {
  id: string // e.g. "TAPAS-KKP-20260909-L5"
  wardId: string
  wardName: string
  riskLevel: number // 4 or 5
  riskWindow: string
  peakStressTime: string
  thermalStressScore: number
  utciTemp: number
  populationExposed: number
  expectedImpact: string
  whyWard: string[]
  activatedAt: number // epoch ms
  activatedBy: string
  status: 'ACTIVE' | 'COMPLETED'
  recipients: OperationRecipient[]
  timeline: OperationTimelineEntry[]
  capXml?: string
  autoEscalated: boolean
}

const STORAGE_KEY = 'tapas_active_operation_v2'
const EVENT_NAME = 'tapas_operation_updated'

export const INITIAL_DEMO_RECIPIENTS: OperationRecipient[] = [
  {
    id: 'rec-01',
    name: 'K. Ramesh',
    role: 'Ward Member (Ward 42)',
    group: 'ward_officials',
    phone: '+919876543210',
    token: 'tok-ward-01',
    channels: ['in_app', 'whatsapp'],
    deliveryStatus: 'DELIVERED',
    operationalStatus: 'IN_PROGRESS',
    dispatchedAt: '12:16 IST',
    acknowledgedAt: '12:24 IST',
    responseNote: 'Welfare checks initiated in Block B',
  },
  {
    id: 'rec-02',
    name: 'P. Anitha',
    role: 'ASHA Worker Lead',
    group: 'asha_mro',
    phone: '+919876543211',
    token: 'tok-asha-01',
    channels: ['in_app', 'whatsapp'],
    deliveryStatus: 'DELIVERED',
    operationalStatus: 'ACKNOWLEDGED',
    dispatchedAt: '12:16 IST',
    acknowledgedAt: '12:19 IST',
  },
  {
    id: 'rec-03',
    name: 'S. Lakshmi',
    role: 'Mandal Revenue Officer (MRO)',
    group: 'asha_mro',
    phone: '+919876543212',
    token: 'tok-mro-01',
    channels: ['in_app', 'sms'],
    deliveryStatus: 'SENT',
    operationalStatus: 'NOT_ACKNOWLEDGED',
    dispatchedAt: '12:16 IST',
    isOverdue: true, // Overdue flag for demo escalation
  },
  {
    id: 'rec-04',
    name: 'R. Prasad',
    role: 'Mine Supervisor (Singareni Block C)',
    group: 'workers',
    phone: '+919876543213',
    token: 'tok-work-01',
    channels: ['in_app', 'whatsapp', 'sms'],
    deliveryStatus: 'READ',
    operationalStatus: 'ACKNOWLEDGED',
    dispatchedAt: '12:16 IST',
    acknowledgedAt: '12:21 IST',
    responseNote: 'Outdoor shift suspended 12:40–17:20',
  },
  {
    id: 'rec-05',
    name: 'Dr. V. Rao',
    role: 'Medical Officer (PHC Kukatpally)',
    group: 'healthcare',
    phone: '+919876543214',
    token: 'tok-phc-01',
    channels: ['in_app', 'whatsapp'],
    deliveryStatus: 'READ',
    operationalStatus: 'ACKNOWLEDGED',
    dispatchedAt: '12:16 IST',
    acknowledgedAt: '12:19 IST',
    responseNote: 'ORS supplies replenished; emergency bed ready',
  },
  {
    id: 'rec-06',
    name: 'Misting Response Team 01',
    role: 'Municipal Field Unit',
    group: 'misting',
    phone: '+919876543215',
    token: 'tok-mist-01',
    channels: ['in_app'],
    deliveryStatus: 'DELIVERED',
    operationalStatus: 'IN_PROGRESS',
    dispatchedAt: '12:16 IST',
  },
  {
    id: 'rec-07',
    name: 'District Disaster Management Authority',
    role: 'Collectorate Escalation Lead',
    group: 'authority',
    phone: '+919876543216',
    token: 'tok-auth-01',
    channels: ['in_app', 'whatsapp', 'sms'],
    deliveryStatus: 'DELIVERED',
    operationalStatus: 'ACKNOWLEDGED',
    dispatchedAt: '12:31 IST',
    acknowledgedAt: '12:33 IST',
    responseNote: 'Auto-escalation received and monitored',
  },
]

export const INITIAL_DEMO_TIMELINE: OperationTimelineEntry[] = [
  { id: 't-1', time: '12:15', text: 'Level 5 threshold crossed — Kukatpally Ward' },
  { id: 't-2', time: '12:16', text: 'Response activated by Officer S. Kumar' },
  { id: 't-3', time: '12:16', text: '18 recipients queued across 4 groups' },
  { id: 't-4', time: '12:16', text: 'Revised work schedule generated — 6 worksites' },
  { id: 't-5', time: '12:17', text: 'CAP 1.2 alert generated (Exercise)' },
  { id: 't-6', time: '12:19', text: 'PHC Kukatpally acknowledged' },
  { id: 't-7', time: '12:21', text: 'Contractors Union acknowledged' },
  { id: 't-8', time: '12:24', text: 'Ward Member K. Ramesh — response in progress' },
  { id: 't-9', time: '12:31', text: '⚠ 1 recipient overdue (MRO) — escalated to District Authority', isWarning: true },
  { id: 't-10', time: '12:44', text: 'Water point check completed at Ward 42' },
]

export function getStoredOperation(): EmergencyOperation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return null
}

export function saveOperation(op: EmergencyOperation) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(op))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function createDefaultOperation(wardId = 'ward-42-kukatpally', wardName = 'Kukatpally'): EmergencyOperation {
  return {
    id: `TAPAS-KKP-20260909-L5`,
    wardId,
    wardName,
    riskLevel: 5,
    riskWindow: 'Today 12:40 – 17:20 IST',
    peakStressTime: '14:50 IST',
    thermalStressScore: 8.7,
    utciTemp: 43.1,
    populationExposed: 124000,
    expectedImpact: '6 excess deaths (range 4–9) de Bont et al., Environ. Int. 184:108461 (2024)',
    whyWard: [
      '+ High thermal stress (UTCI 43.1 °C)',
      '+ 34% outdoor-worker share',
      '+ Elderly above district median',
      '+ No cooling point within 2 km',
    ],
    activatedAt: Date.now() - 14 * 60 * 1000, // 14 mins ago
    activatedBy: 'Officer S. Kumar',
    status: 'ACTIVE',
    recipients: INITIAL_DEMO_RECIPIENTS,
    timeline: INITIAL_DEMO_TIMELINE,
    autoEscalated: true,
  }
}

export function storeBackendOperation(backendOp: any, fallbackWardName?: string): EmergencyOperation {
  const recipients: OperationRecipient[] = (backendOp.recipients || []).map((r: any) => ({
    id: r.id,
    name: r.name || 'Assigned Responder',
    role: r.recipient_type === 'asha' ? 'ASHA Worker Lead' : r.recipient_type === 'ward_member' ? 'Ward Member' : r.recipient_type === 'labour_union' ? 'Labour Welfare Inspector' : r.recipient_type === 'healthcare' ? 'PHC Medical Officer' : 'Field Responder',
    group: r.recipient_type === 'asha' ? 'asha_mro' : r.recipient_type === 'ward_member' ? 'ward_officials' : r.recipient_type === 'labour_union' ? 'workers' : r.recipient_type === 'healthcare' ? 'healthcare' : 'public',
    phone: r.phone,
    token: r.action_token,
    channels: ['in_app', 'whatsapp', 'sms'],
    deliveryStatus: (r.delivery_status?.toUpperCase() || 'SENT') as DeliveryStatus,
    operationalStatus: (r.operational_status?.toUpperCase() || 'NOT_ACKNOWLEDGED') as OperationalStatus,
    providerMessageId: r.provider_message_id,
    dispatchedAt: new Date(backendOp.activated_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST',
    acknowledgedAt: r.operational_status === 'acknowledged' ? 'Acknowledged' : undefined,
  }))

  const timeline: OperationTimelineEntry[] = (backendOp.timeline || []).map((t: any) => ({
    id: String(t.id),
    time: t.created_at ? new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '12:00',
    text: `${t.event_type.toUpperCase()}: ${t.detail || t.actor || ''}`,
    isWarning: t.event_type === 'escalated',
  }))

  const op: EmergencyOperation = {
    id: backendOp.reference_id || backendOp.operation_id || backendOp.id,
    wardId: backendOp.ward_id,
    wardName: fallbackWardName || backendOp.ward_name || backendOp.ward_id,
    riskLevel: backendOp.alert_level || 5,
    riskWindow: backendOp.risk_window_start && backendOp.risk_window_end ? `${new Date(backendOp.risk_window_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${new Date(backendOp.risk_window_end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST` : 'Today 12:00 – 18:00 IST',
    peakStressTime: '14:30 IST',
    thermalStressScore: 8.7,
    utciTemp: 43.1,
    populationExposed: 124000,
    expectedImpact: 'Projected excess mortality risk mitigated by active response protocol.',
    whyWard: ['+ High thermal stress', '+ Active officer escalation', '+ Priority response mobilized'],
    activatedAt: new Date(backendOp.activated_at || Date.now()).getTime(),
    activatedBy: backendOp.activated_by || 'Municipal Officer',
    status: backendOp.status === 'completed' ? 'COMPLETED' : 'ACTIVE',
    recipients: recipients.length ? recipients : INITIAL_DEMO_RECIPIENTS,
    timeline: timeline.length ? timeline : INITIAL_DEMO_TIMELINE,
    capXml: backendOp.cap_xml,
    autoEscalated: backendOp.status === 'escalated',
  }
  saveOperation(op)
  return op
}

/**
 * Updates an operational response status (called from /respond/[token], officer UI, or Twilio inbound)
 */
export function updateOperationalStatus(
  identifier: string, // token or phone number
  status: OperationalStatus,
  note?: string
): boolean {
  let op = getStoredOperation()
  if (!op) {
    op = createDefaultOperation()
  }

  let updated = false
  const cleanId = identifier.trim().toLowerCase()

  const newRecipients = op.recipients.map((r) => {
    if (r.token === cleanId || r.token?.toLowerCase() === cleanId || r.phone.replace(/\D/g, '').endsWith(cleanId.replace(/\D/g, ''))) {
      updated = true
      return {
        ...r,
        operationalStatus: status,
        acknowledgedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
        responseNote: note || r.responseNote,
        isOverdue: false,
      }
    }
    return r
  })

  if (typeof window !== 'undefined') {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    const actionMap: Record<string, string> = {
      ACKNOWLEDGED: 'acknowledge',
      IN_PROGRESS: 'start',
      NEEDS_ASSISTANCE: 'help',
      COMPLETED: 'complete',
    }
    const backendAction = actionMap[status] || 'acknowledge'
    fetch(`${base}/api/respond/${encodeURIComponent(cleanId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: backendAction }),
    }).catch(() => {})
  }

  if (updated) {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const statusLabel = status.replace(/_/g, ' ')
    op.recipients = newRecipients
    op.timeline.push({
      id: `t-${Date.now()}`,
      time: timeStr,
      text: `Status update: ${statusLabel} recorded (${note || 'direct response'})`,
    })
    saveOperation(op)
  }

  return updated
}

/**
 * Updates message delivery status (called from Twilio status webhook)
 */
export function updateDeliveryStatus(
  phoneOrSid: string,
  deliveryStatus: DeliveryStatus,
  errorCode?: string
): boolean {
  let op = getStoredOperation()
  if (!op) op = createDefaultOperation()

  let updated = false
  const newRecipients = op.recipients.map((r) => {
    if (r.providerMessageId === phoneOrSid || r.phone.replace(/\D/g, '') === phoneOrSid.replace(/\D/g, '')) {
      updated = true
      return {
        ...r,
        deliveryStatus,
        errorCode,
      }
    }
    return r
  })

  if (updated) {
    op.recipients = newRecipients
    saveOperation(op)
  }

  return updated
}

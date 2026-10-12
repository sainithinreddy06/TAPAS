/**
 * OASIS Common Alerting Protocol (CAP) v1.2 Generator
 * Standardized XML format consumed by SACHET (NDMA India National Disaster Alert Portal).
 * In demonstration mode, <status> is strictly set to 'Exercise'.
 */

export interface CapAlertPayload {
  identifier: string
  sender?: string
  sent?: string
  status?: 'Exercise' | 'Draft' // Never 'Actual' in demonstration mode
  msgType?: 'Alert' | 'Update' | 'Cancel'
  scope?: 'Public' | 'Restricted'
  category?: 'Health' | 'Safety' | 'Met'
  event: string
  urgency: 'Immediate' | 'Expected' | 'Future'
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor'
  certainty: 'Observed' | 'Likely' | 'Possible'
  expires: string
  senderName: string
  headline: string
  description: string
  instruction: string
  areaDesc: string
  polygon?: string
}

export function generateCapXml(payload: CapAlertPayload): string {
  const sent = payload.sent || new Date().toISOString()
  const status = payload.status || 'Exercise' // Enforce Exercise for demonstration
  const sender = payload.sender || 'tapas@sih2026.in'
  const polygon = payload.polygon || '17.485,78.410 17.505,78.425 17.495,78.445 17.475,78.430 17.485,78.410'

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${payload.identifier}</identifier>
  <sender>${sender}</sender>
  <sent>${sent}</sent>
  <status>${status}</status>
  <msgType>${payload.msgType || 'Alert'}</msgType>
  <scope>${payload.scope || 'Public'}</scope>
  <info>
    <category>${payload.category || 'Health'}</category>
    <event>${payload.event}</event>
    <urgency>${payload.urgency}</urgency>
    <severity>${payload.severity}</severity>
    <certainty>${payload.certainty}</certainty>
    <expires>${payload.expires}</expires>
    <senderName>${payload.senderName}</senderName>
    <headline>${payload.headline}</headline>
    <description>${escapeXml(payload.description)}</description>
    <instruction>${escapeXml(payload.instruction)}</instruction>
    <area>
      <areaDesc>${payload.areaDesc}</areaDesc>
      <polygon>${polygon}</polygon>
    </area>
  </info>
</alert>`.trim()
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Downloads generated XML file in the browser
 */
export function downloadCapXmlFile(xmlContent: string, filename = 'TAPAS-Alert.xml') {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

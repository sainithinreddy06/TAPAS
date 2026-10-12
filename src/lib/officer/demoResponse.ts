/**
 * Local-only record of "Prepare Response" demo activations. Never sent to a
 * server — this exists purely so the officer demo has something to show for
 * itself if the browser is reopened, not as an operational log.
 */
export interface PreparedResponse {
  id: string
  wardId: string
  wardName: string
  riskLevel: number
  createdAt: string
}

const KEY = 'tapas-demo-prepared-responses-v1'

export function listPreparedResponses(): PreparedResponse[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(data) ? (data as PreparedResponse[]) : []
  } catch {
    return []
  }
}

export function savePreparedResponse(record: PreparedResponse): void {
  try {
    const next = [...listPreparedResponses().filter((r) => r.id !== record.id), record].slice(-20)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* Demo-only persistence; a failed write must not block the confirmation UI. */
  }
}

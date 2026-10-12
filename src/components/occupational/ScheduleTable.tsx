import { validWorkRest } from '@/components/occupational/WbgtChart'
import type { OccupationalResponse, OccupationalWindow } from '@/lib/types'

export function ScheduleTable({ data, state }: {
  data?: OccupationalResponse
  state: 'loading' | 'error' | 'unavailable' | 'ready'
}) {
  const fmt = (windows: OccupationalWindow[] | null | undefined) => windows?.length
    ? windows.map((window) => `${window.start}–${window.end}`).join(', ')
    : 'No windows supplied'
  const workRest = data?.work_rest
  const validRatio = workRest && validWorkRest(workRest.work_pct, workRest.rest_pct)
  return (
    <section className="rounded-lg border border-border bg-card p-3 sm:p-4" data-testid="work-schedule">
      <h2 className="mb-2 text-sm font-semibold">Supplied work schedule</h2>
      {state !== 'ready' || !data ? <p role="status" className="text-sm tapas-subtext">{state === 'loading' ? 'Loading work/rest guidance…' : 'Work/rest guidance unavailable. Missing data does not permit continuous work.'}</p> : (
        <dl className="divide-y divide-border">
          {[
            { label: 'Source-designated safe windows', value: fmt(data.safe_windows) },
            { label: 'Source-designated avoid windows', value: fmt(data.avoid_windows) },
            { label: 'Work/rest guidance', value: validRatio ? `${workRest.work_pct}% work / ${workRest.rest_pct}% rest for ${workRest.window.start}–${workRest.window.end}` : 'Work/rest guidance unavailable' },
          ].map((row) => <div key={row.label} className="flex flex-wrap gap-x-3 gap-y-1 py-2">
            <dt className="w-full text-xs font-medium tapas-subtext sm:w-52">{row.label}</dt><dd className="min-w-0 flex-1 break-words text-sm font-medium">{row.value}</dd>
          </div>)}
        </dl>
      )}
    </section>
  )
}

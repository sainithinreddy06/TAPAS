'use client'
import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DEMO_COMMUNITY_CONTACTS } from '@/data/demoContacts'
import { RISK_LABELS } from '@/lib/constants'
import { savePreparedResponse } from '@/lib/officer/demoResponse'
import type { WardRisk } from '@/lib/types'
import { longDate } from '@/lib/utils'

const RECOMMENDED_ACTIONS = [
  'Open cooling centres in this ward',
  'Restrict outdoor work 12pm–4pm',
  'Advisory in Telugu and Hindi',
]

export interface PrepareResponseTriggerProps {
  wardName: string
  day: WardRisk
  facilitiesCount: number
}

/** Only ever rendered by the caller when risk_level is already 4 or 5 — this guard is a second line of defence. */
export function PrepareResponseTrigger({ wardName, day, facilitiesCount }: PrepareResponseTriggerProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'activating' | 'active'>('idle')
  const [checked, setChecked] = useState<boolean[]>(() => RECOMMENDED_ACTIONS.map(() => true))

  if (day.risk_level === null || day.risk_level < 4) return null

  function close(next: boolean) {
    setOpen(next)
    if (!next) window.setTimeout(() => setStatus('idle'), 200)
  }

  function confirm() {
    setStatus('activating')
    savePreparedResponse({
      id: `${day.ward_id}:${day.date}:${Date.now()}`,
      wardId: day.ward_id,
      wardName,
      riskLevel: day.risk_level ?? 0,
      createdAt: new Date().toISOString(),
    })
    window.setTimeout(() => setStatus('active'), 1200)
  }

  return (
    <>
      <Button variant="destructive" className="mt-2 flex w-full min-h-11 items-center gap-2" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        Prepare Response
      </Button>

      <Sheet open={open} onOpenChange={close}>
        <SheetContent side="bottom" className="h-[85dvh] overflow-y-auto p-0" data-testid="prepare-response-panel">
          <SheetHeader className="items-start space-y-1.5 text-left">
            <SheetTitle>Prepare Response &mdash; {wardName}</SheetTitle>
            <SheetDescription className="sr-only">
              Review and activate a heat response for this ward.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="inline font-semibold">Affected area: </dt>
                <dd className="inline">
                  {wardName} (Level {day.risk_level} &mdash; {RISK_LABELS[day.risk_level]})
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Date: </dt>
                <dd className="inline">{longDate(day.date)}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Expected impact: </dt>
                <dd className="inline">
                  {day.excess_deaths === null
                    ? 'Unavailable'
                    : `${Math.round(day.excess_deaths)} expected excess deaths${
                        day.excess_deaths_low !== null && day.excess_deaths_high !== null
                          ? ` (range ${Math.round(day.excess_deaths_low)}–${Math.round(day.excess_deaths_high)})`
                          : ''
                      }`}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">Recommended actions</h3>
              <ul className="mt-2 space-y-1">
                {RECOMMENDED_ACTIONS.map((action, i) => (
                  <li key={action}>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked[i]}
                        onChange={(e) => setChecked((c) => c.map((v, idx) => (idx === i ? e.target.checked : v)))}
                        className="h-4 w-4"
                      />
                      {action}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
                Recipients
              </h3>
              <p className="mt-1 text-sm">
                {DEMO_COMMUNITY_CONTACTS.length} community contacts on file &middot; {facilitiesCount} registered facilities
              </p>
            </div>

            {status === 'idle' ? (
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-11 flex-1" onClick={() => close(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="min-h-11 flex-1" onClick={confirm}>
                  Confirm &amp; Activate Response
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-border p-3 text-sm" role="status">
                <p className="flex items-center gap-2 font-semibold">
                  {status === 'activating' ? 'Preparing response…' : 'Response activated'}
                </p>
                <p className="mt-1 text-xs tapas-subtext">
                  Recorded locally in this browser only. No message was sent to any real person or agency.
                </p>
                <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => close(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

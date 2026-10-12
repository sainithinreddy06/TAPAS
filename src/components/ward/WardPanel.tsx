'use client'
import { DataStatus } from '@/components/data/DataStatus'

import { useEffect, useMemo, useState } from 'react'
import { Moon, X } from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { alertValidity } from '@/components/alerts/validity'

import { DeathsDisplay } from '@/components/risk/DeathsDisplay'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { PrepareResponseTrigger } from '@/components/officer/PrepareResponsePanel'
import { FacilitiesTab } from '@/components/ward/FacilitiesTab'
import { RiskStrip } from '@/components/ward/RiskStrip'
import { UtciChart } from '@/components/ward/UtciChart'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAlerts } from '@/hooks/useAlerts'
import { useWard } from '@/hooks/useWard'
import {
  LANGUAGES,
  TRANSLATION_DISCLAIMER,
} from '@/lib/constants'
import type { Language, WardRisk } from '@/lib/types'
import { cn, formatTemp, formatDateTime, longDate } from '@/lib/utils'

export interface WardPanelProps {
  wardId: string
  wardName?: string
  selectedDate: string
  onDaySelect: (date: string) => void
  onClose: () => void
  className?: string
  officer?: boolean
}

export function WardPanel({
  wardId,
  wardName,
  selectedDate,
  onDaySelect,
  onClose,
  className,
  officer = false,
}: WardPanelProps) {
  const { forecast, risk, facilities } = useWard(wardId)
  const alerts = useAlerts(1, 200)
  const alertData = alerts.data
  const { location } = useLocation()
  const [language, setLanguage] = useState<Language>('en')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const days = risk.data?.ward_id === wardId ? risk.data.days : []
  const today: WardRisk | undefined =
    days.find((d) => d.date === selectedDate && d.ward_id === wardId)

  const displayName = risk.data?.ward_name ?? wardName ?? wardId

  const alert = useMemo(
    () =>
      alertData?.alerts.filter(
        (a) => a.ward_id === wardId && a.date === selectedDate && !['expired', 'scheduled'].includes(alertValidity(a, now)),
      ).sort((a, b) => (b.issued_at ? Date.parse(b.issued_at) : 0) - (a.issued_at ? Date.parse(a.issued_at) : 0))[0],
    [alertData, wardId, selectedDate, now],
  )

  return (
    <aside
      data-testid="ward-panel"
      aria-label={`Ward detail: ${displayName}`}
      className={cn('flex h-full flex-col bg-card', className)}
    >
      <header className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold">{displayName}</h2>
          <p className="mt-1 text-xs tapas-subtext">{longDate(selectedDate)}</p>
          <div className="mt-1.5">
            {today ? (
              <RiskBadge level={today.risk_level} size="md" />
            ) : (
              <span className="text-xs tapas-subtext">
                {risk.isPending ? 'Loading ward…' : risk.isError ? 'Ward forecast service unavailable' : 'No forecast for this ward and date'}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close ward panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <section aria-label="Five day outlook">
          <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
            5-day outlook
          </h3>
          <RiskStrip
            className="mt-2"
            days={days}
            selectedDate={selectedDate}
            onDaySelect={onDaySelect}
          />
        </section>

        <Separator className="my-3" />

        <Tabs defaultValue="forecast">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="forecast">
              Forecast
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="advisory">
              Advisory
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="facilities">
              Facilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <section aria-label="UTCI forecast">
              <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
                Selected-day UTCI vs supplied baseline
              </h3>
              {forecast.isPending ? (
                <p className="mt-2 text-xs tapas-subtext">Loading forecast…</p>
              ) : forecast.isError ? (
                <p role="status" className="mt-2 text-xs tapas-subtext">Forecast request failed. Values are unavailable.</p>
              ) : (
                <UtciChart
                  className="mt-1"
                  hourly={forecast.data?.ward_id === wardId ? forecast.data.hourly : []}
                  baselineP97={forecast.data?.baseline_p97}
                  selectedDate={selectedDate}
                  timezone={location?.timezone ?? 'Asia/Kolkata'}
                />
              )}
              <DataStatus label="Ward forecast" provenance={forecast.data?.provenance} />
              {today ? <PlainLanguage day={today} /> : null}
            </section>

            {today ? <KeyNumbers day={today} /> : null}

            {today ? (
              <section aria-label="Expected excess deaths">
                <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
                  Expected excess deaths
                </h3>
                <DeathsDisplay
                  className="mt-1.5"
                  value={today.excess_deaths}
                  low={today.excess_deaths_low}
                  high={today.excess_deaths_high}
                  level={today.risk_level}
                  when={`on ${longDate(today.date)}`}
                  source={today.model_source}
                  intervalLabel={today.confidence_level ? `${today.confidence_level}% ${today.interval_type ?? 'reported interval'}` : today.interval_type}
                />
              </section>
            ) : null}

            {officer && today ? (
              <PrepareResponseTrigger
                wardName={displayName}
                day={today}
                facilitiesCount={facilities.data?.facilities.length ?? 0}
              />
            ) : null}

          </TabsContent>

          <TabsContent value="advisory" className="space-y-2">
            <div className="flex gap-1" role="group" aria-label="Advisory language">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  aria-pressed={language === lang.code}
                  className={cn(
                    'min-h-11 rounded-md border px-2.5 py-2 text-xs transition-colors',
                    language === lang.code
                      ? 'border-foreground/40 bg-secondary font-medium'
                      : 'border-border hover:bg-secondary/60',
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {alerts.isPending ? <p role="status" className="text-xs tapas-subtext">Loading advisories…</p> : alerts.isError ? <p role="status" className="text-xs tapas-subtext">Advisory service unavailable. This does not mean no advisory has been issued.</p> : <AdvisoryText
              language={language}
              text={
                language === 'en'
                  ? alert?.advisory_en
                  : language === 'hi'
                    ? alert?.advisory_hi
                    : alert?.advisory_te
              }
              hasAlert={Boolean(alert)}
            />}
            {alert ? <p className="text-[11px] tapas-subtext">Issued: {formatDateTime(alert.issued_at)} · Source: {alert.provenance?.source ?? 'not supplied'}{alert.expires_at ? ` · Expires: ${formatDateTime(alert.expires_at)}` : ' · Expiry not supplied'}</p> : null}
          </TabsContent>

          <TabsContent value="facilities">
            <p className="mb-2 text-xs tapas-subtext">Ward-source records. Verification dates do not establish current opening or availability.</p>
            <FacilitiesTab
              facilities={facilities.data?.facilities ?? []}
              isLoading={facilities.isPending}
              isError={facilities.isError}
            />
            <DataStatus label="Ward facilities" provenance={facilities.data?.provenance} />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}

/**
 * A UTCI number on its own is meaningless to a ward officer. This sentence is
 * the translation layer between the model and the decision.
 */
function PlainLanguage({ day }: { day: WardRisk }) {
  if (day.utci_max === null || day.utci_p97 === null) return <p className="mt-2 text-xs tapas-subtext">Peak UTCI or its baseline is unavailable; no anomaly can be calculated.</p>
  const delta = day.utci_max - day.utci_p97

  return (
    <p className="mt-2 rounded-md bg-secondary/70 p-2 text-xs leading-relaxed">
      Peak UTCI <strong>{formatTemp(day.utci_max)}</strong> is{' '}
      <strong>
        {Math.abs(delta).toFixed(1)}°C {delta >= 0 ? 'above' : 'below'}
      </strong>{' '}
      the supplied 97th-percentile baseline for this ward (
      {formatTemp(day.utci_p97)}).
    </p>
  )
}

function KeyNumbers({ day }: { day: WardRisk }) {
  const items: { label: string; value: string; tone?: string }[] = [
    { label: 'Peak UTCI for selected date', value: formatTemp(day.utci_max) },
    { label: 'Heat index', value: formatTemp(day.heat_index_max, 0) },
    {
      label: 'Hot night',
      value: day.hot_night === null ? 'Unavailable' : day.hot_night ? 'Yes' : 'No',
      tone: day.hot_night ? 'text-[var(--risk-4)]' : 'tapas-subtext',
    },
    {
      label: 'Consecutive hot days',
      value: day.consecutive_hot_days === null ? 'Unavailable' : `${day.consecutive_hot_days} ${
        day.consecutive_hot_days === 1 ? 'day' : 'days'
      }`,
    },
  ]

  return (
    <section aria-label="Key numbers">
      <h3 className="text-xs font-semibold uppercase tracking-wide tapas-subtext">
        Key numbers
      </h3>
      <dl className="mt-1.5 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border p-2"
          >
            <dt className="text-[11px] tapas-subtext">{item.label}</dt>
            <dd
              className={cn(
                'mt-0.5 flex items-center gap-1 text-sm font-semibold',
                item.tone,
              )}
            >
              {item.label === 'Hot night' && day.hot_night ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AdvisoryText({
  language,
  text,
  hasAlert,
}: {
  language: Language
  text: string | undefined
  hasAlert: boolean
}) {
  if (!text) {
    return (
      <p className="text-xs tapas-subtext">
        {hasAlert ? 'This advisory is not available in the selected language.' : 'No matching advisory was returned for this ward and date. Consult the official bulletin for current warnings.'}
      </p>
    )
  }

  return (
    <div>
      <p
        lang={language}
        className="whitespace-pre-line rounded-md border border-border p-2.5 text-sm leading-relaxed"
      >
        {text}
      </p>
      {language !== 'en' ? (
        <p className="mt-1.5 text-[11px] tapas-subtext">
          {TRANSLATION_DISCLAIMER}
        </p>
      ) : null}
    </div>
  )
}

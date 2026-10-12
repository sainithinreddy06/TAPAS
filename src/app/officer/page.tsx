'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Printer,
  AlertTriangle,
  Check,
  X,
  Send,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useLocation } from '@/components/providers/LocationProvider'
import { ActionPriorityList } from '@/components/operations/ActionPriorityList'
import { WorkforceModule } from '@/components/workforce/WorkforceModule'
import { MistingCoordination } from '@/components/operations/MistingCoordination'
import { HealthcareReadiness } from '@/components/health/HealthcareReadiness'
import { PatientLoadCard } from '@/components/health/PatientLoadCard'
import { ExplainableRisk } from '@/components/risk/ExplainableRisk'
import { LocalResponseNetwork } from '@/components/help/LocalResponseNetwork'
import { BroadcastRecipients } from '@/components/broadcast/BroadcastRecipients'
import { WardSelector } from '@/components/ward/WardSelector'
import { LocationSearch } from '@/components/location/LocationSearch'
import { ActiveOperationBanner } from '@/components/operations/ActiveOperationBanner'
import { MobilisationReviewModal } from '@/components/operations/MobilisationReviewModal'
import { OperationalFollowthrough } from '@/components/operations/OperationalFollowthrough'
import { storeBackendOperation } from '@/lib/operationsStore'
import { NotificationCenter } from '@/components/operations/NotificationModal'
import { Button } from '@/components/ui/button'
import { operationalService } from '@/lib/service'
import {
  DEMO_WARDS,
  DEMO_MISTING_TEAMS,
  DEMO_NOTIFICATIONS,
  DEMO_ACTION_RECOMMENDATIONS,
} from '@/data/seedData'
import type {
  WorkerGroup,
  MineSite,
  HealthcareFacility,
  PatientHealthSignal,
  Official,
  ASHAWorker,
  ExplainableRiskScore,
  WardRisk,
} from '@/lib/types'
import { useRiskMap, useWardGeojson } from '@/hooks/useRiskMap'
import { useResources } from '@/hooks/useResources'

const HeatMap = dynamic(() => import('@/components/map/HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[560px] w-full items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-xs text-[var(--text-muted)]">
      Loading operational map…
    </div>
  ),
})

function OfficerDashboardContent() {
  const { location, selectedDate, selectedWardId, selectWard } =
    useLocation()

  // Selected ward or default to Kukatpally / Singareni
  const currentWardId = selectedWardId || 'ward-42-kukatpally'
  const currentWard = DEMO_WARDS.find((w) => w.ward_id === currentWardId) || DEMO_WARDS[0]

  const geojson = useWardGeojson()
  const riskMap = useRiskMap(selectedDate)
  const nearby = useResources(location)
  const fallbackWards: WardRisk[] = useMemo(
    () =>
      DEMO_WARDS.map((w) => ({
        ward_id: w.ward_id,
        ward_name: w.name,
        city: w.district ?? 'Hyderabad',
        date: selectedDate,
        risk_level: w.risk_level,
        utci_max: w.utci_max ?? null,
        utci_p97: null,
        hot_night: null,
        consecutive_hot_days: null,
        excess_deaths: null,
        excess_deaths_low: null,
        excess_deaths_high: null,
      })),
    [selectedDate]
  )
  const wards = useMemo(() => riskMap.data?.wards ?? fallbackWards, [riskMap.data, fallbackWards])

  // Auto-associate closest ward if officer searches or auto-detects a location
  const locationKey = location ? `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}` : null
  const lastLocationKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!location || !locationKey || lastLocationKeyRef.current === locationKey) return
    lastLocationKeyRef.current = locationKey

    let closestWard = DEMO_WARDS[0]
    let minDistance = Infinity
    for (const w of DEMO_WARDS) {
      const d = Math.hypot(w.latitude - location.latitude, w.longitude - location.longitude)
      if (d < minDistance) {
        minDistance = d
        closestWard = w
      }
    }
    if (closestWard && minDistance < 1.0) {
      selectWard(closestWard.ward_id)
    }
  }, [location, locationKey, selectWard])

  // Incident submission modal state
  const [incidentModalOpen, setIncidentModalOpen] = useState(false)
  const [incidentLocation, setIncidentLocation] = useState('')
  const [incidentType, setIncidentType] = useState('Heat Stroke Suspected')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [incidentSubmitted, setIncidentSubmitted] = useState(false)

  // Loaded operational datasets
  const [explainableRisk, setExplainableRisk] = useState<ExplainableRiskScore | null>(null)
  const [workforce, setWorkforce] = useState<{
    worker_groups: WorkerGroup[]
    mine_sites: MineSite[]
    has_critical_shift_overlap: boolean
  }>({ worker_groups: [], mine_sites: [], has_critical_shift_overlap: true })
  const [health, setHealth] = useState<{
    patient_signal: PatientHealthSignal | null
    facilities: HealthcareFacility[]
  }>({ patient_signal: null, facilities: [] })
  const [network, setNetwork] = useState<{ officials: Official[]; asha_workers: ASHAWorker[] }>({
    officials: [],
    asha_workers: [],
  })

  useEffect(() => {
    let cancelled = false
    operationalService.getExplainableRisk(currentWardId).then((r) => {
      if (!cancelled) setExplainableRisk(r)
    })
    operationalService.getWorkforce(currentWardId).then((w) => {
      if (!cancelled) setWorkforce(w)
    })
    operationalService.getHealthStatus(currentWardId).then((h) => {
      if (!cancelled) setHealth(h)
    })
    operationalService.getCommunityNetwork(currentWardId).then((n) => {
      if (!cancelled) setNetwork(n)
    })
    return () => {
      cancelled = true
    }
  }, [currentWardId])

  const handlePrintDailyBrief = () => {
    window.print()
  }

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault()
    setIncidentSubmitted(true)
    setTimeout(() => {
      setIncidentSubmitted(false)
      setIncidentModalOpen(false)
      setIncidentLocation('')
      setIncidentDescription('')
    }, 1200)
  }

  const [mobilisationModalOpen, setMobilisationModalOpen] = useState(false)
  const [operationDetailsOpen, setOperationDetailsOpen] = useState(false)

  const handleConfirmActivation = async (data: { reference: string; groups: string[]; capXml: string }) => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    try {
      const res = await fetch(`${base}/api/response/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ward_id: currentWard.ward_id,
          ward_name: currentWard.name,
          reference: data.reference,
          risk_level: currentWard.risk_level,
          groups: data.groups,
        }),
      })
      if (res.ok) {
        const backendOp = await res.json()
        storeBackendOperation(backendOp, currentWard.name)
      }
    } catch {
      // Fallback to local operation if backend unavailable
    }
    setOperationDetailsOpen(true)
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 pb-12">
      {/* Officer Operational Command Bar */}
      <header className="space-y-4 border-b border-[var(--border-subtle)] pb-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--accent)] text-[var(--bg-base)] px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                MANDAL COMMAND
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                Live Field Ops · Session Active
              </span>
            </div>
            <h1 className="metric-large text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-1">
              Mandal Operational Control · {currentWard.name}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              District: {currentWard.district}, {currentWard.state} · Population: {currentWard.population?.toLocaleString()}
              {location ? ` · Field Location: ${location.name}` : ''}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => setIncidentModalOpen(true)}
              className="min-h-10 border border-[var(--risk-4)] bg-[var(--risk-5)]/30 text-[var(--risk-4)] hover:bg-[var(--risk-5)] text-xs font-bold"
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Log Field Incident
            </Button>

            <Button
              size="sm"
              onClick={handlePrintDailyBrief}
              className="min-h-10 bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 text-xs font-bold"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Daily Brief
            </Button>
          </div>
        </div>

        {/* Ward Jurisdiction Bar */}
        <div className="bg-[var(--surface-1)] p-4 rounded-xl border border-[var(--line-soft)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <label className="block text-sm font-semibold text-[var(--ink-high)]">
              Mandal Ward Jurisdiction
            </label>
            <p className="text-xs text-[var(--ink-low)] truncate">
              Administrative boundary dataset · {currentWard.name}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <WardSelector
              label=""
              wards={DEMO_WARDS.map((w) => ({
                ward_id: w.ward_id,
                ward_name: `${w.name} (Risk L${w.risk_level})`,
                risk_level: w.risk_level,
              }))}
              selectedWardId={currentWardId}
              onSelectWard={(id) => id && selectWard(id)}
              className="w-full"
            />
          </div>
        </div>
      </header>

      {/* Sticky Primary Action Trigger & Active Operation Clock */}
      <ActiveOperationBanner
        wardName={currentWard.name}
        wardId={currentWard.ward_id}
        riskLevel={currentWard.risk_level}
        onOpenReviewModal={() => setMobilisationModalOpen(true)}
        onOpenOperationDetails={() => setOperationDetailsOpen(true)}
      />

      {/* PRINT-ONLY HEADER */}
      <div className="print-only mb-6 border-b pb-4 text-left">
        <h1 className="text-2xl font-bold">TAPAS — MANDAL OFFICER DAILY HEAT BRIEF</h1>
        <p className="text-sm">Ward: {currentWard.name} · Date: {selectedDate} · Generated: 14:00 IST</p>
        <p className="text-xs text-gray-600">Smart India Hackathon 2026 (SIH26083) · Confidential Operational Document</p>
      </div>

      {/* Operational KPI Grid */}
      <section aria-label="Operational Metrics" className="hairline-grid grid-cols-2 sm:grid-cols-4">
        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--risk-4)]">Heat-Health Risk</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--risk-4)] mt-2">
            {currentWard.risk_score} <span className="text-sm font-medium text-[var(--text-muted)]">/ 100</span>
          </div>
          <span className="text-[11px] font-bold uppercase text-[var(--risk-4)] block mt-1">
            Level {currentWard.risk_level} · Critical Alert
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">Exposed Workforce</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--text-primary)] mt-2">
            {workforce.worker_groups.reduce((acc, g) => acc + g.worker_count, 0) +
              workforce.mine_sites.reduce((acc, m) => acc + m.exposed_workers, 0)}
          </div>
          <span className="text-[11px] text-amber-300 font-semibold block mt-1">
            ⚠ Shift Overlap Flagged
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">Hospital Surge</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--accent)] mt-2">
            +{health.patient_signal?.surge_percentage.toFixed(0) ?? 68}%
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            {health.patient_signal?.today_count ?? 37} heat admissions today
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">Misting Fleet Active</span>
          <div className="text-3xl font-extrabold tabular-nums text-emerald-400 mt-2">
            2 <span className="text-sm font-medium text-[var(--text-muted)]">En Route</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            6,000L water capacity deployed
          </span>
        </div>
      </section>

      {/* 1. Action Priority List */}
      <ActionPriorityList
        actions={DEMO_ACTION_RECOMMENDATIONS[currentWardId] || DEMO_ACTION_RECOMMENDATIONS['ward-42-kukatpally']}
        wardName={currentWard.name}
      />

      {/* 2. High-Exposure Workforce Module with Mine Site Shift Overlap */}
      <WorkforceModule
        workerGroups={workforce.worker_groups}
        mineSites={workforce.mine_sites}
        wardName={currentWard.name}
        thermalStressScore={currentWardId === 'ward-singareni-c' ? 8.7 : 8.4}
      />

      {/* 3. Misting Coordination */}
      <MistingCoordination
        teams={DEMO_MISTING_TEAMS}
        riskLevel={currentWard.risk_level}
        wardName={currentWard.name}
      />

      {/* 4. Healthcare Readiness & Patient Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthcareReadiness
          facilities={health.facilities}
          wardName={currentWard.name}
        />
        <PatientLoadCard data={health.patient_signal} />
      </div>

      {/* 5. Explainable Risk Breakdown */}
      <ExplainableRisk
        data={explainableRisk}
        wardName={currentWard.name}
      />

      {/* 6. Local Response Network */}
      <LocalResponseNetwork
        officials={network.officials}
        ashaWorkers={network.asha_workers}
        wardName={currentWard.name}
      />

      {/* 7. Notification Centre */}
      <NotificationCenter
        notifications={DEMO_NOTIFICATIONS}
        wardName={currentWard.name}
      />

      {/* 8. Broadcast Recipients Management & Real Dispatch */}
      <BroadcastRecipients
        zoneName={currentWard.name}
      />

      {/* 8. Resource Gap & Ward Map */}
      <section aria-label="Operational Ward Map" className="hairline-grid p-4 sm:p-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="metric-label text-[var(--text-secondary)]">
              Operational Resource Gap Map
            </span>
            <p className="text-xs text-[var(--text-muted)]">
              Overlaying cooling centres, medical facilities, and worker exposure zones in {currentWard.name}.
            </p>
          </div>
        </div>

        {/* Location Auto-Detect & Search Bar directly above the map */}
        <div className="mb-4 bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--line-soft)]">
          <LocationSearch />
        </div>

        <div className="w-full">
          <HeatMap
            location={location}
            selectedDate={selectedDate}
            geojson={geojson.data}
            wards={wards}
            selectedWardId={currentWardId}
            onWardSelect={selectWard}
            resources={nearby.data?.resources ?? []}
          />
        </div>
      </section>

      {/* Incident Submission Modal */}
      {incidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--risk-4)]" />
                Log Immediate Field Incident
              </h4>
              <button
                type="button"
                onClick={() => setIncidentModalOpen(false)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {incidentSubmitted ? (
              <div className="rounded-lg bg-emerald-950/60 border border-emerald-800 p-4 text-center text-xs text-emerald-300 font-semibold space-y-1">
                <Check className="mx-auto h-6 w-6 text-emerald-400" />
                <p>Field Incident Logged &amp; Transmitted to District Authority</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitIncident} className="space-y-3 text-xs">
                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Specific Location / Intersection:
                  </label>
                  <input
                    type="text"
                    required
                    value={incidentLocation}
                    onChange={(e) => setIncidentLocation(e.target.value)}
                    placeholder="e.g. KPHB Metro Station Pillar 42, Kukatpally"
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Incident Classification:
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)]"
                  >
                    <option value="Heat Stroke Suspected">Heat Stroke Suspected / Severe Dehydration</option>
                    <option value="Cooling Centre Overflow">Cooling Centre Capacity Exceeded</option>
                    <option value="Water Supply Disruption">Drinking Water Supply Disrupted</option>
                    <option value="Workplace Safety Violation">Workplace Midday Work Violation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Field Observations &amp; Immediate Action Taken:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    placeholder="Describe patient status, EMS ambulance call time, and resources deployed…"
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIncidentModalOpen(false)}
                    className="border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[var(--risk-4)] text-white hover:bg-[var(--risk-5)] font-bold"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Submit Incident
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* NOTIFY & MOBILISE: 4-Section Review Modal */}
      <MobilisationReviewModal
        isOpen={mobilisationModalOpen}
        onClose={() => setMobilisationModalOpen(false)}
        onConfirmActivation={handleConfirmActivation}
        wardName={currentWard.name}
        wardId={currentWard.ward_id}
        riskLevel={currentWard.risk_level}
        thermalStressScore={8.7}
      />

      {/* ACTIVE RESPONSE COMMAND: Two status tracking, schedule, and audit timeline */}
      <OperationalFollowthrough
        isOpen={operationDetailsOpen}
        onClose={() => setOperationDetailsOpen(false)}
        wardName={currentWard.name}
        wardId={currentWard.ward_id}
      />
    </div>
  )
}

export default function OfficerPage() {
  return (
    <RoleGuard role="officer">
      <OfficerDashboardContent />
    </RoleGuard>
  )
}

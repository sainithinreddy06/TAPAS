'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Download,
  AlertTriangle,
  Droplets,
  BellRing,
  ArrowUpRight,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useLocation } from '@/components/providers/LocationProvider'
import { Button } from '@/components/ui/button'
import {
  DEMO_WARDS,
  DEMO_MISTING_TEAMS,
  DEMO_NOTIFICATIONS,
  DEMO_PATIENT_SIGNALS,
} from '@/data/seedData'
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants'
import { clampRiskLevel } from '@/lib/utils'
import { useRiskMap, useWardGeojson } from '@/hooks/useRiskMap'
import { HealthcareReadiness } from '@/components/health/HealthcareReadiness'
import { operationalService } from '@/lib/service'
import type { WardRisk, HealthcareFacility } from '@/lib/types'

const HeatMap = dynamic(() => import('@/components/map/HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-xs text-[var(--text-muted)]">
      Loading regional command map…
    </div>
  ),
})

interface MandalRanking {
  mandal_id: string
  mandal_name: string
  wards_count: number
  highest_risk_level: number
  max_utci: number
  avg_utci: number
  projected_excess_deaths: number
  active_operations_count: number
  priority_rank: number
}

function AuthorityCommandContent() {
  const { location, selectedDate, selectWard, selectedWardId } = useLocation()
  const geojson = useWardGeojson()
  const riskMap = useRiskMap(selectedDate)
  const [backendRankings, setBackendRankings] = useState<MandalRanking[] | null>(null)
  const [backendOverview, setBackendOverview] = useState<any | null>(null)
  const [healthFacilities, setHealthFacilities] = useState<HealthcareFacility[]>([])

  const selectedWard = useMemo(
    () => DEMO_WARDS.find((w) => w.ward_id === selectedWardId),
    [selectedWardId]
  )

  useEffect(() => {
    let cancelled = false
    const wardId = selectedWardId || 'ward-42-kukatpally'
    operationalService.getHealthStatus(wardId).then((res) => {
      if (!cancelled && res?.facilities) {
        setHealthFacilities(res.facilities)
      }
    })
    return () => {
      cancelled = true
    }
  }, [selectedWardId])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
    fetch(`${base}/api/authority/rankings`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) setBackendRankings(d)
      })
      .catch(() => {})

    fetch(`${base}/api/authority/overview`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === 'object') setBackendOverview(d)
      })
      .catch(() => {})
  }, [])
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

  const [downloadSuccess, setDownloadSuccess] = useState(false)

  // Aggregated regional figures
  const totalPopulation = DEMO_WARDS.reduce((acc, w) => acc + (w.population ?? 0), 0)
  const totalAdmissions = Object.values(DEMO_PATIENT_SIGNALS).reduce((acc, p) => acc + p.today_count, 0)
  const criticalMandals = DEMO_WARDS.filter((w) => w.risk_level === 5).length

  const handleDownloadReport = () => {
    const reportData = {
      title: 'TAPAS District Authority Executive Heat Brief',
      generated_at: new Date().toISOString(),
      district: 'Regional District Command (Hyderabad / Medchal / Bhadradri)',
      date: selectedDate,
      summary: {
        total_mandals_monitored: DEMO_WARDS.length,
        critical_escalation_mandals: criticalMandals,
        total_exposed_population: totalPopulation,
        heat_stroke_patient_surge_today: totalAdmissions,
      },
      mandal_rankings: DEMO_WARDS.map((w) => ({
        mandal_name: w.name,
        risk_level: w.risk_level,
        risk_score: w.risk_score,
        population: w.population,
        outdoor_workers_pct: w.outdoor_workers_percentage,
        elderly_pct: w.elderly_percentage,
      })),
      fleet_status: DEMO_MISTING_TEAMS,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TAPAS-District-Executive-Brief-${selectedDate}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 2500)
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 pb-12">
      {/* Executive Command Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--accent)] text-[var(--bg-base)] px-2 py-0.5 text-xs font-black uppercase tracking-wider">
              DISTRICT COMMAND
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Regional Jurisdiction · SIH26083 Executive Overview
            </span>
          </div>
          <h1 className="metric-large text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-1">
            District Authority Regional Heat Command
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cross-mandal resource allocation, inequality assessment, and priority emergency escalation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleDownloadReport}
            className="min-h-10 bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 text-xs font-bold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {downloadSuccess ? 'Downloaded!' : 'Download Executive Report'}
          </Button>
        </div>
      </header>

      {/* Regional Rollup KPIs */}
      <section aria-label="Regional KPIs" className="hairline-grid grid-cols-2 sm:grid-cols-4">
        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--risk-4)]">Active Escalations</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--risk-4)] mt-2">
            {backendOverview?.critical_mandals_count ?? criticalMandals} <span className="text-sm font-medium text-[var(--text-muted)]">/ {backendOverview?.total_mandals ?? DEMO_WARDS.length}</span>
          </div>
          <span className="text-[11px] font-bold text-[var(--risk-4)] uppercase block mt-1">
            {backendOverview ? 'High-Risk Mandals' : 'Level 5 Extreme Mandals'}
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">District Exposed Population</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--text-primary)] mt-2">
            {(backendOverview?.population_covered ?? totalPopulation).toLocaleString()}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            {backendOverview?.district_name ?? '4 Administrative Zones Monitored'}
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">Projected Excess Deaths</span>
          <div className="text-3xl font-extrabold tabular-nums text-[var(--accent)] mt-2">
            {backendOverview ? backendOverview.total_excess_deaths.toFixed(2) : '56'} <span className="text-sm font-medium text-[var(--text-muted)]">{backendOverview ? 'deaths/day' : '+84% Surge'}</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            {backendOverview ? `Range: ${backendOverview.total_ed_low} – ${backendOverview.total_ed_high}` : 'Across 5 district health clusters'}
          </span>
        </div>

        <div className="hairline-cell p-4 sm:p-5">
          <span className="metric-label text-[var(--text-secondary)]">Active District Operations</span>
          <div className="text-3xl font-extrabold tabular-nums text-emerald-400 mt-2">
            {backendOverview?.active_operations_count ?? 4} <span className="text-sm font-medium text-[var(--text-muted)]">Active</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            {backendOverview ? `Command: ${backendOverview.command_status}` : '100% fleet utilization in critical zones'}
          </span>
        </div>
      </section>

      {/* 1. Executive Brief Card */}
      <section aria-label="Executive Brief" className="hairline-grid">
        <div className="hairline-cell p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--risk-4)]" />
            <h3 className="metric-label text-[var(--risk-4)]">
              Executive Briefing &amp; Priority Escalation Flags
            </h3>
          </div>
          <div className="mt-3 space-y-2 text-xs text-[var(--text-primary)] leading-relaxed">
            <p>
              • <strong>Singareni Mining Block C:</strong> Open-cast pit temperature exceeding 44°C. 438 miners on 12:00–18:00 shift overlapping peak UTCI stress. <span className="text-amber-300 font-semibold">Immediate DGMS work stoppage directive recommended for 13:00–16:30.</span>
            </p>
            <p>
              • <strong>Kukatpally Ward 42:</strong> Combined heat-health risk score 87/100. Emergency department caseload surged +68% above 7-day mean. Two misting tankers en route to Rythu Bazaar and KPHB corridor.
            </p>
            <p>
              • <strong>Resource Inequality Alert:</strong> Old City Charminar (Ward 12) exhibits zero verified municipal cooling centres within 2 km of high-density worker residential lanes.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Mandal Command Priority Index */}
      <section aria-labelledby="mandal-rankings-heading" className="hairline-grid">
        <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h3 id="mandal-rankings-heading" className="metric-label text-[var(--text-secondary)]">
              Mandal-Level Command Priority Index {backendRankings ? '(Live Backend Engine)' : ''}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Weighted composite of thermal stress, demographic vulnerability, and resource deficiency.
            </p>
          </div>
        </div>

        <div className="hairline-cell p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Mandal / Ward Zone</th>
                <th className="py-2.5 px-4">Risk Level</th>
                <th className="py-2.5 px-4">Command Priority Score</th>
                <th className="py-2.5 px-4">Population</th>
                <th className="py-2.5 px-4">Worker Exposure %</th>
                <th className="py-2.5 px-4">Vulnerability %</th>
                <th className="py-2.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {backendRankings ? backendRankings.map((mandal) => {
                const lvl = clampRiskLevel(mandal.highest_risk_level) ?? 4
                const color = RISK_COLORS[lvl]
                return (
                  <tr key={mandal.mandal_id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{mandal.mandal_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {mandal.wards_count} ward(s) · {mandal.active_operations_count} active op(s)
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${color}25`,
                          color: color,
                          border: `1px solid ${color}60`,
                        }}
                      >
                        L{lvl} · {RISK_LABELS[lvl]}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-sm text-[var(--text-primary)]">
                      Rank #{mandal.priority_rank} <span className="text-[10px] text-[var(--text-muted)] font-normal font-sans">({mandal.max_utci} °C UTCI)</span>
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--text-secondary)]">
                      {(mandal.wards_count * 65000).toLocaleString()} <span className="text-[10px] text-[var(--text-muted)]">est.</span>
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--accent)] font-semibold">
                      {mandal.projected_excess_deaths} deaths/day
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--text-muted)]">
                      {mandal.avg_utci.toFixed(1)} °C avg
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectWard(mandal.mandal_id === 'mandal-kukatpally' ? 'HYD-001' : mandal.mandal_id === 'mandal-amberpet' ? 'HYD-005' : 'HYD-004')}
                        className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-[var(--text-primary)]"
                      >
                        Select <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                )
              }) : DEMO_WARDS.map((ward) => {
                const color = RISK_COLORS[ward.risk_level]

                return (
                  <tr key={ward.ward_id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{ward.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {ward.district}, {ward.state}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${color}25`,
                          color: color,
                          border: `1px solid ${color}60`,
                        }}
                      >
                        L{ward.risk_level} · {RISK_LABELS[ward.risk_level]}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-sm text-[var(--text-primary)]">
                      {ward.risk_score} <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--text-secondary)]">
                      {ward.population?.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--accent)] font-semibold">
                      {ward.outdoor_workers_percentage?.toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--text-muted)]">
                      {ward.elderly_percentage?.toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectWard(ward.ward_id)}
                        className="min-h-8 px-2.5 text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-[var(--text-primary)]"
                      >
                        Select <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Coverage Inequality & Regional Map */}
      <section aria-label="Coverage Inequality Map" className="hairline-grid p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="metric-label text-[var(--text-secondary)]">
              Regional Coverage Inequality Map
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Spatial overview of heat hotspots, misting vehicle positions, and resource gaps across the district.
            </p>
          </div>
        </div>

        <div className="w-full">
          <HeatMap
            location={location}
            selectedDate={selectedDate}
            geojson={geojson.data}
            wards={wards}
            selectedWardId={selectedWardId}
            onWardSelect={selectWard}
            resources={[]}
          />
        </div>
      </section>

      {/* 4. District Healthcare Surge Readiness & Medical Alerts */}
      <HealthcareReadiness
        facilities={healthFacilities}
        wardName={selectedWard ? selectedWard.name : 'District Health Command'}
        canReportSurge={true}
      />

      {/* 4. Fleet & Notification Rollups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Misting Fleet Rollup */}
        <div className="hairline-grid">
          <div className="hairline-cell border-b border-[var(--border-subtle)] p-4">
            <h4 className="metric-label text-[var(--text-secondary)] flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 text-[var(--accent)]" />
              Misting Fleet Regional Distribution
            </h4>
          </div>
          <div className="hairline-cell p-4 space-y-2.5 text-xs">
            {DEMO_MISTING_TEAMS.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2.5"
              >
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">{team.name}</span>
                  <span className="text-[10.5px] text-[var(--text-muted)] block">
                    {team.assigned_ward} · {team.water_capacity_litres}L
                  </span>
                </div>
                <span className="rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Mandal Notification Delivery Status */}
        <div className="hairline-grid">
          <div className="hairline-cell border-b border-[var(--border-subtle)] p-4">
            <h4 className="metric-label text-[var(--text-secondary)] flex items-center gap-2">
              <BellRing className="h-3.5 w-3.5 text-[var(--risk-4)]" />
              Regional Alert Transmission Overview
            </h4>
          </div>
          <div className="hairline-cell p-4 space-y-2.5 text-xs">
            {DEMO_NOTIFICATIONS.map((notif) => (
              <div
                key={notif.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)] truncate max-w-[280px]">
                    {notif.headline}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--risk-4)]">{notif.severity}</span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
                  <span>Delivery: <strong className="text-amber-300">{notif.delivery_status}</strong></span>
                  <span>Response: <strong className="text-emerald-300">{notif.response_status}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthorityPage() {
  return (
    <RoleGuard role="authority">
      <AuthorityCommandContent />
    </RoleGuard>
  )
}

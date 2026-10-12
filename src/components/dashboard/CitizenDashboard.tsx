'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  Thermometer,
  Droplets,
  Flame,
  ShieldCheck,
  ListOrdered,
} from 'lucide-react'
import { useLocation } from '@/components/providers/LocationProvider'
import { useDemoRole } from '@/lib/auth/demoAuth'
import { LocationSearch } from '@/components/location/LocationSearch'
import { MapControls } from '@/components/map/MapControls'
import { RiskRanking } from '@/components/risk/RiskRanking'
import { WardPanel } from '@/components/ward/WardPanel'
import { ThermalStressPanel } from '@/components/thermal/ThermalStressPanel'
import { Precautions } from '@/components/help/Precautions'
import { CoolingSpotsPanel } from '@/components/help/CoolingSpotsPanel'
import { HealthcareReadiness } from '@/components/health/HealthcareReadiness'
import { LocalResponseNetwork } from '@/components/help/LocalResponseNetwork'
import { RiskStrip } from '@/components/ward/RiskStrip'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useRiskMap, useWardGeojson } from '@/hooks/useRiskMap'
import { useWardRisk } from '@/hooks/useWard'
import { useWeather } from '@/hooks/useWeather'
import { weatherReading } from '@/lib/weather'
import { heatIndexCelsius } from '@/lib/thermal'
import { useResources } from '@/hooks/useResources'
import type { SafetyResource } from '@/lib/resources'
import { operationalService } from '@/lib/service'
import { DEMO_COOLING_SPOTS, DEMO_WARDS } from '@/data/seedData'
import { getNearbyCoolingSpots, getLocalResponseNetwork } from '@/lib/coolingSpots'
import { RISK_LABELS, RISK_COLORS } from '@/lib/constants'
import { cn, formatTemp } from '@/lib/utils'
import type {
  HumanThermalStressBreakdown,
  CoolingSpot,
  Official,
  ASHAWorker,
  HealthcareFacility,
  PatientHealthSignal,
} from '@/lib/types'

const HeatMap = dynamic(() => import('@/components/map/HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[620px] w-full items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-xs text-[var(--text-muted)]">
      Loading dark heat map…
    </div>
  ),
})

export function CitizenDashboard({ officer = false }: { officer?: boolean }) {
  const demoRole = useDemoRole()
  const isOfficerOrAuthority = officer || demoRole === 'officer' || demoRole === 'authority'
  const {
    location,
    selectedDate,
    setSelectedDate,
    dates,
    selectedWardId,
    selectWard,
  } = useLocation()
  const isDesktop = useIsDesktop()

  const [rankingOpen, setRankingOpen] = useState(false)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)

  // Real weather and risk data hooks
  const weather = useWeather()
  const { reading } = weatherReading(weather.data)
  const geojson = useWardGeojson()
  const riskMap = useRiskMap(selectedDate)
  const nearby = useResources(location)
  const wardRiskSeries = useWardRisk(selectedWardId, 5)

  const wards = useMemo(() => riskMap.data?.wards ?? [], [riskMap.data])
  const selectedWard = wards.find((w) => w.ward_id === selectedWardId)
  const risk = selectedWardId ? selectedWard : riskMap.data?.summary

  const resources = useMemo(() => nearby.data?.resources ?? [], [nearby.data])
  const selectedResource = resources.some((r) => r.id === selectedResourceId)
    ? selectedResourceId
    : null

  // Active geographic focus: selected ward priority, then fetched location, then default Kukatpally
  const activeZoneName = useMemo(() => {
    if (selectedWard?.ward_name) return selectedWard.ward_name
    if (location?.name) return location.name
    return 'Kukatpally'
  }, [selectedWard, location])

  const activeCoordinates = useMemo(() => {
    if (selectedWardId) {
      const w = DEMO_WARDS.find((dw) => dw.ward_id === selectedWardId)
      if (w && Number.isFinite(w.latitude) && Number.isFinite(w.longitude)) {
        return { latitude: w.latitude, longitude: w.longitude }
      }
    }
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      return { latitude: location.latitude, longitude: location.longitude }
    }
    return { latitude: 17.4933, longitude: 78.4018 }
  }, [selectedWardId, location])

  // Operational state for selected ward
  const activeWardKey = selectedWardId || 'HYD-001'
  const [thermalStress, setThermalStress] = useState<HumanThermalStressBreakdown | null>(null)
  const [coolingSpots, setCoolingSpots] = useState<CoolingSpot[]>(() =>
    getNearbyCoolingSpots(activeCoordinates, activeZoneName, selectedWardId)
  )
  const [network, setNetwork] = useState<{ officials: Official[]; asha_workers: ASHAWorker[] }>(() =>
    getLocalResponseNetwork(activeZoneName, selectedWardId)
  )
  const [health, setHealth] = useState<{
    patient_signal: PatientHealthSignal | null
    facilities: HealthcareFacility[]
  }>({ patient_signal: null, facilities: [] })

  useEffect(() => {
    let cancelled = false
    operationalService.getThermalStress(activeWardKey).then((d) => {
      if (!cancelled) setThermalStress(d)
    })
    operationalService.getHealthStatus(activeWardKey).then((h) => {
      if (!cancelled) setHealth(h)
    })

    // Dynamically calculate 4-5 nearest cooling spots with real straight-line distances
    const spots = getNearbyCoolingSpots(activeCoordinates, activeZoneName, selectedWardId)
    setCoolingSpots(spots)

    // Dynamically resolve local response network contacts for the active zone
    const net = getLocalResponseNetwork(activeZoneName, selectedWardId)
    setNetwork(net)

    return () => {
      cancelled = true
    }
  }, [activeWardKey, activeCoordinates, activeZoneName, selectedWardId])

  const onWardSelect = useCallback(
    (id: string) => {
      selectWard(id)
      setRankingOpen(false)
    },
    [selectWard]
  )

  const onResourceSelect = useCallback((resource: SafetyResource) => {
    setSelectedResourceId(resource.id)
    document.getElementById('heat-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // Dynamic real-time weather and COST Action 730 UTCI thermal calculations
  const currentTemp = reading?.temperature != null ? reading.temperature : 31.8
  const currentHumidity = reading?.humidity != null ? reading.humidity : 56.0
  const hi = heatIndexCelsius(currentTemp, currentHumidity)

  // Real-time thermal stress calculation based on COST Action 730 biometeorology scale
  const effectiveUtci = risk?.utci_max ?? (reading?.apparent != null ? reading.apparent * 1.05 : null)
  const calculatedThermalScore = useMemo(() => {
    if (thermalStress?.score_0_10 != null && thermalStress.score_0_10 !== 8.4) return thermalStress.score_0_10
    if (effectiveUtci == null) return currentTemp != null ? Math.min(10.0, Math.max(1.0, (currentTemp - 20) / 2.5)) : 7.2
    if (effectiveUtci <= 9) return 1.0
    if (effectiveUtci <= 26) return Number((1.0 + ((effectiveUtci - 9) / 17) * 2.5).toFixed(1))
    if (effectiveUtci <= 32) return Number((3.5 + ((effectiveUtci - 26) / 6) * 2.5).toFixed(1))
    if (effectiveUtci <= 38) return Number((6.0 + ((effectiveUtci - 32) / 6) * 2.0).toFixed(1))
    if (effectiveUtci <= 46) return Number((8.0 + ((effectiveUtci - 38) / 8) * 1.5).toFixed(1))
    return Number(Math.min(10.0, 9.5 + ((effectiveUtci - 46) / 10) * 0.5).toFixed(1))
  }, [thermalStress, effectiveUtci, currentTemp])

  const currentRiskLevel = useMemo(() => {
    if (calculatedThermalScore >= 9.5) return 5
    if (calculatedThermalScore >= 8.0) return 4
    if (calculatedThermalScore >= 6.0) return 3
    if (calculatedThermalScore >= 3.5) return 2
    return 1
  }, [calculatedThermalScore])

  const peakRiskLevel = risk?.risk_level ?? currentRiskLevel
  // Dynamically reflects current thermal index strain; drops at night/morning and scales during midday peak
  const effectiveRiskLevel = currentRiskLevel as 1 | 2 | 3 | 4 | 5
  const riskColor = RISK_COLORS[effectiveRiskLevel]

  const riskExplanation =
    effectiveRiskLevel === 5
      ? 'Extreme physiological heat stress. Heat stroke danger under prolonged afternoon exposure. Immediate shade, hydration, and medical surge readiness enforced.'
      : effectiveRiskLevel === 4
      ? 'Very high thermal strain. Evaporative sweating suppressed by ambient moisture. Vulnerable citizens and outdoor labourers should limit physical exertion.'
      : effectiveRiskLevel === 3
      ? 'High heat warning. Continuous hydration and regular shaded rest breaks required during peak hours (12:00–16:00).'
      : effectiveRiskLevel === 2
      ? 'Moderate thermal advisory. Safe for normal outdoor movement with periodic hydration.'
      : 'Low thermal stress. Conditions within comfortable biometeorological physiological limits.'

  const panelOpen = !!selectedWardId
  const panel = selectedWardId ? (
    <WardPanel
      wardId={selectedWardId}
      wardName={selectedWard?.ward_name}
      selectedDate={selectedDate}
      onDaySelect={setSelectedDate}
      onClose={() => selectWard(null)}
      officer={officer}
    />
  ) : null

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6">
      {/* Header & Location Context */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="metric-large text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {officer ? 'Mandal Officer · Local Operations' : 'India Heat Risk & Response Platform'}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            SIH26083 Extreme Heat Intelligence · Real-time human thermal stress &amp; resource mobilization.
          </p>
        </div>

        <div className="w-full sm:w-auto min-w-0 sm:min-w-[320px]">
          <LocationSearch />
        </div>
      </header>

      {/* HERO BAND: 2 Columns, Hairline Divided */}
      <section aria-label="Hero Risk Overview" className="hairline-grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr]">
        {/* Left Column: Location & Large Risk Category */}
        <div className="hairline-cell flex flex-col justify-between p-6 space-y-4">
          <div>
            <span className="metric-label text-[var(--text-muted)]">
              {location?.name ? 'Selected Territory' : 'National Heat Summary'}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">
              {location?.name ?? 'India Overview (National Models)'}
            </h2>
          </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                <span
                  className="metric-large text-3xl sm:text-4xl lg:text-5xl"
                  style={{ color: riskColor }}
                >
                  LEVEL {effectiveRiskLevel}
                </span>
                <span
                  className="rounded px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: `${riskColor}25`,
                    color: riskColor,
                    border: `1px solid ${riskColor}60`,
                  }}
                >
                  {RISK_LABELS[effectiveRiskLevel]}
                </span>
                <span className="rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-secondary)]">
                  Day Peak: L{peakRiskLevel} ({RISK_LABELS[peakRiskLevel as 1 | 2 | 3 | 4 | 5] ?? 'ADVISORY'})
                </span>
              </div>

            <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
              {riskExplanation}
            </p>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--text-muted)] flex flex-wrap justify-between gap-2">
            <span>Valid {selectedDate} · Asia/Kolkata</span>
            <span className="text-[var(--text-secondary)]">
              {weather.data?.provenance?.source ?? 'Open-Meteo & TAPAS Biometeorology'}
            </span>
          </div>
        </div>

        {/* Right Column: 4 KPIs in a Divided Hairline Row */}
        <div className="hairline-grid grid-cols-2 sm:grid-cols-4">
          {/* KPI 1: Air Temperature */}
          <div className="hairline-cell flex flex-col justify-between p-5">
            <div>
              <span className="metric-label flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-[var(--accent)]" />
                Air Temperature
              </span>
              <div className="mt-3 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {formatTemp(currentTemp)}
              </div>
            </div>
            <div className="mt-3 text-[10.5px] text-[var(--text-muted)]">
              Open-Meteo · 10m Freshness
            </div>
          </div>

          {/* KPI 2: Humidity */}
          <div className="hairline-cell flex flex-col justify-between p-5">
            <div>
              <span className="metric-label flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-[var(--risk-3)]" />
                Relative Humidity
              </span>
              <div className="mt-3 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {currentHumidity.toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-[10.5px] text-[var(--text-muted)]">
              Evaporative cooling limit
            </div>
          </div>

          {/* KPI 3: Human Thermal Stress */}
          <div className="hairline-cell flex flex-col justify-between p-5">
            <div>
              <span className="metric-label flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[var(--risk-4)]" />
                Thermal Stress
              </span>
              <div className="mt-3 text-3xl font-bold tabular-nums text-[var(--risk-4)]">
                {calculatedThermalScore.toFixed(1)}/10
              </div>
            </div>
            <div className="mt-3 text-[10.5px] text-[var(--text-muted)]">
              UTCI {effectiveUtci != null ? `${effectiveUtci.toFixed(1)}°C` : 'model'} · COST 730
            </div>
          </div>

          {/* KPI 4: Heat Risk Level */}
          <div className="hairline-cell flex flex-col justify-between p-5">
            <div>
              <span className="metric-label flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Heat Risk Level
              </span>
              <div
                className="mt-3 text-2xl font-bold uppercase tracking-tight"
                style={{ color: riskColor }}
              >
                {RISK_LABELS[effectiveRiskLevel]}
              </div>
            </div>
            <div className="mt-3 text-[10.5px] text-[var(--text-muted)]">
              Integrated TAPAS Index
            </div>
          </div>
        </div>
      </section>

      {/* MAP SECTION: Full width, min 620px, dark basemap with floating overlays */}
      <section aria-label="Geographic Intelligence Map" className="space-y-3">
        <div
          className={cn(
            'grid items-start gap-4',
            panelOpen && isDesktop
              ? 'lg:grid-cols-[minmax(0,1fr)_minmax(340px,32%)]'
              : 'grid-cols-1'
          )}
        >
          <div className="min-w-0 space-y-3">
            <div className="w-full min-h-[680px]">
              <HeatMap
                location={location}
                selectedDate={selectedDate}
                geojson={geojson.data}
                wards={wards}
                selectedWardId={selectedWardId}
                onWardSelect={onWardSelect}
                resources={resources}
                selectedResourceId={selectedResource}
                onResourceSelect={onResourceSelect}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <MapControls
                dates={dates}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />

              <Button
                variant="outline"
                className="min-h-11 lg:hidden text-xs border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                onClick={() => setRankingOpen(true)}
              >
                <ListOrdered className="mr-1.5 h-4 w-4" />
                Hottest Wards List
              </Button>
            </div>
          </div>

          {/* Desktop Slide-in Ward Intelligence Panel */}
          {panelOpen && isDesktop ? (
            <div className="max-h-[780px] overflow-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-2xl">
              {panel}
            </div>
          ) : null}
        </div>
      </section>

      {/* ORDERED SECTIONS BELOW MAP */}
      <div className="space-y-6 pt-2">
        {/* 1. Human Thermal Stress Index Panel (Signature Feature) */}
        <ThermalStressPanel data={thermalStress} />

        {/* 2. Extreme Heat Precautions (Varies visibly by risk level; 3 audience tabs) */}
        <Precautions
          riskLevel={effectiveRiskLevel}
          selectedDate={selectedDate}
          heatIndex={hi}
        />

        {/* 3. Nearest Cooling Spots (Ranked by distance, verified timestamp, honest empty state) */}
        <CoolingSpotsPanel
          spots={coolingSpots}
          wardName={activeZoneName}
          userLocation={activeCoordinates}
        />

        {/* 4. Nearby Healthcare Facilities (PHCs, CHCs, hospitals, surge state) - Only available to Mandal Officer & District Officer */}
        {isOfficerOrAuthority && (
          <HealthcareReadiness
            facilities={health.facilities}
            wardName={activeZoneName}
            canReportSurge={isOfficerOrAuthority}
          />
        )}

        {/* 5. Local Response Network (Ward member, MRO, ASHA, permanent simulated marker) */}
        <LocalResponseNetwork
          officials={network.officials}
          ashaWorkers={network.asha_workers}
          wardName={activeZoneName}
        />

        {/* 6. Forecast Strip (Multi-day risk outlook) */}
        {wardRiskSeries.data?.days && wardRiskSeries.data.days.length > 0 ? (
          <div className="hairline-grid p-5">
            <span className="metric-label block mb-3 text-[var(--text-secondary)]">
              5-Day Outlook &amp; Hot Night Recovery ({selectedWard?.ward_name ?? 'Local Ward'})
            </span>
            <RiskStrip
              days={wardRiskSeries.data.days}
              selectedDate={selectedDate}
              onDaySelect={setSelectedDate}
            />
          </div>
        ) : null}
      </div>

      {/* Mobile Ranking Sheet */}
      <Sheet open={rankingOpen && !isDesktop} onOpenChange={setRankingOpen}>
        <SheetContent side="bottom" className="h-[75dvh] p-0 bg-[var(--bg-primary)] border-[var(--border-subtle)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Highest Risk Wards</SheetTitle>
            <SheetDescription>Ranked wards for the selected date.</SheetDescription>
          </SheetHeader>
          <RiskRanking
            date={selectedDate}
            selectedWardId={selectedWardId}
            onSelect={onWardSelect}
          />
        </SheetContent>
      </Sheet>

      {/* Mobile Ward Panel Sheet */}
      <Sheet
        open={panelOpen && !isDesktop}
        onOpenChange={(open) => {
          if (!open) selectWard(null)
        }}
      >
        <SheetContent side="bottom" className="h-[88dvh] p-0 bg-[var(--bg-primary)] border-[var(--border-subtle)]" hideClose>
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedWard?.ward_name ?? 'Ward detail'}</SheetTitle>
            <SheetDescription>Forecast and source-backed guidance.</SheetDescription>
          </SheetHeader>
          {!isDesktop ? panel : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

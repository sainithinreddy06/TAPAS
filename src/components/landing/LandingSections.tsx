'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CloudSun,
  Flame,
  ShieldAlert,
  Users,
  LifeBuoy,
  CheckSquare,
  ArrowRight,
  CheckCircle2,
  HardHat,
  Pickaxe,
  Hospital,
  Snowflake,
  Users2,
  Droplets,
  BellRing,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const HOW_IT_WORKS = [
  { icon: CloudSun, title: 'Forecast', desc: 'Open-Meteo numerical weather predictions' },
  { icon: Flame, title: 'Thermal Stress', desc: 'Human biometeorological strain (UTCI)' },
  { icon: ShieldAlert, title: 'Who is at Risk', desc: 'Vulnerability, age & outdoor exposure' },
  { icon: LifeBuoy, title: 'Resource Mapping', desc: 'Cooling spots, water & healthcare facilities' },
  { icon: CheckSquare, title: 'Action Priority', desc: 'Ranked interventions with review panels' },
  { icon: BellRing, title: 'What Happens Now', desc: 'Coordinated dispatches & fleet actions' },
]

const DIFFERENTIATORS = [
  {
    icon: Flame,
    title: 'Thermal Stress Over Temperature',
    desc: '41°C in dry air is radically different from 41°C at 68% humidity. TAPAS evaluates UTCI human biometeorology instead of raw thermometer readings.',
  },
  {
    icon: ShieldAlert,
    title: 'Ward-Level Localisation',
    desc: 'India’s heat varies across city blocks. TAPAS calculates granular ward-level microclimate and population risk rather than coarse district averages.',
  },
  {
    icon: Users,
    title: 'Vulnerability-Aware Weighting',
    desc: 'Directly accounts for elderly demographics, night-time minimum recovery, and dense unshaded settlements.',
  },
  {
    icon: HardHat,
    title: 'Worker-Specific Protection',
    desc: 'Tailored work/rest schedules for construction, agriculture, sanitation, and street vendors based on ACGIH standards.',
  },
  {
    icon: Pickaxe,
    title: 'Mine-Worker Shift Overlap Detection',
    desc: 'Novel operational capability: automatically flags when afternoon mining shifts overlap peak thermal stress windows (13:00–16:30).',
  },
  {
    icon: Hospital,
    title: 'Healthcare Surge Readiness',
    desc: 'Tracks PHC, CHC and hospital readiness states (Not Sent → Sent → Delivered → Acknowledged) with patient surge indicators.',
  },
  {
    icon: Snowflake,
    title: 'Verified Cooling-Centre Discovery',
    desc: 'Distance-ranked public cooling spots with explicit verification timestamps. Unverified areas honestly show empty states.',
  },
  {
    icon: Users2,
    title: 'Local Response Network',
    desc: 'Direct operational directory of Ward Members, MROs, and ASHA workers with role-gated notifications.',
  },
  {
    icon: Droplets,
    title: 'Misting Team Fleet Coordination',
    desc: 'Manages evaporative cooling tankers and cannon deployments with automated risk-scaled recommendations.',
  },
  {
    icon: CheckCircle2,
    title: 'Action-Oriented Response Engine',
    desc: 'Transforms visualization into action: ranked urgent operational tasks with explicit preview and confirmation dialogs.',
  },
]

export function LandingSections() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* 1. How TAPAS Works: 6 Stage Connected Chain */}
      <section
        aria-labelledby="how-it-works-heading"
        className={cn(
          'mx-auto max-w-6xl px-4 py-16 sm:px-6 transition-all duration-700',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        )}
      >
        <div className="text-center max-w-2xl mx-auto">
          <span className="metric-label text-[var(--accent)]">Six-Stage Chain</span>
          <h2 id="how-it-works-heading" className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">
            How TAPAS Works
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
            From atmospheric numerical weather predictions to ground-level life-saving interventions.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {HOW_IT_WORKS.map((stage, idx) => {
            const Icon = stage.icon
            return (
              <div
                key={stage.title}
                style={{ transitionDelay: `${idx * 60}ms` }}
                className={cn(
                  'flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-left transition-all duration-500',
                  revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--accent)] border border-[var(--border-subtle)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {stage.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {stage.desc}
                  </p>
                </div>

                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="mt-4 hidden lg:flex justify-end text-[var(--text-muted)]">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Why TAPAS is Different: 10 Differentiators Hairline Grid */}
      <section
        aria-labelledby="why-tapas-heading"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 border-t border-[var(--border-subtle)]"
      >
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="metric-label text-[var(--accent)]">Key Capabilities</span>
          <h2 id="why-tapas-heading" className="text-2xl font-bold tracking-tight sm:text-3xl mt-1">
            Why TAPAS is Different
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
            Built to answer not just &ldquo;how hot is it?&rdquo; but &ldquo;who is in danger, where are the resources, and what happens now?&rdquo;
          </p>
        </div>

        {/* Compact Hairline Grid */}
        <div className="hairline-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {DIFFERENTIATORS.map((diff) => {
            const Icon = diff.icon
            return (
              <div
                key={diff.title}
                className="hairline-cell flex flex-col justify-between p-5 space-y-2 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-elevated)] text-[var(--accent)] border border-[var(--border-subtle)] mb-3">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {diff.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {diff.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Data Transparency Statement */}
      <section
        aria-label="Data Transparency"
        className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-8 sm:px-6"
      >
        <div className="mx-auto max-w-3xl text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Data Integrity &amp; Sourcing
          </p>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
            Scientific foundation: Open-Meteo numerical weather forecasts (ECMWF), OpenStreetMap spatial datasets, and published Indian heat-mortality epidemiological research.
          </p>
          <p className="text-xs font-mono font-medium text-[var(--text-primary)]">
            Live, cached and simulated data are always labelled as such.
          </p>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-[var(--text-muted)] space-y-1 sm:px-6">
        <p>
          TAPAS — Thermal Analytics &amp; Public-health Advisory System
        </p>
        <p className="text-[11px]">
          Smart India Hackathon 2026 (Problem Statement SIH26083, Ministry of Earth Sciences / NCMRWF).
        </p>
        <p className="text-[10px] text-[var(--text-muted)] pt-2">
          Map data © OpenStreetMap contributors, ODbL.
        </p>
      </footer>
    </div>
  )
}

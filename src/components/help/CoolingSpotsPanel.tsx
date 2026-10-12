'use client'

import { Snowflake, Navigation, AlertCircle, Clock, Users, ExternalLink } from 'lucide-react'
import type { CoolingSpot } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CoolingSpotsPanelProps {
  spots: CoolingSpot[]
  wardName?: string
  className?: string
  onSpotSelect?: (spot: CoolingSpot) => void
  userLocation?: { latitude: number; longitude: number }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function CoolingSpotsPanel({
  spots,
  wardName,
  className,
  onSpotSelect,
  userLocation,
}: CoolingSpotsPanelProps) {
  // Sort strictly by distance
  const sorted = [...spots].sort((a, b) => a.distance_km - b.distance_km)

  return (
    <section
      aria-labelledby="cooling-spots-heading"
      className={cn('hairline-grid', className)}
    >
      <div className="hairline-cell border-b border-[var(--border-subtle)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--bg-base)]">
              <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 id="cooling-spots-heading" className="metric-label text-[var(--text-secondary)]">
              Nearest Verified Cooling Spots
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {wardName ? `Near ${wardName}` : 'Selected Ward Area'}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Air-conditioned halls, shaded transit hubs, and public shelters ranked by straight-line distance.
        </p>
      </div>

      <div className="hairline-cell p-4 sm:p-5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 text-center">
            <AlertCircle className="h-7 w-7 text-[var(--text-muted)]" />
            <h4 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              No verified cooling-centre dataset available for this ward.
            </h4>
            <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
              TAPAS does not fabricate real-time occupancy or unverified shelter records. Check municipal bulletins or visit the nearest government hospital.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sorted.map((spot) => {
              const lastVerifiedMs = spot.last_verified ? Date.parse(spot.last_verified) : 0
              const isOlderThan7Days = Date.now() - lastVerifiedMs > SEVEN_DAYS_MS
              const hasOrigin = userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)
              const directionsUrl = hasOrigin
                ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${spot.latitude},${spot.longitude}`
                : `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`

              return (
                <li
                  key={spot.id}
                  onClick={() => onSpotSelect?.(spot)}
                  className={cn(
                    'rounded-lg border p-3.5 transition-all cursor-pointer',
                    isOlderThan7Days
                      ? 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 opacity-70'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {spot.name}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--accent)]">
                          {spot.distance_km < 0.1 ? '< 0.1' : spot.distance_km.toFixed(1)} km
                        </span>
                        <span>·</span>
                        <span className="capitalize">{spot.type.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2">
                    {spot.address}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      {spot.capacity ? (
                        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Users className="h-3 w-3 text-[var(--text-muted)]" />
                          Capacity: {spot.capacity} persons
                        </span>
                      ) : null}

                      <span
                        className={cn(
                          'flex items-center gap-1',
                          isOlderThan7Days ? 'text-amber-500/80 font-medium' : 'text-[var(--text-muted)]'
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {isOlderThan7Days
                          ? `Verified ${spot.last_verified.slice(0, 10)} (> 7d old)`
                          : `Verified ${spot.last_verified.slice(0, 10)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="min-h-9 border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] text-xs"
                      >
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                          <Navigation className="mr-1 h-3 w-3 text-[var(--accent)]" />
                          Get Directions
                          <ExternalLink className="ml-1 h-2.5 w-2.5 opacity-60" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="hairline-cell-elevated flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-5">
        <span>Records older than 7 days are greyed; availability is not guaranteed in real time.</span>
        <span>Directions open external navigation via Google Maps.</span>
      </div>
    </section>
  )
}

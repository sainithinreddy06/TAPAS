'use client'

import { useEffect, useState } from 'react'
import type { HeatPoint } from '@/lib/heatGrid'
import { fetchTickerReadings } from '@/lib/landing'
import styles from './ReferenceWeather.module.css'

type WeatherState =
  | { status: 'loading' | 'unavailable' }
  | { status: 'ready'; point: HeatPoint }

function reading(value: number | null, unit: string, digits = 1): string {
  return value !== null && Number.isFinite(value)
    ? `${value.toFixed(digits)}${unit}`
    : 'Unavailable'
}

function validTime(iso: string): string {
  return `${new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })} IST`
}

export function ReferenceWeather() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchTickerReadings(controller.signal)
      .then((points) => {
        if (controller.signal.aborted) return
        const point = points.find(
          (candidate) => candidate.name.trim() && Number.isFinite(Date.parse(candidate.time)),
        )
        setWeather(point ? { status: 'ready', point } : { status: 'unavailable' })
      })
      .catch(() => {
        if (!controller.signal.aborted) setWeather({ status: 'unavailable' })
      })
    return () => controller.abort()
  }, [])

  return (
    <section
      aria-label="Reference weather"
      className={styles.referenceWeather}
      data-testid="reference-weather"
    >
      <div className={styles.heading}>
        <p className={styles.label}>Reference weather</p>
        <p className={styles.source}>Open-Meteo weather model</p>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {weather.status === 'ready' ? (
          <>
            <div className={styles.context}>
              <p className={styles.city}>{weather.point.name}</p>
              <p className={styles.timestamp}>
                Valid <time dateTime={weather.point.time}>{validTime(weather.point.time)}</time>
              </p>
            </div>
            <dl className={styles.readings}>
              <div className={styles.reading}>
                <dt>Air temperature</dt>
                <dd>{reading(weather.point.temperature, '°C')}</dd>
              </div>
              <div className={styles.reading}>
                <dt>Relative humidity</dt>
                <dd>{reading(weather.point.humidity, '%', 0)}</dd>
              </div>
              <div className={styles.reading}>
                <dt>Wind speed</dt>
                <dd>{reading(weather.point.wind, ' m/s')}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className={styles.status}>
            {weather.status === 'loading' ? 'Loading reference weather…' : 'Reference weather unavailable'}
          </p>
        )}
      </div>
    </section>
  )
}

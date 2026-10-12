import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RiskLevel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** YYYY-MM-DD in India Standard Time — the format every TAPAS endpoint expects. */
export function toIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

/** The dates the dashboard can show, starting today. */
export function forecastDates(days = 5, from = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => toIsoDate(addDays(from, i)))
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00+05:30`)
}

/** "Today", then "Tue", "Wed"... */
export function dayLabel(iso: string, _index?: number): string {
  void _index
  if (iso === todayIso()) return 'Today'
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })
}

export function longDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function shortDate(iso: string): string {
  const date = parseIsoDate(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatClock(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

/** Whole days elapsed since an ISO date, or null if unparseable/absent. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86_400_000)
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

/** Accept only a supplied valid numeric level; missing or malformed values stay unknown. */
export function clampRiskLevel(value: unknown): RiskLevel | null {
  return isRiskLevel(value) ? value : null
}

export function formatTemp(
  value: number | undefined | null,
  digits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return `${Number(value).toFixed(digits)}°C`
}

/** "05:00" from an hour index. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

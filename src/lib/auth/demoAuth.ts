'use client'
// PROTOTYPE FRONTEND AUTH — SIH DEMONSTRATION ONLY.
// Not secure. Production requires server-side authentication and
// server-enforced route/API authorization. No private data belongs behind this guard.
import { useSyncExternalStore } from 'react'
export type DemoRole = 'officer' | 'authority'
export const DEMO_ACCOUNTS = [
  { id: 'sih-mandal-demo', role: 'officer' as const, name: 'Mandal Officer', route: '/officer' },
  { id: 'sih-authority-demo', role: 'authority' as const, name: 'Higher Authority', route: '/authority' },
]
const KEY = 'tapas-demo-role-v1'
const EVENT = 'tapas-demo-session'
function read(): DemoRole | null {
  try { const value = localStorage.getItem(KEY); return value === 'officer' || value === 'authority' ? value : null } catch { return null }
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback); window.addEventListener('storage', callback)
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', callback) }
}
export function useDemoRole() { return useSyncExternalStore(subscribe, read, (): undefined => undefined) }
export function signInDemo(role: DemoRole) { localStorage.setItem(KEY, role); window.dispatchEvent(new Event(EVENT)) }
export function signOutDemo(): boolean {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // A readable session must not be reported as cleared when removal fails.
    // If reads are blocked too, the app already treats the session as signed out.
    if (read() !== null) return false
  }
  window.dispatchEvent(new Event(EVENT))
  return true
}

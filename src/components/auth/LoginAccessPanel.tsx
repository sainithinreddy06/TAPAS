'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, LockKeyhole, Shield, Building2 } from 'lucide-react'
import { signInDemo, type DemoRole } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import styles from '@/components/landing/ThermalAccess.module.css'

const ACCESS_ROLES = [
  { id: 'officer', label: 'Mandal Officer', icon: Shield },
  { id: 'authority', label: 'District Authority', icon: Building2 },
] as const

/** Existing demo sign-in, separated from the decorative access scene. */
export function LoginAccessPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectionQuery } = useLocation()

  const roleParam = searchParams.get('role')
  const [selectedRole, setSelectedRole] = useState<DemoRole>(roleParam === 'authority' ? 'authority' : 'officer')

  useEffect(() => {
    if (roleParam === 'authority' || roleParam === 'officer') {
      setSelectedRole(roleParam)
    }
  }, [roleParam])

  const activeRole = selectedRole
  const isAuthority = activeRole === 'authority'

  // Default hinted credentials based on role param
  const demoEmail = isAuthority ? 'collector@tapas.gov.in' : 'officer@tapas.gov.in'
  const demoPass = 'tapas2026'

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const [emailInput, setEmailInput] = useState({ value: '', automatic: false })
  const email = emailInput.value
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  const handleRoleSwitch = (newRole: DemoRole) => {
    if (isLoading) return
    setError(null)
    setSelectedRole(newRole)
    const currentSearch = typeof window !== 'undefined' ? window.location.search : searchParams.toString()
    const newParams = new URLSearchParams(currentSearch)
    newParams.set('role', newRole)
    const targetUrl = `/login?${newParams.toString()}`
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', targetUrl)
    }
    router.replace(targetUrl, { scroll: false })
    const prevDemoEmail = isAuthority ? 'collector@tapas.gov.in' : 'officer@tapas.gov.in'
    const nextDemoEmail = newRole === 'authority' ? 'collector@tapas.gov.in' : 'officer@tapas.gov.in'
    setEmailInput(current => !current.value.trim() || current.automatic || current.value.trim().toLowerCase() === prevDemoEmail
      ? { value: nextDemoEmail, automatic: true }
      : current)
  }

  const handleRoleKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? index + 1
      : event.key === 'ArrowLeft' ? index - 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? ACCESS_ROLES.length - 1
      : null
    if (next === null || isLoading) return
    event.preventDefault()
    const target = Math.max(0, Math.min(ACCESS_ROLES.length - 1, next))
    handleRoleSwitch(ACCESS_ROLES[target].id)
    tabs.current[target]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter your officer credentials.')
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    const authenticatedRole: DemoRole | null = password !== demoPass ? null
      : cleanEmail.includes('officer') ? 'officer'
      : cleanEmail.includes('collector') || cleanEmail.includes('authority') ? 'authority'
      : null
    if (!authenticatedRole) {
      setError('Invalid credentials. Check the hinted officer access credentials below.')
      return
    }

    try {
      setIsLoading(true)
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
      try {
        await fetch(`${base}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: cleanEmail, password: password.trim() }),
        })
      } catch {
        // Continue even if backend is offline so demo fallback works
      }
      signInDemo(authenticatedRole)
      router.push(`/${authenticatedRole}?${selectionQuery}`)
    } catch {
      setIsLoading(false)
      setError('Demo sign-in needs browser storage. Allow site storage and try again.')
    }
  }

  return (
    <section className={styles.formPanel} aria-labelledby="access-title">
      <div className={styles.formInner}>
        <div className={styles.roleTabs} data-hydrated={hydrated} role="tablist" aria-label="Select access role">
          {ACCESS_ROLES.map(({ id, label, icon: Icon }, index) => {
            const active = id === (isAuthority ? 'authority' : 'officer')
            return (
              <button
                key={id}
                ref={(element) => { tabs.current[index] = element }}
                id={`access-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="access-panel"
                tabIndex={active ? 0 : -1}
                disabled={isLoading}
                onClick={() => handleRoleSwitch(id)}
                onKeyDown={(event) => handleRoleKeys(event, index)}
                className={`${styles.roleTab} ${active ? styles.roleTabActive : ''}`}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        <div id="access-panel" role="tabpanel" aria-labelledby={`access-tab-${isAuthority ? 'authority' : 'officer'}`}>
          <div className={styles.formHeader}>
            <p className={styles.eyebrow}><LockKeyhole size={13} aria-hidden="true" /> RESPONSE NETWORK</p>
            <h2 id="access-title">{isAuthority ? 'Authority Command Access' : 'Officer Access'}</h2>
            <p className={styles.formSubtitle}>
              {isAuthority
                ? 'Sign in to district-wide command and escalation workspace.'
                : 'Sign in to your ward operational workspace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <fieldset disabled={isLoading} className={styles.fields}>
              <div>
                <label htmlFor="officer-id" className={styles.fieldLabel}>Officer ID or email</label>
                <input
                  id="officer-id"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmailInput({ value: e.target.value, automatic: false })
                    if (error) setError(null)
                  }}
                  placeholder={demoEmail}
                  className={styles.input}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'access-error' : undefined}
                />
              </div>

              <div>
                <label htmlFor="officer-password" className={styles.fieldLabel}>Password</label>
                <div className={styles.passwordField}>
                  <input
                    id="officer-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="••••••••"
                    className={`${styles.input} ${styles.passwordInput}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'access-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
                {error && <p id="access-error" role="alert" className={styles.error}>{error}</p>}
              </div>

              <button type="submit" className={styles.submitButton}>
                {isLoading ? (
                  <><Loader2 size={16} className={styles.spinner} aria-hidden="true" /><span role="status">Verifying credentials…</span></>
                ) : (
                  <><span>Secure sign in</span><ArrowRight size={17} aria-hidden="true" /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailInput({ value: demoEmail, automatic: true })
                  setPassword(demoPass)
                  setError(null)
                }}
                className={styles.demoHint}
              >
                Demo access — {demoEmail} / {demoPass}
              </button>

              <div className={styles.publicLinkWrap}>
                <Link href={`/dashboard?${selectionQuery}`} className={styles.publicLink}>
                  <ArrowLeft size={14} aria-hidden="true" /> Public heat advisory
                </Link>
              </div>
            </fieldset>
          </form>
        </div>

        <p className={styles.attribution}>Smart India Hackathon 2026 · Ministry of Earth Sciences</p>
      </div>
    </section>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ArrowRight, LogOut } from 'lucide-react'
import { useDemoRole, signOutDemo } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/occupational', label: 'Occupational' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/about', label: 'About' },
]

const AUTH_ACTION_CLASS = 'inline-flex min-h-[44px] max-w-full items-center justify-center gap-1.5 rounded-md border border-[var(--line-soft)] bg-transparent px-3 py-2 text-xs font-medium leading-normal text-[var(--ink-mid)] hover:border-[var(--accent)] hover:text-[var(--ink-high)] transition-colors'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const role = useDemoRole()
  const { selectionQuery } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMobileMenuOpen(false)
    setSignOutError(null)
  }, [pathname])

  // Landing page hero handles its own clean role cards
  if (pathname === '/') return null

  const isOfficerOrAuthority = (role === 'officer' || role === 'authority') && pathname !== '/dashboard'
  const userDisplayName =
    role === 'officer'
      ? 'S. Kumar · Mandal Officer'
      : role === 'authority'
      ? 'Dr. A. Sharma · District Authority'
      : null

  const handleSignOut = () => {
    if (!signOutDemo()) {
      setSignOutError('Could not clear the demo session. Allow site storage and try again.')
      return
    }
    setSignOutError(null)
    setMobileMenuOpen(false)
    router.push(`/login?${selectionQuery}`)
  }

  const authAction = isOfficerOrAuthority ? (
    <button
      type="button"
      onClick={handleSignOut}
      className={AUTH_ACTION_CLASS}
      aria-describedby={signOutError ? 'navbar-sign-out-error' : undefined}
    >
      <LogOut className="h-3.5 w-3.5 shrink-0 text-[var(--ink-low)]" aria-hidden="true" />
      <span>Sign out</span>
    </button>
  ) : (
    <Link
      href={`/login?role=officer&${selectionQuery}`}
      onClick={() => setMobileMenuOpen(false)}
      className={AUTH_ACTION_CLASS}
    >
      <span>Officer sign in</span>
      <ArrowRight className="h-3 w-3 shrink-0 text-[var(--ink-low)]" aria-hidden="true" />
    </Link>
  )

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--line-soft)] bg-[var(--surface-0)]/95 backdrop-blur-md no-print"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobileMenuOpen) {
          setMobileMenuOpen(false)
          menuButtonRef.current?.focus()
        }
      }}
    >
      <nav aria-label="Main" className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* Left: Wordmark linking to / (primary escape hatch) */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href={`/?${selectionQuery}`}
            onClick={() => setMobileMenuOpen(false)}
            className="group flex min-h-[44px] max-w-full items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="Return to TAPAS Home"
            title="Return to TAPAS Home"
          >
            <Image
              src="/tapas-emblem.png"
              alt="TAPAS Emblem"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain transition-transform group-hover:scale-105"
              priority
            />
            <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-extrabold tracking-wider text-[var(--ink-high)]">
                TAPAS
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-[var(--ink-low)] sm:inline">
                Heat Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden max-w-full flex-wrap items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <li key={link.href}>
                  <Link
                    href={`${link.href}?${selectionQuery}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[44px] items-center rounded-md px-3 py-2 text-xs font-medium tracking-wide transition-colors',
                      active
                        ? 'bg-[var(--surface-2)] text-[var(--ink-high)] border border-[var(--line-soft)] font-semibold'
                        : 'text-[var(--ink-mid)] hover:bg-[var(--surface-1)] hover:text-[var(--ink-high)]'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Right side controls: Live status + Auth state */}
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-3">
          {/* Live Status Pill */}
          <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--ink-low)] tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
            <span className="text-[var(--ink-high)]">● LIVE</span>
          </div>

          {/* Authenticated User vs Public Sign In */}
          <div className="hidden max-w-full flex-wrap items-center gap-2.5 sm:flex">
            {isOfficerOrAuthority && (
              <>
                <span className="hidden items-center text-xs font-medium text-[var(--ink-mid)] font-variant-numeric tabular-nums leading-normal lg:inline-flex">
                  {userDisplayName}
                </span>
                <div className="hidden h-3.5 w-px bg-[var(--line-soft)] lg:block" aria-hidden="true" />
              </>
            )}
            {authAction}
          </div>

          {/* Mobile hamburger button */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(open => !open)}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-md border border-[var(--line-soft)] bg-[var(--surface-2)] text-[var(--ink-mid)] lg:hidden hover:text-[var(--ink-high)] transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile navigation collapse sheet */}
      <nav id="mobile-navigation" aria-label="Mobile" hidden={!mobileMenuOpen} className="border-t border-[var(--line-hair)] bg-[var(--surface-1)] p-4 lg:hidden">
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <li key={link.href}>
                <Link
                  href={`${link.href}?${selectionQuery}`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    active
                      ? 'bg-[var(--surface-2)] text-[var(--ink-high)] font-semibold border-l-2 border-[var(--accent)]'
                      : 'text-[var(--ink-mid)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-high)]'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-3 border-t border-[var(--line-hair)] pt-3 sm:hidden">
          {authAction}
        </div>

        {isOfficerOrAuthority && userDisplayName && (
          <div className="mt-3 pt-3 border-t border-[var(--line-hair)] text-xs text-[var(--ink-low)]">
            Logged in as <span className="text-[var(--ink-high)] font-medium">{userDisplayName}</span>
          </div>
        )}
      </nav>

      {isOfficerOrAuthority && signOutError && (
        <p id="navbar-sign-out-error" role="alert" className="mx-auto max-w-[1800px] break-words px-4 pb-3 text-xs leading-relaxed text-[var(--ink-high)] sm:px-6">
          {signOutError}
        </p>
      )}
    </header>
  )
}

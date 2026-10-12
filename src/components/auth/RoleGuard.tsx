'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDemoRole, type DemoRole } from '@/lib/auth/demoAuth'
import { useLocation } from '@/components/providers/LocationProvider'

export function RoleGuard({ role, children }: { role: DemoRole; children: ReactNode }) {
  const current = useDemoRole()
  const router = useRouter()
  const { selectionQuery } = useLocation()

  useEffect(() => {
    if (current !== undefined && current !== role) {
      router.replace(`/login?role=${role}&${selectionQuery}`)
    }
  }, [current, role, router, selectionQuery])

  if (current !== role) {
    return <p role="status" className="p-6 text-xs text-[var(--ink-mid)]">Opening sign-in…</p>
  }

  return <>{children}</>
}

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginAccessPanel } from '@/components/auth/LoginAccessPanel'
import { ThermalAccess } from '@/components/landing/ThermalAccess'
import styles from '@/components/landing/ThermalAccess.module.css'

function LoginPresentation() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') === 'authority' ? 'authority' : 'officer'

  return (
    <ThermalAccess role={role}>
      <LoginAccessPanel />
    </ThermalAccess>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading authentication gateway…</div>}>
      <LoginPresentation />
    </Suspense>
  )
}

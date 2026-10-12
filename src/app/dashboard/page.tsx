'use client'

import { useEffect, useState } from 'react'
import { CitizenDashboard } from '@/components/dashboard/CitizenDashboard'
import { signOutDemo } from '@/lib/auth/demoAuth'

export default function DashboardPage() {
  const [signOutFailed, setSignOutFailed] = useState(false)
  useEffect(() => {
    setSignOutFailed(!signOutDemo())
  }, [])

  return (
    <>
      {signOutFailed && <p role="alert" className="mx-4 mt-4 rounded-md border border-amber-500/40 p-3 text-sm text-amber-200">Could not clear the demo session. Allow site storage and try again.</p>}
      <CitizenDashboard />
    </>
  )
}

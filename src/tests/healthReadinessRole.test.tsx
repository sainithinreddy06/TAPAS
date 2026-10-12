import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { HealthcareReadiness } from '@/components/health/HealthcareReadiness'
import { signInDemo, signOutDemo } from '@/lib/auth/demoAuth'
import type { HealthcareFacility } from '@/lib/types'

const MOCK_FACILITIES: HealthcareFacility[] = [
  {
    id: 'fac-1',
    ward_id: 'ward-42-kukatpally',
    name: 'Kukatpally Area Hospital',
    facility_type: 'hospital',
    distance_km: 1.2,
    bed_capacity_label: '24 beds available',
    emergency_ready: true,
    heat_risk_status: 'Severe',
    status: 'Normal Operations',
    notification_state: 'NOT_SENT',
    source: 'OpenStreetMap',
    is_demo: true,
    updated_at: '2026-09-10T00:00:00Z',
    latitude: 17.485,
    longitude: 78.39,
  },
  {
    id: 'fac-2',
    ward_id: 'ward-42-kukatpally',
    name: 'Moosapet Urban Primary Health Centre',
    facility_type: 'phc',
    distance_km: 2.5,
    bed_capacity_label: '3 beds available',
    emergency_ready: true,
    heat_risk_status: 'Moderate',
    status: 'Normal Operations',
    notification_state: 'SENT',
    source: 'OpenStreetMap',
    is_demo: true,
    updated_at: '2026-09-10T00:00:00Z',
    latitude: 17.497,
    longitude: 78.391,
  },
]

describe('HealthcareReadiness Role-Based Access Control', () => {
  beforeEach(() => {
    signOutDemo()
  })

  it('hides the Report Facility Surge button when canReportSurge is false (regular user/citizen)', () => {
    render(
      <HealthcareReadiness
        facilities={MOCK_FACILITIES}
        wardName="Ward 42, Kukatpally"
        canReportSurge={false}
      />
    )

    // Heading should be visible if component is rendered
    expect(screen.getByRole('heading', { name: /Healthcare Facility Surge Readiness/i })).toBeInTheDocument()

    // "+ Report Facility Surge" button MUST NOT be present
    expect(screen.queryByRole('button', { name: /\+ Report Facility Surge/i })).not.toBeInTheDocument()

    // Action column should show non-interactive text badge rather than dispatch button
    expect(screen.queryByRole('button', { name: /Send Surge Alert/i })).not.toBeInTheDocument()
    expect(screen.getByText('NOT_SENT')).toBeInTheDocument()
  })

  it('shows Report Facility Surge button and allows dispatch when canReportSurge is true (Mandal Officer / District Officer)', () => {
    render(
      <HealthcareReadiness
        facilities={MOCK_FACILITIES}
        wardName="Ward 42, Kukatpally"
        canReportSurge={true}
      />
    )

    // "+ Report Facility Surge" button MUST be present for officers
    const surgeButton = screen.getByRole('button', { name: /\+ Report Facility Surge/i })
    expect(surgeButton).toBeInTheDocument()

    // Action column MUST show interactive dispatch button
    expect(screen.getByRole('button', { name: /Send Surge Alert/i })).toBeInTheDocument()
  })

  it('automatically detects officer role from auth state when canReportSurge is omitted', () => {
    signInDemo('officer')

    render(
      <HealthcareReadiness
        facilities={MOCK_FACILITIES}
        wardName="Ward 42, Kukatpally"
      />
    )

    expect(screen.getByRole('button', { name: /\+ Report Facility Surge/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Surge Alert/i })).toBeInTheDocument()
  })

  it('automatically detects authority (district officer) role from auth state when canReportSurge is omitted', () => {
    signInDemo('authority')

    render(
      <HealthcareReadiness
        facilities={MOCK_FACILITIES}
        wardName="District Command"
      />
    )

    expect(screen.getByRole('button', { name: /\+ Report Facility Surge/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Surge Alert/i })).toBeInTheDocument()
  })

  it('defaults to locked/citizen view when signed out and canReportSurge is omitted', () => {
    signOutDemo()

    render(
      <HealthcareReadiness
        facilities={MOCK_FACILITIES}
        wardName="Ward 42, Kukatpally"
      />
    )

    expect(screen.queryByRole('button', { name: /\+ Report Facility Surge/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send Surge Alert/i })).not.toBeInTheDocument()
    expect(screen.getByText('NOT_SENT')).toBeInTheDocument()
  })
})

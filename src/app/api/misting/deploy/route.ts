import { NextResponse } from 'next/server'
import { DEMO_MISTING_TEAMS } from '@/data/seedData'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { team_id, ward_id, target_location } = body

    const team =
      DEMO_MISTING_TEAMS.find((t) => t.id === team_id) || DEMO_MISTING_TEAMS[0]

    const updatedTeam = {
      ...team,
      status: 'En Route',
      assigned_ward: ward_id || team.assigned_ward,
      current_location_name: target_location || 'En Route to Target Sector',
      last_deployment: `Just now (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST)`,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: `Misting unit dispatched to target sector (${target_location || 'Designated Zone'})`,
      is_demo: true,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action_id, notes, actor = 'Mandal Officer' } = body

    if (!action_id) {
      return NextResponse.json({ error: 'action_id is required' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action_id,
      status: 'Action In Progress',
      acknowledged: true,
      in_progress: true,
      acknowledged_by: actor,
      notes: notes || 'Protocol action acknowledged and teams mobilized.',
      acknowledged_at: new Date().toISOString(),
      is_demo: true,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}

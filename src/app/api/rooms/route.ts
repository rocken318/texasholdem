import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { generateId, generateJoinCode } from '@/lib/utils'
import type { RoomSettings } from '@/types/domain'

export async function POST(req: NextRequest) {
  const body = await req.json() as { format: 'cash' | 'tournament'; settings: RoomSettings }

  // Try up to 5 times for unique code
  let joinCode = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateJoinCode()
    const existing = await store.getRoomByCode(candidate)
    if (!existing) { joinCode = candidate; break }
  }
  if (!joinCode) return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })

  const now = Date.now()
  const hostPlayerId = generateId()
  const roomId = generateId()

  const room = await store.createRoom({
    id: roomId,
    join_code: joinCode,
    host_player_id: hostPlayerId,
    status: 'lobby',
    format: body.format,
    settings: body.settings,
    created_at: now,
  })

  return NextResponse.json({ room, hostPlayerId })
}

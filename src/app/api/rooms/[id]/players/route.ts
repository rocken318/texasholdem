import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { generateId } from '@/lib/utils'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const players = await store.getPlayersByRoom(id)
    return NextResponse.json({ players })
  } catch (e) {
    console.error('GET /players error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  let body: { displayName?: string; isHost?: boolean; playerId?: string }

  try {
    body = await req.json() as { displayName?: string; isHost?: boolean; playerId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const displayName = body.displayName?.trim().slice(0, 20)
  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  try {
    const room = await store.getRoomById(id)
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 409 })

    const players = await store.getPlayersByRoom(id)
    if (players.length >= room.settings.maxPlayers) {
      return NextResponse.json({ error: 'Room full' }, { status: 409 })
    }

    const player = await store.createPlayer({
      id: body.playerId ?? generateId(),
      room_id: id,
      display_name: displayName,
      chips: room.settings.startingChips,
      status: 'waiting',
      seat_index: players.length,
      is_host: body.isHost ?? false,
      joined_at: Date.now(),
    })

    await broadcastRoomEvent(id, { type: 'player_joined', player })
    return NextResponse.json({ player })
  } catch (error) {
    console.error('failed to create player', { roomId: id, error })
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { startNewHand } from '@/lib/poker/handLifecycle'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json() as { hostPlayerId: string }

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.host_player_id !== body.hostPlayerId) {
    return NextResponse.json({ error: 'Not host' }, { status: 403 })
  }

  const players = await store.getPlayersByRoom(id)
  const seated = players.filter(p => p.seat_index !== null && p.chips > 0)
  if (seated.length < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })

  await store.updateRoom(id, { status: 'playing' })

  const dealerSeat = seated[0].seat_index!
  await broadcastRoomEvent(id, { type: 'game_started', dealerSeat, players: seated })
  const handId = await startNewHand(id, seated, dealerSeat, room.settings, 1)

  return NextResponse.json({ handId })
}

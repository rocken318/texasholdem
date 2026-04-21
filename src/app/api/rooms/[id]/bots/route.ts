import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { generateId } from '@/lib/utils'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const room = await store.getRoomById(id)
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 409 })

    const players = await store.getPlayersByRoom(id)
    if (players.length >= room.settings.maxPlayers) {
      return NextResponse.json({ error: 'Room full' }, { status: 409 })
    }

    const botCount = players.filter(p => p.display_name.startsWith('Bot ')).length
    const player = await store.createPlayer({
      id: generateId(),
      room_id: id,
      display_name: `Bot ${botCount + 1}`,
      chips: room.settings.startingChips,
      status: 'waiting',
      seat_index: players.length,
      is_host: false,
      joined_at: Date.now(),
    })

    await broadcastRoomEvent(id, { type: 'player_joined', player })
    return NextResponse.json({ player })
  } catch (error) {
    console.error('Failed to add bot:', error)
    return NextResponse.json({ error: 'Failed to add bot' }, { status: 500 })
  }
}

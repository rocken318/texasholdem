import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { startNewHand } from '@/lib/poker/handLifecycle'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const hand = await store.getCurrentHand(id)
  if (!hand || hand.street !== 'finished') {
    return NextResponse.json({ error: 'Hand not finished' }, { status: 400 })
  }

  const players = await store.getPlayersByRoom(id)
  const activePlayers = players.filter(p => p.chips > 0 && p.seat_index !== null)

  if (activePlayers.length < 2) {
    return NextResponse.json({ error: 'Not enough players' }, { status: 400 })
  }

  const nextDealerSeat = hand.dealer_seat // Will be advanced by startNewHand logic
  // Find next dealer from hand_finished event data — use stored value
  const nextDealer = getNextDealer(activePlayers, hand.dealer_seat)

  await startNewHand(id, activePlayers, nextDealer, room.settings, hand.hand_number + 1)
  return NextResponse.json({ ok: true })
}

function getNextDealer(players: { seat_index: number | null }[], currentDealer: number): number {
  const seats = players
    .filter(p => p.seat_index !== null)
    .map(p => p.seat_index!)
    .sort((a, b) => a - b)
  if (seats.length === 0) return currentDealer
  const idx = seats.findIndex(s => s > currentDealer)
  return idx >= 0 ? seats[idx] : seats[0]
}

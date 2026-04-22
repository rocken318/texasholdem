import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const hand = await store.getCurrentHand(id)
  if (!hand) return NextResponse.json({ hand: null })

  const handPlayers = await store.getHandPlayers(hand.id)

  // Build table bets: current_bet per player this street
  const tableBets: Record<string, number> = {}
  for (const hp of handPlayers) {
    if (hp.current_bet > 0) tableBets[hp.player_id] = hp.current_bet
  }

  return NextResponse.json({
    hand: {
      id: hand.id,
      hand_number: hand.hand_number,
      dealer_seat: hand.dealer_seat,
      community_cards: hand.community_cards,
      pot: hand.pot,
      side_pots: hand.side_pots,
      street: hand.street,
      current_seat: hand.current_seat,
      current_bet: hand.current_bet,
      // omit deck/hole cards for security
    },
    tableBets,
    handPlayers: handPlayers.map(hp => ({
      player_id: hp.player_id,
      current_bet: hp.current_bet,
      total_bet: hp.total_bet,
      status: hp.status,
    })),
  })
}

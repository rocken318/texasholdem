import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { getValidActions, isBettingRoundComplete, getNextActiveSeat } from '@/lib/poker/engine'
import { calculatePots, totalPot } from '@/lib/poker/pot'
import { generateId } from '@/lib/utils'
import { advanceStreet, resolveHand } from '@/lib/poker/handLifecycle'
import type { PlayerActionType } from '@/types/domain'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json() as {
    playerId: string
    action: PlayerActionType
    amount?: number
  }

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const hand = await store.getCurrentHand(id)
  if (!hand) return NextResponse.json({ error: 'No active hand' }, { status: 400 })

  const players = await store.getPlayersByRoom(id)
  const handPlayers = await store.getHandPlayers(hand.id)
  const actingHandPlayer = handPlayers.find(hp => hp.player_id === body.playerId)
  const actingPlayer = players.find(p => p.id === body.playerId)

  if (!actingHandPlayer || !actingPlayer) {
    return NextResponse.json({ error: 'Player not in hand' }, { status: 400 })
  }
  if (actingPlayer.seat_index !== hand.current_seat) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
  }

  const validActions = getValidActions(actingHandPlayer, {
    currentBet: hand.current_bet,
    bigBlind: room.settings.bigBlind,
    playerChips: actingPlayer.chips,
  })

  // Apply action
  let newChips = actingPlayer.chips
  let newCurrentBet = actingHandPlayer.current_bet
  let newTotalBet = actingHandPlayer.total_bet
  let newStatus = actingHandPlayer.status
  let actionAmount = 0

  if (body.action === 'fold') {
    newStatus = 'folded'
  } else if (body.action === 'check') {
    if (!validActions.canCheck) return NextResponse.json({ error: 'Cannot check' }, { status: 400 })
  } else if (body.action === 'call') {
    const callAmt = validActions.callAmount
    newChips -= callAmt
    newCurrentBet += callAmt
    newTotalBet += callAmt
    actionAmount = callAmt
  } else if (body.action === 'raise') {
    if (!validActions.canRaise) return NextResponse.json({ error: 'Cannot raise' }, { status: 400 })
    const requestedTotal = body.amount ?? validActions.minRaise
    // Clamp: at least minRaise, at most all chips (all-in raise)
    const raiseTotal = Math.min(
      Math.max(requestedTotal, validActions.minRaise),
      actingHandPlayer.current_bet + actingPlayer.chips  // max = current_bet + remaining chips
    )
    const additionalChips = raiseTotal - actingHandPlayer.current_bet
    newChips -= additionalChips
    newCurrentBet = raiseTotal
    newTotalBet += additionalChips
    actionAmount = additionalChips
  } else if (body.action === 'all_in') {
    actionAmount = actingPlayer.chips
    newCurrentBet += actingPlayer.chips
    newTotalBet += actingPlayer.chips
    newChips = 0
    newStatus = 'all_in'
  }

  await store.updateHandPlayer(hand.id, body.playerId, {
    current_bet: newCurrentBet,
    total_bet: newTotalBet,
    status: newStatus,
  })
  await store.updatePlayer(body.playerId, {
    chips: newChips,
    status: newStatus === 'all_in' ? 'all_in' : actingPlayer.status,
  })

  const newHandCurrentBet = body.action === 'raise'
    ? Math.max(body.amount ?? validActions.minRaise, validActions.minRaise)
    : body.action === 'all_in'
    ? Math.max(hand.current_bet, newCurrentBet)
    : hand.current_bet

  await store.updateHand(hand.id, { current_bet: newHandCurrentBet })

  await store.createAction({
    id: generateId(),
    hand_id: hand.id,
    player_id: body.playerId,
    street: hand.street,
    action: body.action,
    amount: actionAmount,
    acted_at: Date.now(),
  })

  const updatedHandPlayers = await store.getHandPlayers(hand.id)
  const pots = calculatePots(updatedHandPlayers.map(hp => {
    return { playerId: hp.player_id, totalBet: hp.total_bet, status: hp.status }
  }))
  const pot = totalPot(pots)

  await broadcastRoomEvent(id, {
    type: 'player_action',
    playerId: body.playerId,
    action: body.action,
    amount: actionAmount,
    pot,
    currentBet: newHandCurrentBet,
  })

  // Check if only one player remaining (everyone else folded)
  const notFolded = updatedHandPlayers.filter(hp => hp.status !== 'folded')
  if (notFolded.length === 1) {
    await resolveHand({
      handId: hand.id, roomId: id,
      winnerIds: [notFolded[0].player_id],
      pots, handPlayers: updatedHandPlayers, players,
      room, handNumber: hand.hand_number, dealerSeat: hand.dealer_seat,
      community: hand.community_cards,
    })
    return NextResponse.json({ ok: true })
  }

  // Check if betting round is complete
  const roundComplete = isBettingRoundComplete(updatedHandPlayers, newHandCurrentBet)
  if (roundComplete) {
    await advanceStreet({
      hand: { ...hand, current_bet: newHandCurrentBet },
      roomId: id, handPlayers: updatedHandPlayers, players, room, pot, pots,
    })
  } else {
    // Find next active player
    const seatedActive = players
      .filter(p => {
        const hp = updatedHandPlayers.find(h => h.player_id === p.id)
        return hp && hp.status === 'active' && p.seat_index !== null
      })
      .map(p => ({ seatIndex: p.seat_index!, status: 'active' as const }))

    const nextSeat = getNextActiveSeat(seatedActive, actingPlayer.seat_index!)
    await store.updateHand(hand.id, { current_seat: nextSeat })

    const nextPlayer = players.find(p => p.seat_index === nextSeat)!
    await broadcastRoomEvent(id, {
      type: 'turn_started',
      playerId: nextPlayer.id,
      seatIndex: nextSeat,
      timeoutSec: room.settings.turnTimerSec,
    })
  }

  return NextResponse.json({ ok: true })
}

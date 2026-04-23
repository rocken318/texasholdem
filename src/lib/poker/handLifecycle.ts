// src/lib/poker/handLifecycle.ts
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { createDeck, shuffle, deal } from '@/lib/poker/deck'
import { evaluateHand, findWinners } from '@/lib/poker/evaluator'
import { totalPot } from '@/lib/poker/pot'
import { getNextActiveSeat } from '@/lib/poker/engine'
import { generateId } from '@/lib/utils'
// Gate system removed — next hand triggered by client
import type { Player, Room, Hand, HandPlayer, SidePot, PokerCard, Street } from '@/types/domain'

export async function startNewHand(
  roomId: string,
  players: Player[],
  dealerSeat: number,
  settings: Room['settings'],
  handNumber: number
): Promise<string> {
  const sorted = [...players].sort((a, b) => a.seat_index! - b.seat_index!)
  const n = sorted.length
  const dealerIdx = sorted.findIndex(p => p.seat_index === dealerSeat)
  const sbIdx = (dealerIdx + 1) % n
  const bbIdx = (dealerIdx + 2) % n
  const utgIdx = n > 2 ? (dealerIdx + 3) % n : sbIdx  // heads-up: dealer posts SB and acts first

  const sbPlayer = sorted[sbIdx]
  const bbPlayer = sorted[bbIdx]
  const utgPlayer = sorted[utgIdx]

  // Deal hole cards
  let deck = shuffle(createDeck())
  const handId = generateId()
  const now = Date.now()

  const handPlayers: HandPlayer[] = []
  for (const player of sorted) {
    const { cards, remaining } = deal(deck, 2)
    deck = remaining
    handPlayers.push({
      id: generateId(),
      hand_id: handId,
      player_id: player.id,
      hole_cards: cards,
      current_bet: 0,
      total_bet: 0,
      status: 'active',
      final_hand_rank: null,
    })
  }

  const sbAmount = Math.min(settings.smallBlind, sbPlayer.chips)
  const bbAmount = Math.min(settings.bigBlind, bbPlayer.chips)
  const sbIsAllIn = sbPlayer.chips <= settings.smallBlind
  const bbIsAllIn = bbPlayer.chips <= settings.bigBlind

  await store.createHand({
    id: handId,
    room_id: roomId,
    hand_number: handNumber,
    dealer_seat: dealerSeat,
    community_cards: [],
    pot: sbAmount + bbAmount,
    side_pots: [],
    street: 'preflop',
    current_seat: utgPlayer.seat_index,
    current_bet: bbAmount,
    deck,
    winner_ids: null,
    started_at: now,
    finished_at: null,
  })

  await store.createHandPlayers(handPlayers)

  // Post blinds (mark as all_in if blind exhausts chips)
  await store.updateHandPlayer(handId, sbPlayer.id, {
    current_bet: sbAmount, total_bet: sbAmount,
    ...(sbIsAllIn ? { status: 'all_in' } : {}),
  })
  await store.updateHandPlayer(handId, bbPlayer.id, {
    current_bet: bbAmount, total_bet: bbAmount,
    ...(bbIsAllIn ? { status: 'all_in' } : {}),
  })
  await store.updatePlayer(sbPlayer.id, {
    chips: sbPlayer.chips - sbAmount,
    ...(sbIsAllIn ? { status: 'all_in' } : {}),
  })
  await store.updatePlayer(bbPlayer.id, {
    chips: bbPlayer.chips - bbAmount,
    ...(bbIsAllIn ? { status: 'all_in' } : {}),
  })

  await broadcastRoomEvent(roomId, { type: 'hand_started', handId, handNumber, dealerSeat })
  await broadcastRoomEvent(roomId, {
    type: 'blinds_posted',
    sbPlayerId: sbPlayer.id, bbPlayerId: bbPlayer.id,
    sbAmount, bbAmount, pot: sbAmount + bbAmount,
  })
  await broadcastRoomEvent(roomId, {
    type: 'turn_started',
    playerId: utgPlayer.id,
    seatIndex: utgPlayer.seat_index!,
    timeoutSec: settings.turnTimerSec,
  })

  return handId
}

export function getNextDealerSeat(players: Player[], currentDealer: number): number {
  const sorted = [...players]
    .filter(p => p.seat_index !== null && p.chips > 0)
    .sort((a, b) => a.seat_index! - b.seat_index!)
  const next = sorted.find(p => p.seat_index! > currentDealer)
  return next ? next.seat_index! : sorted[0]?.seat_index ?? 0
}

export async function resolveHand(params: {
  handId: string
  roomId: string
  winnerIds: string[]
  pots: SidePot[]
  handPlayers: HandPlayer[]
  players: Player[]
  room: Room
  handNumber: number
  dealerSeat: number
  community: PokerCard[]
}): Promise<void> {
  const { handId, roomId, winnerIds, pots, handPlayers, players, room, handNumber, dealerSeat, community } = params
  const pot = totalPot(pots)

  // Distribute chips per side pot, respecting eligibility
  const chipDeltas: Record<string, number> = {}
  const allPotWinnerIds = new Set<string>()

  for (const sidePot of pots) {
    const eligible = handPlayers.filter(
      hp => sidePot.eligiblePlayerIds.includes(hp.player_id) && hp.status !== 'folded'
    )
    if (eligible.length === 0) continue

    let potWinners: string[]
    if (community && community.length === 5) {
      // Showdown: evaluate hands among this pot's eligible players
      potWinners = findWinners(
        eligible.map(hp => ({ playerId: hp.player_id, hole: hp.hole_cards })),
        community
      )
    } else {
      // Pre-showdown (everyone else folded): filter winnerIds to eligible
      potWinners = winnerIds.filter(id => sidePot.eligiblePlayerIds.includes(id))
      if (potWinners.length === 0) potWinners = [eligible[0].player_id]
    }

    const perWinner = Math.floor(sidePot.amount / potWinners.length)
    for (const wId of potWinners) {
      chipDeltas[wId] = (chipDeltas[wId] ?? 0) + perWinner
      allPotWinnerIds.add(wId)
    }
  }

  const effectiveWinnerIds = allPotWinnerIds.size > 0 ? [...allPotWinnerIds] : winnerIds

  // Re-fetch players from DB so chip counts reflect bets already deducted this hand.
  // The `players` param is loaded before the final action is applied and would be stale.
  const freshPlayers = await store.getPlayersByRoom(roomId)
  for (const [wId, delta] of Object.entries(chipDeltas)) {
    const p = freshPlayers.find(pl => pl.id === wId)
    if (p) await store.updatePlayer(wId, { chips: p.chips + delta })
  }

  await store.updateHand(handId, { street: 'finished', winner_ids: effectiveWinnerIds, finished_at: Date.now() })

  const updatedPlayers = await store.getPlayersByRoom(roomId)
  await broadcastRoomEvent(roomId, {
    type: 'chips_updated',
    players: updatedPlayers.map(p => ({ id: p.id, chips: p.chips })),
  })

  const nextDealerSeat = getNextDealerSeat(updatedPlayers, dealerSeat)
  await broadcastRoomEvent(roomId, { type: 'hand_finished', winnerIds: effectiveWinnerIds, pot, nextDealerSeat })

  // Tournament end check
  const activePlayers = updatedPlayers.filter(p => p.chips > 0 && p.seat_index !== null)
  if (room.format === 'tournament' && activePlayers.length <= 1) {
    const rankings = [...updatedPlayers]
      .sort((a, b) => b.chips - a.chips)
      .map((p, i) => ({ playerId: p.id, displayName: p.display_name, chips: p.chips, rank: i + 1 }))
    await store.updateRoom(roomId, { status: 'finished' })
    await broadcastRoomEvent(roomId, { type: 'game_finished', rankings })
    return
  }

  // Next hand will be triggered by client via /api/rooms/[id]/next-hand
}

export async function advanceStreet(params: {
  hand: Hand
  roomId: string
  handPlayers: HandPlayer[]
  players: Player[]
  room: Room
  pot: number
  pots: SidePot[]
}): Promise<void> {
  const { hand, roomId, handPlayers, players, room, pot, pots } = params

  // Reset current_bet for new street
  for (const hp of handPlayers.filter(h => h.status === 'active')) {
    await store.updateHandPlayer(hand.id, hp.player_id, { current_bet: 0 })
  }
  await store.updateHand(hand.id, { current_bet: 0, pot })

  const nextStreetMap: Record<string, Street> = {
    preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown'
  }
  const nextStreet = nextStreetMap[hand.street] as Street | undefined

  const allActive = handPlayers.filter(hp => hp.status === 'active')

  // Go straight to showdown if only all-ins remain
  if (nextStreet === 'showdown' || allActive.length === 0) {
    let deck = hand.deck
    let community = hand.community_cards
    // Deal remaining cards
    if (community.length < 5) {
      const needed = 5 - community.length
      const { cards, remaining } = deal(deck, needed)
      community = [...community, ...cards]
      deck = remaining
      await store.updateHand(hand.id, { community_cards: community, deck, street: 'showdown' })
      await broadcastRoomEvent(roomId, { type: 'community_dealt', cards: community, street: 'showdown' })
    }

    const eligible = handPlayers.filter(hp => hp.status !== 'folded')
    const winnerIds = findWinners(
      eligible.map(hp => ({ playerId: hp.player_id, hole: hp.hole_cards })),
      community
    )
    const results = eligible.map(hp => ({
      playerId: hp.player_id,
      holeCards: hp.hole_cards,
      handName: evaluateHand(hp.hole_cards, community).descr,
    }))
    await broadcastRoomEvent(roomId, { type: 'showdown', results, communityCards: community })

    await resolveHand({
      handId: hand.id, roomId, winnerIds, pots, handPlayers, players,
      room, handNumber: hand.hand_number, dealerSeat: hand.dealer_seat, community,
    })
    return
  }

  // Deal community cards
  let deck = hand.deck
  let community = hand.community_cards
  const dealCount = nextStreet === 'flop' ? 3 : 1
  const { cards, remaining } = deal(deck, dealCount)
  community = [...community, ...cards]
  deck = remaining

  await store.updateHand(hand.id, { street: nextStreet!, community_cards: community, deck })
  await broadcastRoomEvent(roomId, { type: 'community_dealt', cards: community, street: nextStreet! })

  // First active player after dealer
  const seatedActive = players
    .filter(p => {
      const hp = handPlayers.find(h => h.player_id === p.id)
      return hp && hp.status === 'active' && p.seat_index !== null
    })
    .map(p => ({ seatIndex: p.seat_index!, status: 'active' as const }))

  const firstSeat = getNextActiveSeat(seatedActive, hand.dealer_seat)
  await store.updateHand(hand.id, { current_seat: firstSeat })
  const firstPlayer = players.find(p => p.seat_index === firstSeat)!
  await broadcastRoomEvent(roomId, {
    type: 'turn_started',
    playerId: firstPlayer.id,
    seatIndex: firstSeat,
    timeoutSec: room.settings.turnTimerSec,
  })
}

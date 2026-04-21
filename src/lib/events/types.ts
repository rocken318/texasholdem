// src/lib/events/types.ts
import type { Player, PokerCard, SidePot } from '@/types/domain'

export type PokerEvent =
  | { type: 'connected'; roomId: string }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started'; dealerSeat: number; players: Player[] }
  | { type: 'hand_started'; handId: string; handNumber: number; dealerSeat: number }
  | { type: 'blinds_posted'; sbPlayerId: string; bbPlayerId: string; sbAmount: number; bbAmount: number; pot: number }
  | { type: 'turn_started'; playerId: string; seatIndex: number; timeoutSec: number }
  | { type: 'player_action'; playerId: string; action: string; amount: number; pot: number }
  | { type: 'community_dealt'; cards: PokerCard[]; street: string }
  | { type: 'showdown'; results: { playerId: string; holeCards: PokerCard[]; handName: string }[] }
  | { type: 'chips_updated'; players: { id: string; chips: number }[] }
  | { type: 'hand_finished'; winnerIds: string[]; pot: number; nextDealerSeat: number }
  | { type: 'game_finished'; rankings: { playerId: string; displayName: string; chips: number; rank: number }[] }
  | { type: 'blind_level_up'; level: number; small: number; big: number }

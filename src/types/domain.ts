export interface RoomSettings {
  maxPlayers: number        // 2-9
  startingChips: number
  smallBlind: number
  bigBlind: number
  turnTimerSec: number      // 10-60
  anteEnabled: boolean
  anteAmount: number
  // tournament only
  blindLevelSec?: number
  blindSchedule?: { level: number; small: number; big: number; ante: number }[]
  endCondition?: 'players' | 'time'
  endValue?: number
}

export interface Room {
  id: string
  join_code: string
  host_player_id: string
  status: 'lobby' | 'playing' | 'finished'
  format: 'cash' | 'tournament'
  settings: RoomSettings
  created_at: number
}

export interface Player {
  id: string
  room_id: string
  display_name: string
  chips: number
  status: 'waiting' | 'active' | 'folded' | 'all_in' | 'out'
  seat_index: number | null
  is_host: boolean
  joined_at: number
}

export interface Hand {
  id: string
  room_id: string
  hand_number: number
  dealer_seat: number
  community_cards: PokerCard[]
  pot: number
  side_pots: SidePot[]
  street: Street
  current_seat: number | null
  current_bet: number
  deck: PokerCard[]
  winner_ids: string[] | null
  started_at: number
  finished_at: number | null
}

export interface HandPlayer {
  id: string
  hand_id: string
  player_id: string
  hole_cards: PokerCard[]
  current_bet: number
  total_bet: number
  status: 'active' | 'folded' | 'all_in'
  final_hand_rank: string | null
}

export interface Action {
  id: string
  hand_id: string
  player_id: string
  street: Street
  action: PlayerActionType
  amount: number
  acted_at: number
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished'
export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

export interface SidePot {
  amount: number
  eligiblePlayerIds: string[]
}

export interface PokerCard {
  suit: 'S' | 'H' | 'D' | 'C'
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'
}

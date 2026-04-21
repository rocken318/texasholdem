export type { PokerCard, SidePot, PlayerActionType, Street } from '@/types/domain'

export interface ValidActions {
  canFold: boolean
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canRaise: boolean
  minRaise: number
  maxRaise: number
  canAllIn: boolean
}

export interface HandEvalResult {
  rank: number
  name: string
  descr: string
}

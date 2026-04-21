// src/lib/poker/engine.ts
import type { HandPlayer } from '@/types/domain'
import type { ValidActions } from './types'

interface ValidActionContext {
  currentBet: number
  bigBlind: number
  playerChips: number
}

export function getValidActions(player: HandPlayer, ctx: ValidActionContext): ValidActions {
  const toCall = Math.max(0, ctx.currentBet - player.current_bet)
  const canCheck = toCall === 0
  const callAmount = Math.min(toCall, ctx.playerChips)
  const canCall = toCall > 0 && toCall <= ctx.playerChips
  const minRaise = Math.min(ctx.currentBet + ctx.bigBlind, ctx.playerChips)
  const canRaise = ctx.playerChips > toCall + 1

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaise,
    maxRaise: ctx.playerChips,
    canAllIn: ctx.playerChips > 0,
  }
}

export function isBettingRoundComplete(
  handPlayers: HandPlayer[],
  currentBet: number
): boolean {
  const active = handPlayers.filter(p => p.status === 'active')
  if (active.length === 0) return true
  return active.every(p => p.current_bet >= currentBet)
}

export function getNextActiveSeat(
  seats: { seatIndex: number; status: 'active' | 'folded' | 'all_in' }[],
  currentSeat: number
): number {
  const sorted = [...seats].sort((a, b) => a.seatIndex - b.seatIndex)
  const eligible = sorted.filter(s => s.status === 'active')
  if (eligible.length === 0) return -1
  const next = eligible.find(s => s.seatIndex > currentSeat)
  return next ? next.seatIndex : eligible[0].seatIndex
}

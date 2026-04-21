// src/lib/poker/engine.ts
import type { HandPlayer } from '@/types/domain'
import type { ValidActions } from './types'

interface ValidActionContext {
  currentBet: number
  bigBlind: number
  playerChips: number
  lastRaiseSize?: number  // defaults to bigBlind if not provided
}

export function getValidActions(player: HandPlayer, ctx: ValidActionContext): ValidActions {
  const toCall = Math.max(0, ctx.currentBet - player.current_bet)
  const canCheck = toCall === 0
  const callAmount = Math.min(toCall, ctx.playerChips)
  const canCall = toCall > 0 && toCall <= ctx.playerChips
  const raiseIncrement = ctx.lastRaiseSize ?? ctx.bigBlind
  const minRaise = Math.min(ctx.currentBet + raiseIncrement, ctx.playerChips)
  const canRaise = ctx.playerChips >= toCall + ctx.bigBlind

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

/**
 * Returns true when all active players have matched the current bet
 * AND (when currentBet === 0) every active player has had a chance to act.
 *
 * When currentBet === 0 (no bet yet this street), we need actionCount to
 * ensure we've gone all the way around the table before closing the round.
 */
export function isBettingRoundComplete(
  handPlayers: HandPlayer[],
  currentBet: number,
  extra?: { actionCount: number }
): boolean {
  const active = handPlayers.filter(p => p.status === 'active')
  if (active.length === 0) return true
  const allMatch = active.every(p => p.current_bet >= currentBet)
  if (!allMatch) return false
  // When currentBet is 0 and more than 1 active player, require everyone to have checked
  if (currentBet === 0 && active.length > 1 && extra) {
    return extra.actionCount >= active.length
  }
  return true
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

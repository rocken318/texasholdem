// src/lib/poker/evaluator.ts
import { Hand } from 'pokersolver'
import type { PokerCard } from '@/types/domain'
import type { HandEvalResult } from './types'

function toSolverCard(card: PokerCard): string {
  // pokersolver format: rank + lowercase suit (e.g. "As", "Th", "2d")
  return card.rank + card.suit.toLowerCase()
}

export function evaluateHand(hole: PokerCard[], community: PokerCard[]): HandEvalResult {
  const cards = [...hole, ...community].map(toSolverCard)
  const solved = Hand.solve(cards)
  return {
    rank: solved.rank,
    name: solved.name,
    descr: solved.descr,
  }
}

export function findWinners(
  hands: { playerId: string; hole: PokerCard[] }[],
  community: PokerCard[]
): string[] {
  const solved = hands.map(({ playerId, hole }) => ({
    playerId,
    hand: Hand.solve([...hole, ...community].map(toSolverCard)),
  }))
  const winnerHands = Hand.winners(solved.map(s => s.hand))
  return solved.filter(s => winnerHands.includes(s.hand)).map(s => s.playerId)
}

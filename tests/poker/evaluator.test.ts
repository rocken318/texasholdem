// tests/poker/evaluator.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateHand, findWinners } from '@/lib/poker/evaluator'
import type { PokerCard } from '@/types/domain'

const c = (rank: PokerCard['rank'], suit: PokerCard['suit']): PokerCard => ({ rank, suit })

describe('evaluateHand', () => {
  it('identifies a flush', () => {
    const hole = [c('A', 'H'), c('K', 'H')]
    const community = [c('Q', 'H'), c('J', 'H'), c('9', 'H'), c('2', 'S'), c('3', 'D')]
    const result = evaluateHand(hole, community)
    expect(result.name).toBe('Flush')
  })

  it('identifies a pair', () => {
    const hole = [c('A', 'H'), c('A', 'S')]
    const community = [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    const result = evaluateHand(hole, community)
    expect(result.name).toBe('Pair')
  })

  it('higher rank beats lower rank', () => {
    const straight = evaluateHand(
      [c('5', 'H'), c('4', 'S')],
      [c('3', 'D'), c('2', 'C'), c('A', 'H'), c('K', 'S'), c('Q', 'D')]
    )
    const pair = evaluateHand(
      [c('A', 'H'), c('A', 'S')],
      [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    )
    expect(straight.rank).toBeGreaterThan(pair.rank)
  })
})

describe('findWinners', () => {
  it('finds single winner', () => {
    const community = [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    const winners = findWinners([
      { playerId: 'p1', hole: [c('A', 'H'), c('A', 'S')] },
      { playerId: 'p2', hole: [c('3', 'H'), c('4', 'S')] },
    ], community)
    expect(winners).toEqual(['p1'])
  })

  it('handles split pot (tie)', () => {
    const community = [c('A', 'D'), c('K', 'C'), c('Q', 'H'), c('J', 'S'), c('T', 'D')]
    const winners = findWinners([
      { playerId: 'p1', hole: [c('2', 'H'), c('3', 'S')] },
      { playerId: 'p2', hole: [c('4', 'H'), c('5', 'S')] },
    ], community)
    expect(winners).toHaveLength(2)
    expect(winners).toContain('p1')
    expect(winners).toContain('p2')
  })
})

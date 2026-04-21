// tests/poker/pot.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePots, totalPot } from '@/lib/poker/pot'

describe('calculatePots', () => {
  it('single pot when no all-ins', () => {
    const players = [
      { playerId: 'p1', totalBet: 100, status: 'active' as const },
      { playerId: 'p2', totalBet: 100, status: 'active' as const },
      { playerId: 'p3', totalBet: 100, status: 'active' as const },
    ]
    const pots = calculatePots(players)
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(300)
    expect(pots[0].eligiblePlayerIds).toContain('p1')
  })

  it('folded player excluded from eligible', () => {
    const players = [
      { playerId: 'p1', totalBet: 100, status: 'active' as const },
      { playerId: 'p2', totalBet: 100, status: 'folded' as const },
    ]
    const pots = calculatePots(players)
    expect(pots[0].eligiblePlayerIds).not.toContain('p2')
    expect(pots[0].amount).toBe(200)
  })

  it('creates side pot when player all-in for less', () => {
    const players = [
      { playerId: 'p1', totalBet: 50,  status: 'all_in' as const },
      { playerId: 'p2', totalBet: 100, status: 'active' as const },
      { playerId: 'p3', totalBet: 100, status: 'active' as const },
    ]
    const pots = calculatePots(players)
    expect(pots).toHaveLength(2)
    // main pot: 50*3 = 150, eligible: all 3
    expect(pots[0].amount).toBe(150)
    expect(pots[0].eligiblePlayerIds).toContain('p1')
    // side pot: 50*2 = 100, eligible: p2, p3 only
    expect(pots[1].amount).toBe(100)
    expect(pots[1].eligiblePlayerIds).not.toContain('p1')
  })
})

describe('totalPot', () => {
  it('sums all pot amounts', () => {
    const pots = [
      { amount: 150, eligiblePlayerIds: ['p1'] },
      { amount: 100, eligiblePlayerIds: ['p2'] },
    ]
    expect(totalPot(pots)).toBe(250)
  })
})

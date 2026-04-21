// tests/poker/engine.test.ts
import { describe, it, expect } from 'vitest'
import { getValidActions, isBettingRoundComplete, getNextActiveSeat } from '@/lib/poker/engine'
import type { HandPlayer } from '@/types/domain'

function makePlayer(overrides: Partial<HandPlayer> = {}): HandPlayer {
  return {
    id: 'hp1', hand_id: 'h1', player_id: 'p1',
    hole_cards: [], current_bet: 0, total_bet: 0,
    status: 'active', final_hand_rank: null,
    ...overrides,
  }
}

describe('getValidActions', () => {
  it('can check when no bet to call', () => {
    const player = makePlayer({ current_bet: 20 })
    const result = getValidActions(player, { currentBet: 20, bigBlind: 20, playerChips: 980 })
    expect(result.canCheck).toBe(true)
    expect(result.canCall).toBe(false)
  })

  it('must call when behind', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 40, bigBlind: 20, playerChips: 1000 })
    expect(result.canCheck).toBe(false)
    expect(result.canCall).toBe(true)
    expect(result.callAmount).toBe(40)
  })

  it('all-in when call exceeds chips', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 500, bigBlind: 20, playerChips: 100 })
    expect(result.callAmount).toBe(100)
    expect(result.canAllIn).toBe(true)
  })

  it('minRaise is at least 2x current bet', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 20, bigBlind: 20, playerChips: 1000 })
    expect(result.minRaise).toBeGreaterThanOrEqual(40)
  })

  it('cannot raise when chips only cover call plus less than one big blind', () => {
    const player = makePlayer({ current_bet: 0 })
    // currentBet=20, playerChips=25 — can call (20) but only 5 left which is less than bigBlind (20)
    const result = getValidActions(player, { currentBet: 20, bigBlind: 20, playerChips: 25 })
    expect(result.canRaise).toBe(false)
    expect(result.canAllIn).toBe(true)  // can still go all-in
  })

  it('minRaise uses last raise increment, not always bigBlind', () => {
    const player = makePlayer({ current_bet: 0 })
    // currentBet=60, bigBlind=20, lastRaiseSize=40 (someone raised from 20 to 60)
    const result = getValidActions(player, { currentBet: 60, bigBlind: 20, playerChips: 1000, lastRaiseSize: 40 })
    // minRaise should be 60 + 40 = 100 (not 60 + 20 = 80)
    expect(result.minRaise).toBe(100)
  })
})

describe('isBettingRoundComplete', () => {
  it('complete when all active players matched bet', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'active', current_bet: 20 }),
    ]
    expect(isBettingRoundComplete(players, 20)).toBe(true)
  })

  it('not complete when someone is behind', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'active', current_bet: 0 }),
    ]
    expect(isBettingRoundComplete(players, 20)).toBe(false)
  })

  it('all_in players do not block completion', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'all_in', current_bet: 10 }),
    ]
    expect(isBettingRoundComplete(players, 20)).toBe(true)
  })
})

describe('getNextActiveSeat', () => {
  it('returns next active seat', () => {
    const seats = [
      { seatIndex: 0, status: 'folded' as const },
      { seatIndex: 1, status: 'active' as const },
      { seatIndex: 2, status: 'active' as const },
    ]
    expect(getNextActiveSeat(seats, 0)).toBe(1)
  })

  it('wraps around', () => {
    const seats = [
      { seatIndex: 0, status: 'active' as const },
      { seatIndex: 1, status: 'folded' as const },
      { seatIndex: 2, status: 'active' as const },
    ]
    expect(getNextActiveSeat(seats, 2)).toBe(0)
  })
})

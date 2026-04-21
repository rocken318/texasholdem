// src/lib/poker/pot.ts
import type { SidePot } from '@/types/domain'

interface PotPlayer {
  playerId: string
  totalBet: number
  status: 'active' | 'folded' | 'all_in'
}

export function calculatePots(players: PotPlayer[]): SidePot[] {
  const allInAmounts = players
    .filter(p => p.status === 'all_in')
    .map(p => p.totalBet)
    .sort((a, b) => a - b)

  if (allInAmounts.length === 0) {
    const amount = players.reduce((sum, p) => sum + p.totalBet, 0)
    const eligible = players.filter(p => p.status !== 'folded').map(p => p.playerId)
    return [{ amount, eligiblePlayerIds: eligible }]
  }

  const levels = [...new Set(allInAmounts)]
  const pots: SidePot[] = []
  let prevLevel = 0

  for (const level of levels) {
    const contributors = players.filter(p => p.totalBet > prevLevel)
    const amount = (level - prevLevel) * contributors.length
    const eligible = contributors.filter(p => p.status !== 'folded').map(p => p.playerId)
    pots.push({ amount, eligiblePlayerIds: eligible })
    prevLevel = level
  }

  // Remaining above highest all-in
  const maxAllIn = levels[levels.length - 1]
  const remaining = players.filter(p => p.totalBet > maxAllIn)
  if (remaining.length > 0) {
    const amount = remaining.reduce((sum, p) => sum + (p.totalBet - maxAllIn), 0)
    const eligible = remaining.filter(p => p.status !== 'folded').map(p => p.playerId)
    pots.push({ amount, eligiblePlayerIds: eligible })
  }

  return pots
}

export function totalPot(pots: SidePot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0)
}

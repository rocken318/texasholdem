// src/lib/poker/deck.ts
import type { PokerCard } from '@/types/domain'

const SUITS = ['S', 'H', 'D', 'C'] as const
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

export function shuffle(deck: PokerCard[]): PokerCard[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function deal(deck: PokerCard[], count: number): { cards: PokerCard[]; remaining: PokerCard[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  }
}

// tests/poker/deck.test.ts
import { describe, it, expect } from 'vitest'
import { createDeck, shuffle, deal } from '@/lib/poker/deck'

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    const unique = new Set(deck.map(c => `${c.rank}${c.suit}`))
    expect(unique.size).toBe(52)
  })

  it('contains all 4 suits', () => {
    const deck = createDeck()
    const suits = new Set(deck.map(c => c.suit))
    expect(suits).toEqual(new Set(['S', 'H', 'D', 'C']))
  })
})

describe('shuffle', () => {
  it('returns 52 cards', () => {
    const deck = createDeck()
    expect(shuffle(deck)).toHaveLength(52)
  })

  it('does not mutate original deck', () => {
    const deck = createDeck()
    const first = deck[0]
    shuffle(deck)
    expect(deck[0]).toEqual(first)
  })

  it('produces different order most of the time', () => {
    const deck = createDeck()
    const shuffled = shuffle(deck)
    const same = deck.every((c, i) => c.rank === shuffled[i].rank && c.suit === shuffled[i].suit)
    expect(same).toBe(false)
  })
})

describe('deal', () => {
  it('deals correct count and reduces remaining', () => {
    const deck = createDeck()
    const { cards, remaining } = deal(deck, 2)
    expect(cards).toHaveLength(2)
    expect(remaining).toHaveLength(50)
  })

  it('dealt cards are first N cards of deck', () => {
    const deck = createDeck()
    const { cards } = deal(deck, 3)
    expect(cards[0]).toEqual(deck[0])
    expect(cards[2]).toEqual(deck[2])
  })
})

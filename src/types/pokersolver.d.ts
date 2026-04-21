// src/types/pokersolver.d.ts
declare module 'pokersolver' {
  export class Hand {
    rank: number
    name: string
    cards: { toString(): string }[]
    static solve(cards: string[]): Hand
    static winners(hands: Hand[]): Hand[]
  }
}

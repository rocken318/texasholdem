// Manual type declaration for pokersolver (package ships without TypeScript types)
declare module 'pokersolver' {
  export class Hand {
    rank: number
    name: string
    descr: string
    cards: { toString(): string }[]
    cardPool: { toString(): string }[]
    compare(hand: Hand): -1 | 0 | 1
    static solve(cards: string[], game?: unknown, canDisqualify?: boolean): Hand
    static winners(hands: Hand[]): Hand[]
  }
}

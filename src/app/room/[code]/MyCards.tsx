// src/app/room/[code]/MyCards.tsx
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function MyCards({ cards }: { cards: PokerCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="flex justify-center gap-3 py-3 bg-black/20">
      {cards.map((card, i) => <Card key={i} card={card} />)}
    </div>
  )
}

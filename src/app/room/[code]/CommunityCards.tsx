// src/app/room/[code]/CommunityCards.tsx
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} card={cards[i]} faceDown={!cards[i]} small />
      ))}
    </div>
  )
}

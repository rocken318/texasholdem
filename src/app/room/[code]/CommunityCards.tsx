import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const revealed = !!cards[i]
        return (
          <div
            key={i}
            className={
              revealed
                ? '-translate-y-0.5 transition-transform duration-300'
                : 'opacity-70'
            }
          >
            <Card card={cards[i]} faceDown={!cards[i]} small />
          </div>
        )
      })}
    </div>
  )
}

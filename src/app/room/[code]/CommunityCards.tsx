import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  return (
    <div className="flex gap-1 scale-[1.6] origin-center">
      {Array.from({ length: 5 }).map((_, i) => {
        const revealed = !!cards[i]
        return (
          <div
            key={i}
            className={revealed ? '-translate-y-0.5 transition-transform duration-300' : 'opacity-40'}
            style={revealed ? { filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))' } : undefined}
          >
            <Card card={cards[i]} faceDown={!cards[i]} />
          </div>
        )
      })}
    </div>
  )
}

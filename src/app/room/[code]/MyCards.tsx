import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function MyCards({ cards }: { cards: PokerCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="flex justify-center items-end gap-4 py-4 px-6 bg-gradient-to-t from-black/30 to-transparent rounded-xl">
      {cards.map((card, i) => (
        <div
          key={i}
          className={
            i === 0
              ? '-rotate-3 hover:-translate-y-2 transition-transform duration-200'
              : 'rotate-3 hover:-translate-y-2 transition-transform duration-200'
          }
        >
          <Card
            card={card}
            className="ring-2 ring-amber-400/40 shadow-xl shadow-black/40"
          />
        </div>
      ))}
    </div>
  )
}

import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function MyCards({ cards }: { cards: PokerCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="flex justify-center items-end gap-6 py-5 px-8 bg-gradient-to-t from-black/40 to-transparent">
      {cards.map((card, i) => (
        <div
          key={i}
          className={
            i === 0
              ? '-rotate-6 hover:-translate-y-3 transition-transform duration-200 origin-bottom'
              : 'rotate-6 hover:-translate-y-3 transition-transform duration-200 origin-bottom'
          }
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}
        >
          <Card
            card={card}
            large
            className="ring-2 ring-amber-400/60 shadow-2xl"
          />
        </div>
      ))}
    </div>
  )
}

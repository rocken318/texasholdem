import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

interface MyCardsProps {
  cards: PokerCard[]
  isMyTurn?: boolean
}

export function MyCards({ cards, isMyTurn = false }: MyCardsProps) {
  if (cards.length === 0) return null

  return (
    <div className="flex justify-center items-end gap-6 py-2 px-8 bg-gradient-to-t from-black/40 to-transparent">
      {cards.map((card, i) => {
        const rotate = i === 0 ? -6 : 6
        const dealAnim = i === 0 ? 'dealIn1' : 'dealIn2'
        const baseFilter = 'drop-shadow(0 8px 20px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(140,50,255,0.25))'
        const hoverFilter = 'drop-shadow(0 20px 36px rgba(0,0,0,0.85)) drop-shadow(0 0 18px rgba(140,50,255,0.6))'

        const animation = isMyTurn
          ? `${dealAnim} 0.45s cubic-bezier(0.22,1,0.36,1) both, cardPulse 1.8s ease-in-out 0.5s infinite`
          : `${dealAnim} 0.45s cubic-bezier(0.22,1,0.36,1) both`

        return (
          <div
            key={i}
            style={{
              animation,
              transform: `rotate(${rotate}deg)`,
              transformOrigin: 'bottom center',
              transition: 'transform 220ms ease-out, filter 220ms ease-out',
              filter: baseFilter,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = `rotate(${rotate - 2}deg) translateY(-16px) scale(1.05)`
              el.style.filter = hoverFilter
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = `rotate(${rotate}deg)`
              el.style.filter = baseFilter
            }}
          >
            <Card
              card={card}
              large
              className="ring-2 ring-[#bf80ff]/70 shadow-2xl"
            />
          </div>
        )
      })}
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { PokerCard } from '@/types/domain'

const RANK_MAP: Record<string, string> = {
  A: '1', '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9', T: '10',
  J: 'jack', Q: 'queen', K: 'king',
}

const SUIT_MAP: Record<string, string> = {
  S: 'spade', H: 'heart', D: 'diamond', C: 'club',
}

function cardId(card: PokerCard): string {
  return `${SUIT_MAP[card.suit]}_${RANK_MAP[card.rank]}`
}

interface CardProps {
  card?: PokerCard
  faceDown?: boolean
  small?: boolean
  className?: string
}

export function Card({ card, faceDown = false, small = false, className }: CardProps) {
  const svgHref = faceDown || !card
    ? '/cards/svg-cards.svg#back'
    : `/cards/svg-cards.svg#${cardId(card)}`

  const isRevealed = !faceDown && !!card

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border-2 bg-white shadow-lg select-none',
        isRevealed
          ? 'border-white/80 shadow-black/30'
          : 'border-white/30 shadow-black/20',
        small ? 'w-9 h-[52px]' : 'w-16 h-24',
        className,
      )}
    >
      <svg
        viewBox="0 0 169.075 244.640"
        className="absolute inset-0 w-full h-full"
        aria-label={
          faceDown || !card
            ? 'Card back'
            : `${card.rank} of ${SUIT_MAP[card.suit]}s`
        }
      >
        <use href={svgHref} />
      </svg>
    </div>
  )
}

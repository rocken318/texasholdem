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

function suitGlow(suit: string): string {
  if (suit === 'H' || suit === 'D') {
    return 'drop-shadow(0 0 6px rgba(255,60,60,0.7))'
  }
  return 'drop-shadow(0 0 6px rgba(80,120,255,0.7))'
}

interface CardProps {
  card?: PokerCard
  faceDown?: boolean
  small?: boolean
  mid?: boolean
  large?: boolean
  className?: string
}

export function Card({ card, faceDown = false, small = false, mid = false, large = false, className }: CardProps) {
  const svgHref = faceDown || !card
    ? '/cards/svg-cards.svg#back'
    : `/cards/svg-cards.svg#${cardId(card)}`

  const isRevealed = !faceDown && !!card

  const sizeClass = small
    ? 'w-9 h-[52px]'
    : mid
    ? 'w-12 h-[70px]'
    : large
    ? 'w-20 h-28'
    : 'w-16 h-[92px]'

  const filterStyle = isRevealed
    ? suitGlow(card!.suit)
    : 'drop-shadow(0 0 4px rgba(140,50,255,0.5))'

  const shadowClass = isRevealed
    ? 'shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
    : 'shadow-[0_2px_8px_rgba(0,0,0,0.5)]'

  return (
    <div
      className={cn(
        'relative rounded-[6px] overflow-hidden bg-white select-none',
        shadowClass,
        sizeClass,
        className,
      )}
      style={{
        border: isRevealed ? '2.5px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.3)',
        filter: filterStyle,
      }}
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

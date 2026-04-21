// src/components/Card.tsx
import { cn } from '@/lib/utils'
import type { PokerCard } from '@/types/domain'

const SUIT_SYMBOL: Record<string, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
}

const RANK_DISPLAY: Record<string, string> = {
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
}

interface CardProps {
  card?: PokerCard
  faceDown?: boolean
  small?: boolean
  className?: string
}

export function Card({ card, faceDown = false, small = false, className }: CardProps) {
  if (faceDown || !card) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-white/30 bg-blue-900 flex items-center justify-center shadow-md',
        small ? 'w-8 h-11' : 'w-14 h-20',
        className
      )}>
        <div className={cn(
          'rounded border border-white/20 bg-blue-800',
          small ? 'w-5 h-8' : 'w-9 h-14'
        )} />
      </div>
    )
  }

  const isRed = card.suit === 'H' || card.suit === 'D'
  const rankLabel = RANK_DISPLAY[card.rank] ?? card.rank
  const suitSymbol = SUIT_SYMBOL[card.suit]

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-md flex flex-col justify-between p-1 select-none',
      small ? 'w-8 h-11' : 'w-14 h-20',
      className
    )}>
      <div className={cn(
        'font-bold leading-none',
        small ? 'text-xs' : 'text-base',
        isRed ? 'text-red-500' : 'text-gray-900'
      )}>
        <div>{rankLabel}</div>
        <div>{suitSymbol}</div>
      </div>
      {!small && (
        <div className={cn(
          'font-bold leading-none rotate-180 self-end',
          'text-base',
          isRed ? 'text-red-500' : 'text-gray-900'
        )}>
          <div>{rankLabel}</div>
          <div>{suitSymbol}</div>
        </div>
      )}
    </div>
  )
}

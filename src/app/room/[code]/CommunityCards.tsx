'use client'
import { useRef, useState, useEffect } from 'react'
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

interface FlipState {
  [index: number]: 'flipping' | 'done' | undefined
}

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  const prevCardsRef = useRef<(PokerCard | undefined)[]>([])
  const [flipState, setFlipState] = useState<FlipState>({})
  const isMobile = useIsMobile()

  useEffect(() => {
    const prev = prevCardsRef.current
    const newFlips: FlipState = {}
    for (let i = 0; i < 5; i++) {
      if (cards[i] && !prev[i]) {
        newFlips[i] = 'flipping'
      }
    }
    if (Object.keys(newFlips).length > 0) {
      setFlipState(s => ({ ...s, ...newFlips }))
    }
    prevCardsRef.current = [...cards]
  }, [cards])

  function handleFlipEnd(i: number) {
    setFlipState(s => ({ ...s, [i]: 'done' }))
  }

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const card = cards[i]
        const revealed = !!card
        const isFlipping = flipState[i] === 'flipping'

        return (
          <div
            key={i}
            style={{
              opacity: revealed ? 1 : 0.35,
              filter: revealed ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))' : undefined,
              animation: revealed && flipState[i] !== 'done'
                ? `dealInCommunity 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both`
                : undefined,
              perspective: '300px',
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              style={{
                animation: isFlipping ? 'flipReveal 0.44s ease-in-out forwards' : undefined,
                transformStyle: 'preserve-3d',
              }}
              onAnimationEnd={() => isFlipping && handleFlipEnd(i)}
            >
              <Card card={card} faceDown={!card} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

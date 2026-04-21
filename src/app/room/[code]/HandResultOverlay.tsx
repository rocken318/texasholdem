// src/app/room/[code]/HandResultOverlay.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export interface ShowdownResult {
  playerId: string
  displayName: string
  holeCards: PokerCard[]
  handName: string
}

interface HandResultOverlayProps {
  winnerIds: string[]
  winnerNames: string[]
  pot: number
  showdownResults: ShowdownResult[]
  onDismiss: () => void
}

const DURATION_MS = 5000

export function HandResultOverlay({ winnerIds, winnerNames, pot, showdownResults, onDismiss }: HandResultOverlayProps) {
  const [progress, setProgress] = useState(100)

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION_MS) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(id); dismiss() }
    }, 50)
    return () => clearInterval(id)
  }, [dismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c0e 0%, #0d1f0d 100%)',
          border: '1.5px solid rgba(212,175,55,0.45)',
          boxShadow: '0 0 80px rgba(212,175,55,0.18), 0 24px 80px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Countdown bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5D060]"
            style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
          />
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {/* Trophy + winner */}
          <div className="text-center">
            <div className="text-5xl mb-1">🏆</div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.35em] mb-1"
              style={{ color: '#D4AF37' }}
            >
              Winner
            </div>
            <div className="text-white text-2xl font-bold leading-tight">
              {winnerNames.join(' & ')}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-white/40 text-xs uppercase tracking-wider">Pot</span>
              <span className="font-mono font-bold text-2xl" style={{ color: '#5ce65c' }}>
                {pot.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Showdown hands */}
          {showdownResults.length > 0 && (
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
              <div className="w-full flex flex-col gap-3">
                {showdownResults.map(r => {
                  const isWinner = winnerIds.includes(r.playerId)
                  return (
                    <div key={r.playerId} className="flex items-center gap-3">
                      {/* Hole cards */}
                      <div className="flex gap-1 shrink-0">
                        {r.holeCards.map((card, i) => (
                          <Card
                            key={i}
                            card={card}
                            small
                            className={isWinner ? 'ring-2 ring-[#D4AF37]/70 shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'opacity-70'}
                          />
                        ))}
                      </div>
                      {/* Name + hand */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-sm font-bold truncate ${isWinner ? 'text-[#F5D060]' : 'text-white/60'}`}>
                          {r.displayName}
                        </span>
                        <span className={`text-xs font-medium ${isWinner ? 'text-[#D4AF37]' : 'text-white/30'}`}>
                          {r.handName}
                        </span>
                      </div>
                      {isWinner && (
                        <span className="text-[#5ce65c] font-mono font-bold text-sm shrink-0">
                          +{pot.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <p className="text-white/20 text-xs">タップして続ける</p>
        </div>
      </div>
    </div>
  )
}

// src/app/room/[code]/HandResultOverlay.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'
import { playWinSound } from '@/lib/sounds'

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
  communityCards: PokerCard[]
  onDismiss: () => void
  onReady: () => void
}

const DURATION_MS = 15000

export function HandResultOverlay({ winnerIds, winnerNames, pot, showdownResults, communityCards, onDismiss, onReady }: HandResultOverlayProps) {
  const [progress, setProgress] = useState(100)
  const [myReady, setMyReady] = useState(false)

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  const handleNext = useCallback(() => {
    if (myReady) return
    setMyReady(true)
    onReady()
    onDismiss()
  }, [myReady, onReady, onDismiss])

  // Countdown
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION_MS) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(id); onReady(); dismiss() }
    }, 50)
    return () => clearInterval(id)
  }, [dismiss])

  const winnerHandName = showdownResults.find(r => winnerIds.includes(r.playerId))?.handName

  // Sort: winners first
  const sorted = [...showdownResults].sort((a, b) => {
    const aw = winnerIds.includes(a.playerId) ? 0 : 1
    const bw = winnerIds.includes(b.playerId) ? 0 : 1
    return aw - bw
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          maxWidth: 420,
          background: 'linear-gradient(180deg, #1a1a0e 0%, #0d1f0d 100%)',
          border: '1.5px solid rgba(212,175,55,0.45)',
          boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 24px 80px rgba(0,0,0,0.85)',
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

        <div className="p-4 flex flex-col items-center gap-3 relative z-20">

          {/* Winner header */}
          <div className="text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div
              className="text-lg font-extrabold"
              style={{
                background: 'linear-gradient(90deg, #b8860b, #ffd700, #fffacd, #ffd700, #b8860b)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'goldShimmer 2.4s linear infinite',
              }}
            >
              {winnerNames.join(' & ')}
            </div>
            {winnerHandName && (
              <div className="text-sm font-semibold mt-0.5" style={{ color: '#D4AF37' }}>
                {winnerHandName}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-white/40 text-xs uppercase tracking-wider">Pot</span>
              <span className="font-mono font-bold text-xl" style={{ color: '#5ce65c' }}>
                {pot.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Community cards */}
          {communityCards.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Board
              </div>
              <div className="flex gap-1">
                {communityCards.map((card, i) => (
                  <div key={i} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
                    <Card card={card} mid />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          {/* All players */}
          <div className="w-full flex flex-col gap-2">
            {sorted.map((r) => {
              const isWinner = winnerIds.includes(r.playerId)
              return (
                <div
                  key={r.playerId}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                  style={{
                    border: isWinner ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    background: isWinner ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                    boxShadow: isWinner ? '0 0 16px rgba(212,175,55,0.1)' : 'none',
                  }}
                >
                  {/* Hole cards */}
                  <div className="flex gap-0.5 shrink-0">
                    {r.holeCards.map((card, i) => (
                      <div
                        key={i}
                        style={{
                          filter: isWinner
                            ? 'drop-shadow(0 0 8px rgba(255,215,0,0.7))'
                            : 'grayscale(0.5) opacity(0.6)',
                        }}
                      >
                        <Card card={card} small className={isWinner ? 'ring-1 ring-[#D4AF37]/60' : ''} />
                      </div>
                    ))}
                  </div>

                  {/* Name + hand */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isWinner && <span className="text-xs">🏆</span>}
                      <span
                        className="text-sm font-bold truncate"
                        style={{ color: isWinner ? '#F5D060' : 'rgba(255,255,255,0.55)' }}
                      >
                        {r.displayName}
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        color: isWinner ? '#D4AF37' : 'rgba(255,255,255,0.3)',
                        fontWeight: isWinner ? 700 : 400,
                      }}
                    >
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

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={myReady}
            className="mt-1"
            style={{
              padding: '8px 32px',
              borderRadius: 999,
              border: myReady ? '1.5px solid rgba(255,215,0,0.25)' : '1.5px solid rgba(255,215,0,0.8)',
              background: myReady
                ? 'rgba(255,215,0,0.06)'
                : 'linear-gradient(180deg, rgba(255,215,0,0.22) 0%, rgba(255,215,0,0.10) 100%)',
              color: myReady ? 'rgba(255,215,0,0.35)' : '#ffd700',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.08em',
              boxShadow: myReady ? 'none' : '0 0 12px rgba(255,215,0,0.3)',
              cursor: myReady ? 'default' : 'pointer',
              minWidth: 140,
            }}
          >
            {myReady ? '✓ 準備完了' : '次へ進む →'}
          </button>
          <p className="text-white/20 text-[10px] -mt-1">
            {Math.ceil((progress / 100) * DURATION_MS / 1000)}秒後に自動で次へ
          </p>
        </div>
      </div>
    </div>
  )
}

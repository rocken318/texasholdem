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

// Deterministic confetti pieces — fixed positions & colors to avoid hydration mismatches
const CONFETTI_PIECES = [
  { left: '8%',  color: '#ffd700', delay: 0,    width: 6,  height: 6,  borderRadius: 1 },
  { left: '18%', color: '#bf80ff', delay: 120,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '28%', color: '#4ade80', delay: 240,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '38%', color: '#f87171', delay: 360,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '48%', color: '#ffd700', delay: 80,   width: 6,  height: 6,  borderRadius: 1 },
  { left: '58%', color: '#bf80ff', delay: 480,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '68%', color: '#4ade80', delay: 600,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '78%', color: '#f87171', delay: 720,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '88%', color: '#ffd700', delay: 840,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '13%', color: '#4ade80', delay: 1000, width: 6,  height: 6,  borderRadius: 1 },
  { left: '53%', color: '#f87171', delay: 160,  width: 6,  height: 6,  borderRadius: 1 },
  { left: '93%', color: '#bf80ff', delay: 900,  width: 6,  height: 6,  borderRadius: 1 },
  // 8 additional pieces with more variety
  { left: '5%',  color: '#60d4f7', delay: 200,  width: 8,  height: 8,  borderRadius: '50%' },
  { left: '22%', color: '#ff9f43', delay: 450,  width: 4,  height: 12, borderRadius: 2 },
  { left: '35%', color: '#60d4f7', delay: 700,  width: 8,  height: 8,  borderRadius: '50%' },
  { left: '44%', color: '#ff9f43', delay: 1100, width: 4,  height: 12, borderRadius: 2 },
  { left: '61%', color: '#ffd700', delay: 300,  width: 8,  height: 8,  borderRadius: '50%' },
  { left: '72%', color: '#60d4f7', delay: 950,  width: 4,  height: 12, borderRadius: 2 },
  { left: '82%', color: '#ff9f43', delay: 1300, width: 8,  height: 8,  borderRadius: '50%' },
  { left: '96%', color: '#4ade80', delay: 1400, width: 4,  height: 12, borderRadius: 2 },
]

export function HandResultOverlay({ winnerIds, winnerNames, pot, showdownResults, onDismiss }: HandResultOverlayProps) {
  const [progress, setProgress] = useState(100)
  // Track which player indices have been revealed so far
  const [revealedCount, setRevealedCount] = useState(0)

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  // Countdown bar
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION_MS) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(id); dismiss() }
    }, 50)
    return () => clearInterval(id)
  }, [dismiss])

  // Staggered card reveal: reveal one player every 300 ms
  useEffect(() => {
    if (showdownResults.length === 0) return
    // Start revealing immediately
    setRevealedCount(1)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < showdownResults.length; i++) {
      const t = setTimeout(() => setRevealedCount(i + 1), i * 300)
      timers.push(t)
    }
    return () => timers.forEach(clearTimeout)
  }, [showdownResults.length])

  // Pot count-up: start with potVisible false, flip to true after short mount delay
  const [potVisible, setPotVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setPotVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Find the winner's hand name from showdownResults
  const winnerHandName = showdownResults.find(r => winnerIds.includes(r.playerId))?.handName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(180deg, #1c1c0e 0%, #0d1f0d 100%)',
          border: '1.5px solid rgba(212,175,55,0.45)',
          boxShadow: '0 0 80px rgba(212,175,55,0.18), 0 24px 80px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Casino light sweep background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg at 50% 120%, transparent 0%, rgba(212,175,55,0.04) 15%, transparent 30%)',
            animation: 'casinoLight 8s linear infinite',
          }}
        />

        {/* Confetti layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {CONFETTI_PIECES.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: p.left,
                width: p.width,
                height: p.height,
                borderRadius: p.borderRadius as number | string,
                background: p.color,
                animation: `confettiFall 1.4s ease-in ${p.delay}ms both`,
              }}
            />
          ))}
        </div>

        {/* Countdown bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5D060]"
            style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
          />
        </div>

        <div className="p-5 flex flex-col items-center gap-4 relative z-20">
          {/* Trophy + winner — styled header */}
          <div className="text-center w-full">
            {/* Trophy area with glow overlay */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {/* Radial glow behind trophy */}
              <div
                style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Pulsing gold ring around trophy */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(255,215,0,0.7)',
                  boxShadow: '0 0 0 4px rgba(255,215,0,0.15), 0 0 24px rgba(255,215,0,0.35)',
                  animation: 'goldRingPulse 1.6s ease-in-out infinite',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 48, lineHeight: 1 }}>🏆</span>
              </div>
            </div>

            {/* WINNER badge */}
            <div
              style={{
                display: 'inline-block',
                padding: '2px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,215,0,0.75)',
                background: 'rgba(255,215,0,0.10)',
                boxShadow: '0 0 10px rgba(255,215,0,0.30)',
                color: '#ffd700',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              🏆 WINNER
            </div>

            {/* Winner name — gold shimmer gradient text */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.2,
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

            {/* Pot amount with bounce-in */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-white/40 text-xs uppercase tracking-wider">Pot</span>
              <span
                className="font-mono font-bold text-2xl"
                style={{
                  color: '#5ce65c',
                  display: 'inline-block',
                  animation: potVisible ? 'potReveal 0.55s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                  transform: potVisible ? undefined : 'scale(0.5)',
                }}
              >
                {pot.toLocaleString()}
              </span>
            </div>

            {/* Winning hand name label */}
            {winnerHandName && (
              <div
                style={{
                  color: '#D4AF37',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  fontStyle: 'italic',
                  opacity: 0,
                  animation: 'fadeUp 0.4s 0.8s ease both',
                  marginTop: 2,
                }}
              >
                with {winnerHandName}
              </div>
            )}
          </div>

          {/* Showdown hands — staggered reveal */}
          {showdownResults.length > 0 && (
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
              <div className="w-full flex flex-col gap-3">
                {showdownResults.map((r, idx) => {
                  const isWinner = winnerIds.includes(r.playerId)
                  const isRevealed = idx < revealedCount

                  return (
                    <div
                      key={r.playerId}
                      className="flex items-center gap-3"
                      style={{
                        opacity: isRevealed ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {/* Hole cards — flip reveal on appearance */}
                      <div className="flex gap-1 shrink-0" style={{ perspective: 600 }}>
                        {/* Shimmer wrapper for winner cards */}
                        <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', gap: 4 }}>
                          {r.holeCards.map((card, i) => (
                            <div
                              key={i}
                              style={{
                                animation: isRevealed
                                  ? `flipReveal 0.44s ease-in-out ${i * 80}ms both`
                                  : 'none',
                                filter: isRevealed
                                  ? isWinner
                                    ? 'drop-shadow(0 0 12px rgba(255,215,0,0.9)) drop-shadow(0 0 24px rgba(255,215,0,0.5))'
                                    : 'grayscale(0.7) opacity(0.5)'
                                  : 'none',
                                display: 'inline-block',
                              }}
                            >
                              <Card
                                card={card}
                                small
                                className={isWinner ? 'ring-2 ring-[#D4AF37]/70' : ''}
                              />
                            </div>
                          ))}
                          {/* Gold shimmer sweep for winner cards */}
                          {isWinner && isRevealed && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.35) 50%, transparent 60%)',
                                animation: 'cardGoldSweep 0.8s 0.5s ease both',
                                pointerEvents: 'none',
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Name + hand */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className="text-sm font-bold truncate"
                          style={{
                            color: isWinner ? '#F5D060' : 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {r.displayName}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: isWinner ? '#D4AF37' : 'rgba(255,255,255,0.3)',
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
            </>
          )}

          <p className="text-white/20 text-xs">タップして続ける</p>
        </div>
      </div>
    </div>
  )
}

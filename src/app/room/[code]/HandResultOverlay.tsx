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
  onReady: () => void
}

const DURATION_MS = 7000
const WINNER_PHASE_MS = 3500

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

export function HandResultOverlay({ winnerIds, winnerNames, pot, showdownResults, onDismiss, onReady }: HandResultOverlayProps) {
  const [progress, setProgress] = useState(100)
  const [phase, setPhase] = useState<'winner' | 'showdown'>('winner')
  const [myReady, setMyReady] = useState(false)
  // Track which player indices have been revealed so far
  const [revealedCount, setRevealedCount] = useState(0)

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  const handleNext = useCallback(() => {
    if (myReady) return
    setMyReady(true)
    onReady()
    onDismiss()
  }, [myReady, onReady, onDismiss])

  // Countdown bar — always from mount, total DURATION_MS
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION_MS) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(id); dismiss() }
    }, 50)
    return () => clearInterval(id)
  }, [dismiss])

  // Phase transition: winner → showdown after WINNER_PHASE_MS (only if there are showdown results)
  useEffect(() => {
    if (showdownResults.length === 0) return
    const t = setTimeout(() => setPhase('showdown'), WINNER_PHASE_MS)
    return () => clearTimeout(t)
  }, [showdownResults.length])

  // Staggered card reveal — reset and re-run when entering showdown phase
  useEffect(() => {
    if (showdownResults.length === 0) return
    if (phase === 'winner') {
      setRevealedCount(0)
      return
    }
    // showdown phase: reveal one player at a time, 400ms apart
    setRevealedCount(1)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < showdownResults.length; i++) {
      const t = setTimeout(() => setRevealedCount(i + 1), i * 400)
      timers.push(t)
    }
    return () => timers.forEach(clearTimeout)
  }, [phase, showdownResults.length])

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
    >
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          maxWidth: phase === 'showdown' ? 520 : 384,
          background: 'linear-gradient(180deg, #1c1c0e 0%, #0d1f0d 100%)',
          border: '1.5px solid rgba(212,175,55,0.45)',
          boxShadow: '0 0 80px rgba(212,175,55,0.18), 0 24px 80px rgba(0,0,0,0.85)',
          transition: 'max-width 0.4s ease',
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

          {/* ── WINNER PHASE: compact showdown list ── */}
          {phase === 'winner' && showdownResults.length > 0 && (
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
                          style={{ color: isWinner ? '#F5D060' : 'rgba(255,255,255,0.6)' }}
                        >
                          {r.displayName}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: isWinner ? '#D4AF37' : 'rgba(255,255,255,0.3)' }}
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

          {/* ── SHOWDOWN PHASE: dramatic full card-reveal layout ── */}
          {phase === 'showdown' && showdownResults.length > 0 && (
            <div
              className="w-full flex flex-col gap-0"
              style={{ animation: 'fadeUp 0.4s ease both' }}
            >
              {/* Showdown header */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent mb-3" />
              <div
                className="flex items-center gap-2 mb-3"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700 }}
              >
                <span style={{ fontSize: 16 }}>🃏</span>
                <span>Showdown</span>
              </div>

              {/* Player rows */}
              <div className="flex flex-col gap-2">
                {showdownResults.map((r, idx) => {
                  const isWinner = winnerIds.includes(r.playerId)
                  const isRevealed = idx < revealedCount

                  return (
                    <div
                      key={r.playerId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: isWinner ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.06)',
                        background: isWinner ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
                        boxShadow: isWinner ? '0 0 20px rgba(212,175,55,0.12)' : 'none',
                        opacity: isRevealed ? 1 : 0,
                        filter: isRevealed && !isWinner ? 'grayscale(0.6) opacity(0.7)' : 'none',
                        transition: 'opacity 0.2s ease, filter 0.2s ease',
                      }}
                    >
                      {/* Large cards */}
                      <div
                        className="flex shrink-0"
                        style={{ gap: 6, perspective: 800 }}
                      >
                        <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', gap: 6 }}>
                          {r.holeCards.map((card, i) => (
                            <div
                              key={i}
                              style={{
                                animation: isRevealed
                                  ? `flipReveal 0.44s ease-in-out ${i * 120}ms both`
                                  : 'none',
                                filter: isRevealed && isWinner
                                  ? 'drop-shadow(0 0 14px rgba(255,215,0,0.85)) drop-shadow(0 0 28px rgba(255,215,0,0.45))'
                                  : 'none',
                                display: 'inline-block',
                              }}
                            >
                              <Card
                                card={card}
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

                      {/* Name + hand name */}
                      <div className="flex flex-col min-w-0 flex-1 gap-1">
                        <div className="flex items-center gap-2">
                          {isWinner && (
                            <span style={{ fontSize: 14, lineHeight: 1 }}>🏆</span>
                          )}
                          <span
                            className="font-bold truncate"
                            style={{
                              color: isWinner ? '#F5D060' : 'rgba(255,255,255,0.65)',
                              fontSize: 15,
                            }}
                          >
                            {r.displayName}
                          </span>
                        </div>
                        <span
                          style={{
                            color: isWinner ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                            fontWeight: isWinner ? 700 : 400,
                            fontSize: isWinner ? 13 : 11,
                            letterSpacing: '0.03em',
                          }}
                        >
                          {r.handName}
                        </span>
                      </div>

                      {/* Win amount */}
                      {isWinner && (
                        <span
                          className="font-mono font-bold shrink-0"
                          style={{ color: '#5ce65c', fontSize: 15 }}
                        >
                          +{pot.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent mt-3" />
            </div>
          )}

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={myReady}
            style={{
              marginTop: 4,
              padding: '10px 36px',
              borderRadius: 999,
              border: myReady ? '1.5px solid rgba(255,215,0,0.25)' : '1.5px solid rgba(255,215,0,0.8)',
              background: myReady
                ? 'rgba(255,215,0,0.06)'
                : 'linear-gradient(180deg, rgba(255,215,0,0.22) 0%, rgba(255,215,0,0.10) 100%)',
              color: myReady ? 'rgba(255,215,0,0.35)' : '#ffd700',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.08em',
              boxShadow: myReady ? 'none' : '0 0 16px rgba(255,215,0,0.3)',
              cursor: myReady ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              minWidth: 160,
            }}
          >
            {myReady ? '✓ 準備完了' : '次へ進む →'}
          </button>
          <p className="text-white/20 text-[11px] -mt-1">
            {Math.ceil((progress / 100) * DURATION_MS / 1000)}秒後に自動で次へ
          </p>
        </div>
      </div>
    </div>
  )
}

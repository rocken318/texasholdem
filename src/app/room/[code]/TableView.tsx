// src/app/room/[code]/TableView.tsx
'use client'
import { useRef, useState, useEffect } from 'react'
import type { Player, PokerCard } from '@/types/domain'
import { PlayerSlot } from './PlayerSlot'
import { CommunityCards } from './CommunityCards'
import { ChipStack } from '@/components/ChipStack'

interface TableViewProps {
  players: Player[]
  myPlayerId: string | null
  mySeatIndex: number | null
  currentSeat: number | null
  communityCards: PokerCard[]
  pot: number
  tableBets: Record<string, number>
  myCards?: PokerCard[]
}

interface FlyingChip {
  key: string
  amount: number
  fx: number
  fy: number
}

function getSeatPosition(seatIndex: number, total: number, mySeatIndex: number | null, rx = 41, ry = 35) {
  const offset = mySeatIndex !== null ? mySeatIndex : 0
  const angle = ((seatIndex - offset) / total) * 2 * Math.PI + Math.PI / 2
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top:  `${50 + ry * Math.sin(angle)}%`,
  }
}

function getBetPosition(seatIndex: number, total: number, mySeatIndex: number | null, rx = 24, ry = 18) {
  const offset = mySeatIndex !== null ? mySeatIndex : 0
  const angle = ((seatIndex - offset) / total) * 2 * Math.PI + Math.PI / 2
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top:  `${50 + ry * Math.sin(angle)}%`,
  }
}

export function TableView({ players, myPlayerId, mySeatIndex, currentSeat, communityCards, pot, tableBets, myCards = [] }: TableViewProps) {
  const seated = players.filter(p => p.seat_index !== null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const prevBetsRef = useRef<Record<string, number>>({})
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([])
  const [potPulseKey, setPotPulseKey] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const container = wrapRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    const cx = W / 2
    const cy = H / 2
    const prev = prevBetsRef.current
    const newChips: FlyingChip[] = []

    for (const p of seated) {
      const bet = tableBets[p.id] ?? 0
      const prevBet = prev[p.id] ?? 0
      if (bet > prevBet && p.seat_index !== null) {
        const pos = getBetPosition(p.seat_index, seated.length, mySeatIndex)
        const fx = (parseFloat(pos.left) / 100) * W - cx
        const fy = (parseFloat(pos.top) / 100) * H - cy
        newChips.push({ key: `fly-${p.id}-${Date.now()}`, amount: bet, fx, fy })
      }
    }

    if (newChips.length > 0) {
      setFlyingChips(c => [...c, ...newChips])
      setPotPulseKey(k => k + 1)
    }
    prevBetsRef.current = { ...tableBets }
  }, [tableBets, seated, mySeatIndex])

  return (
    <div
      style={{ perspective: isMobile ? 'none' : '900px' }}
      className="absolute inset-0"
    >
      <div style={{
        transform: isMobile ? 'none' : 'rotateX(16deg) scaleX(0.93)',
        transformOrigin: '50% 85%',
        transformStyle: 'preserve-3d',
        width: '100%',
        height: '100%',
      }}>
        <div ref={wrapRef} className="relative w-full h-full">

          {/* SVG table surface */}
          <svg
            className="absolute inset-1"
            width="100%" height="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <filter id="wg" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.008 0.55" numOctaves={7} seed={42} result="noise" />
                <feColorMatrix in="noise" type="matrix"
                  values="0.52 0.22 0.04 0 0.08
                          0.26 0.11 0.02 0 0.03
                          0.07 0.03 0.01 0 0.01
                          0    0    0    1 0"
                  result="wood" />
                <feComposite in="wood" in2="wood" operator="arithmetic" k1="0" k2="1.12" k3="0" k4="-0.09" />
              </filter>
              <filter id="felt" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.75 0.75" numOctaves={4} seed={7} result="tex" />
                <feColorMatrix in="tex" type="matrix"
                  values="0 0 0 0 0.04
                          0 0 0 0 0.00
                          0 0 0 0 0.12
                          0 0 0 0.18 0"
                  result="feltTex" />
                <feBlend in="SourceGraphic" in2="feltTex" mode="overlay" />
              </filter>
              <radialGradient id="feltGrad" cx="50%" cy="38%" r="68%">
                <stop offset="0%"   stopColor="#1e0052" />
                <stop offset="48%"  stopColor="#0f0030" />
                <stop offset="100%" stopColor="#060015" />
              </radialGradient>
              <radialGradient id="feltReflect" cx="50%" cy="18%" r="55%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.07)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <linearGradient id="neonRim" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#d4a0ff" />
                <stop offset="42%"  stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#3d1a70" />
              </linearGradient>
              <linearGradient id="leather" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#4a2008" />
                <stop offset="40%"  stopColor="#2e1205" />
                <stop offset="100%" stopColor="#160800" />
              </linearGradient>
            </defs>

            {/* 1 Outer drop shadow */}
            <ellipse cx="50%" cy="52%" rx="48%" ry="47%"
              fill="rgba(0,0,0,0.85)" style={{ filter: 'blur(14px)' }} />

            {/* 2 Mahogany wood rail */}
            <ellipse cx="50%" cy="50%" rx="48%" ry="47%"
              fill="#2d1005" style={{ filter: 'url(#wg)' }} />

            {/* 3 Top bevel highlight */}
            <ellipse cx="50%" cy="44%" rx="45%" ry="42%"
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />

            {/* 4 Leather padding band */}
            <ellipse cx="50%" cy="50%" rx="43%" ry="42%"
              fill="url(#leather)" />

            {/* 5 Stitching ring */}
            <ellipse cx="50%" cy="50%" rx="41.5%" ry="40.5%"
              fill="none" stroke="rgba(220,185,100,0.22)" strokeWidth="1"
              strokeDasharray="4 7" />

            {/* 6 Neon metal trim */}
            <ellipse cx="50%" cy="50%" rx="40%" ry="39%"
              fill="none" stroke="url(#neonRim)" strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 4px rgba(180,80,255,0.95)) drop-shadow(0 0 12px rgba(180,80,255,0.5))' }} />

            {/* 7 Felt surface */}
            <ellipse cx="50%" cy="50%" rx="38%" ry="37%"
              fill="url(#feltGrad)" style={{ filter: 'url(#felt)' }} />

            {/* 8 Felt reflection */}
            <ellipse cx="50%" cy="34%" rx="28%" ry="16%"
              fill="url(#feltReflect)" />

            {/* 9 Felt center glow */}
            <ellipse cx="50%" cy="46%" rx="22%" ry="16%"
              fill="rgba(110,35,210,0.14)" style={{ filter: 'blur(10px)' }} />
          </svg>

          {/* Center: community cards + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none" style={{ paddingTop: isMobile ? '16%' : '14%' }}>
            <CommunityCards cards={communityCards} />
            {pot > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                <ChipStack amount={pot} />
                <div
                  key={potPulseKey}
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full font-semibold text-sm"
                  style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%)',
                    border: '1px solid rgba(180,80,255,0.4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    animation: potPulseKey > 0 ? 'potPulse 0.55s ease-out' : undefined,
                  }}
                >
                  <span className="text-xs opacity-60" style={{ color: '#bf80ff' }}>POT</span>
                  <span className="font-mono" style={{ color: '#bf80ff' }}>{pot.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Flying chips (arc to pot) */}
          {flyingChips.map(fc => (
            <div
              key={fc.key}
              className="absolute pointer-events-none z-30"
              style={{
                top: '50%',
                left: '50%',
                '--fx': `${fc.fx}px`,
                '--fy': `${fc.fy}px`,
                animation: 'chipFlyArc 0.72s cubic-bezier(0.4,0,1,1) forwards',
              } as React.CSSProperties}
              onAnimationEnd={() =>
                setFlyingChips(c => c.filter(x => x.key !== fc.key))
              }
            >
              <ChipStack amount={fc.amount} small />
            </div>
          ))}

          {/* Static bet chip stacks */}
          {seated.map(player => {
            const bet = tableBets[player.id] ?? 0
            if (bet <= 0) return null
            const pos = getBetPosition(player.seat_index!, seated.length, mySeatIndex, isMobile ? 20 : 24, isMobile ? 15 : 18)
            return (
              <div
                key={`bet-${player.id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{ top: pos.top, left: pos.left }}
              >
                <ChipStack amount={bet} small />
              </div>
            )
          })}

          {/* Player slots */}
          {seated.map(player => {
            const isMe = player.id === myPlayerId
            const pos = getSeatPosition(player.seat_index!, seated.length, mySeatIndex, isMobile ? 33 : 41, isMobile ? 32 : 35)
            return (
              <div
                key={player.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ top: pos.top, left: pos.left }}
              >
                <PlayerSlot
                  player={player}
                  isMe={isMe}
                  isActive={player.seat_index === currentSeat}
                  betAmount={tableBets[player.id] ?? 0}
                  cards={isMe ? myCards : undefined}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// src/app/room/[code]/TableView.tsx
'use client'
import { useRef, useState, useEffect } from 'react'
import type { Player, PokerCard } from '@/types/domain'
import { PlayerSlot } from './PlayerSlot'
import { CommunityCards } from './CommunityCards'
import { ChipStack } from '@/components/ChipStack'
import { playChipSound } from '@/lib/sounds'

interface TableViewProps {
  players: Player[]
  myPlayerId: string | null
  mySeatIndex: number | null
  currentSeat: number | null
  communityCards: PokerCard[]
  pot: number
  tableBets: Record<string, number>
  myCards?: PokerCard[]
  onMyCardTap?: () => void
  dealerSeat?: number | null
  smallBlind?: number
  bigBlind?: number
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

export function TableView({ players, myPlayerId, mySeatIndex, currentSeat, communityCards, pot, tableBets, myCards = [], onMyCardTap, dealerSeat, smallBlind, bigBlind }: TableViewProps) {
  const seated = players.filter(p => p.seat_index !== null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const prevBetsRef = useRef<Record<string, number>>({})
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([])
  const [potPulseKey, setPotPulseKey] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Compute SB/BB seats from dealer seat
  const sbSeat = dealerSeat !== null && dealerSeat !== undefined
    ? (seated.length === 2
        ? dealerSeat
        : (() => {
            const sortedSeats = seated.map(p => p.seat_index!).sort((a, b) => a - b)
            const dealerIdx = sortedSeats.indexOf(dealerSeat)
            return dealerIdx >= 0 ? sortedSeats[(dealerIdx + 1) % sortedSeats.length] : null
          })())
    : null
  const bbSeat = dealerSeat !== null && dealerSeat !== undefined
    ? (seated.length === 2
        ? (() => {
            const sortedSeats = seated.map(p => p.seat_index!).sort((a, b) => a - b)
            const dealerIdx = sortedSeats.indexOf(dealerSeat)
            return dealerIdx >= 0 ? sortedSeats[(dealerIdx + 1) % sortedSeats.length] : null
          })()
        : (() => {
            const sortedSeats = seated.map(p => p.seat_index!).sort((a, b) => a - b)
            const dealerIdx = sortedSeats.indexOf(dealerSeat)
            return dealerIdx >= 0 ? sortedSeats[(dealerIdx + 2) % sortedSeats.length] : null
          })())
    : null

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
      playChipSound()
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

          {/* SVG table surface — CoinPoker-style green felt capsule */}
          <svg
            className="absolute inset-1"
            width="100%" height="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Felt texture filter */}
              <filter id="felt" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9 0.9" numOctaves={4} seed={7} result="tex" />
                <feColorMatrix in="tex" type="matrix"
                  values="0 0 0 0 0
                          0 0 0 0 0.02
                          0 0 0 0 0
                          0 0 0 0.08 0"
                  result="feltTex" />
                <feBlend in="SourceGraphic" in2="feltTex" mode="overlay" />
              </filter>
              {/* Green felt gradient */}
              <radialGradient id="feltGrad" cx="50%" cy="40%" r="65%">
                <stop offset="0%"   stopColor="#1a5c2a" />
                <stop offset="50%"  stopColor="#0f4420" />
                <stop offset="100%" stopColor="#0a3018" />
              </radialGradient>
              {/* Subtle light reflection */}
              <radialGradient id="feltReflect" cx="50%" cy="25%" r="50%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              {/* Center glow */}
              <radialGradient id="centerGlow" cx="50%" cy="45%" r="30%">
                <stop offset="0%"   stopColor="rgba(30,120,50,0.2)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            {/* 1 Drop shadow */}
            <rect x="6%" y="10%" width="88%" height="80%" rx="40%" ry="40%"
              fill="rgba(0,0,0,0.7)" style={{ filter: 'blur(18px)' }} />

            {/* 2 Dark border/edge */}
            <rect x="8%" y="12%" width="84%" height="76%" rx="38%" ry="38%"
              fill="#1a1a1a" stroke="#0d0d0d" strokeWidth="2" />

            {/* 3 Thin accent border */}
            <rect x="9%" y="13%" width="82%" height="74%" rx="37%" ry="37%"
              fill="none" stroke="rgba(40,80,50,0.5)" strokeWidth="1.5" />

            {/* 4 Green felt surface */}
            <rect x="10%" y="14%" width="80%" height="72%" rx="36%" ry="36%"
              fill="url(#feltGrad)" style={{ filter: 'url(#felt)' }} />

            {/* 5 Felt reflection */}
            <rect x="10%" y="14%" width="80%" height="72%" rx="36%" ry="36%"
              fill="url(#feltReflect)" />

            {/* 6 Center glow */}
            <rect x="10%" y="14%" width="80%" height="72%" rx="36%" ry="36%"
              fill="url(#centerGlow)" />

            {/* 7 Subtle inner line */}
            <rect x="15%" y="20%" width="70%" height="60%" rx="30%" ry="30%"
              fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </svg>

          {/* Center: blinds info + community cards + pot */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-10"
            style={{ top: isMobile ? '38%' : '44%' }}
          >
            {/* Blinds info */}
            {smallBlind && bigBlind && (
              <div className="text-[10px] font-semibold tracking-wider px-3 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: 'rgba(200,220,200,0.7)',
                  border: '1px solid rgba(80,140,80,0.2)',
                }}>
                NLH | Blinds: {smallBlind}/{bigBlind}
              </div>
            )}
            <CommunityCards cards={communityCards} />
            {pot > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full font-semibold"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(80,160,80,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>
                <span className="text-xs" style={{ color: '#7ec87e' }}>Pot</span>
                <span className="font-mono text-sm" style={{ color: '#a0e0a0' }}>{pot.toLocaleString()}</span>
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
            const pos = getBetPosition(player.seat_index!, seated.length, mySeatIndex, isMobile ? 33 : 30, isMobile ? 27 : 22)
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
            const pos = getSeatPosition(player.seat_index!, seated.length, mySeatIndex, isMobile ? 44 : 41, isMobile ? 44 : 35)
            const isDealer = player.seat_index === dealerSeat
            const isSB = player.seat_index === sbSeat
            const isBB = player.seat_index === bbSeat
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
                  onCardTap={isMe ? onMyCardTap : undefined}
                  isDealer={isDealer}
                  isSB={isSB}
                  isBB={isBB}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

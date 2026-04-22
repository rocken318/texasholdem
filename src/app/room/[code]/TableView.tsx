// src/app/room/[code]/TableView.tsx
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
}

function getSeatPosition(seatIndex: number, total: number, mySeatIndex: number | null): { top: string; left: string } {
  // If we know which seat is ours, rotate so our seat is always at the bottom
  const offset = mySeatIndex !== null ? mySeatIndex : 0
  const angle = ((seatIndex - offset) / total) * 2 * Math.PI + Math.PI / 2
  const rx = 36  // reduced from 44 to keep side players on screen
  const ry = 30  // reduced from 38 to keep top/bottom players inside oval
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
  }
}

function getBetPosition(seatIndex: number, total: number, mySeatIndex: number | null): { top: string; left: string } {
  const offset = mySeatIndex !== null ? mySeatIndex : 0
  const angle = ((seatIndex - offset) / total) * 2 * Math.PI + Math.PI / 2
  const rx = 20
  const ry = 15
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
  }
}

export function TableView({ players, myPlayerId, mySeatIndex, currentSeat, communityCards, pot, tableBets }: TableViewProps) {
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <div className="relative w-full" style={{ paddingBottom: '70%' }}>
      {/* ── Wood-grain rail + neon felt (SVG) ── */}
      <svg
        className="absolute inset-2"
        style={{ borderRadius: '50%', overflow: 'hidden' }}
        width="100%" height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="woodgrain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.012 0.45" numOctaves={5} seed={8} result="grain" />
            <feColorMatrix in="grain" type="matrix"
              values="0.55 0.25 0.05 0 0.10
                      0.28 0.12 0.02 0 0.04
                      0.08 0.03 0.01 0 0.01
                      0    0    0    1 0"
            />
          </filter>
          <radialGradient id="feltGrad" cx="50%" cy="40%" r="65%">
            <stop offset="0%"   stopColor="#1a0040" />
            <stop offset="45%"  stopColor="#0f0028" />
            <stop offset="100%" stopColor="#08001a" />
          </radialGradient>
        </defs>

        {/* Drop shadow */}
        <ellipse cx="50%" cy="50%" rx="49%" ry="49%"
          fill="rgba(0,0,0,0.8)" style={{ filter: 'blur(10px)' }} />

        {/* Wood grain rail */}
        <ellipse cx="50%" cy="50%" rx="48%" ry="48%"
          fill="#3d1f0a" style={{ filter: 'url(#woodgrain)' }} />

        {/* Top bevel highlight */}
        <ellipse cx="50%" cy="44%" rx="45%" ry="42%"
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />

        {/* Neon purple glow ring */}
        <ellipse cx="50%" cy="50%" rx="41%" ry="41%"
          fill="none"
          stroke="rgba(180,80,255,0.8)"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 0 5px rgba(180,80,255,0.9)) drop-shadow(0 0 12px rgba(180,80,255,0.5))' }}
        />

        {/* Felt */}
        <ellipse cx="50%" cy="50%" rx="39%" ry="39%"
          fill="url(#feltGrad)" />

        {/* Felt center glow */}
        <ellipse cx="50%" cy="45%" rx="24%" ry="20%"
          fill="rgba(120,40,200,0.12)"
          style={{ filter: 'blur(8px)' }} />
      </svg>

      {/* Center area - community cards + pot */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
        <CommunityCards cards={communityCards} />
        {pot > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <ChipStack amount={pot} />
            <div
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full font-semibold text-sm"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)',
                border: '1px solid rgba(180,80,255,0.35)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <span className="text-xs opacity-60" style={{ color: '#bf80ff' }}>POT</span>
              <span className="font-mono" style={{ color: '#bf80ff' }}>
                {pot.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bet chip stacks */}
      {seated.map(player => {
        const bet = tableBets[player.id] ?? 0
        if (bet <= 0) return null
        const pos = getBetPosition(player.seat_index!, seated.length, mySeatIndex)
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
        const pos = getSeatPosition(player.seat_index!, seated.length, mySeatIndex)
        return (
          <div
            key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ top: pos.top, left: pos.left }}
          >
            <PlayerSlot
              player={player}
              isMe={player.id === myPlayerId}
              isActive={player.seat_index === currentSeat}
              betAmount={tableBets[player.id] ?? 0}
            />
          </div>
        )
      })}
    </div>
  )
}

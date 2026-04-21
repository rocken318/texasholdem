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
      {/* Outer rail - dark wood/leather */}
      <div
        className="absolute inset-2 rounded-[50%] shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)]"
        style={{
          background: 'linear-gradient(180deg, #4a2c17 0%, #2d1a0e 30%, #1a0f07 70%, #2d1a0e 100%)',
        }}
      />

      {/* Rail highlight / bevel */}
      <div
        className="absolute inset-3 rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #5c3a22 0%, #3d2415 50%, #5c3a22 100%)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.4)',
        }}
      />

      {/* Gold trim ring */}
      <div
        className="absolute inset-5 rounded-[50%]"
        style={{
          border: '1.5px solid rgba(212,175,55,0.35)',
          boxShadow: '0 0 8px rgba(212,175,55,0.15)',
        }}
      />

      {/* Main felt surface */}
      <div
        className="absolute inset-6 rounded-[50%]"
        style={{
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(34,120,50,0.9) 0%, rgba(20,80,30,0.95) 40%, rgba(12,55,18,1) 80%),
            radial-gradient(ellipse at 50% 50%, #1a6b2a 0%, #0f4a1a 50%, #0a3012 100%)
          `,
          boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)',
        }}
      />

      {/* Felt texture overlay (subtle noise) */}
      <div
        className="absolute inset-6 rounded-[50%] opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Center glow on felt */}
      <div
        className="absolute inset-6 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, rgba(50,160,70,0.25) 0%, transparent 50%)',
        }}
      />

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
                border: '1px solid rgba(212,175,55,0.3)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <span className="text-xs opacity-60" style={{ color: '#D4AF37' }}>POT</span>
              <span className="font-mono" style={{ color: '#5ce65c' }}>
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

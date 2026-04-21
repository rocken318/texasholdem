// src/app/room/[code]/TableView.tsx
import type { Player, PokerCard } from '@/types/domain'
import { PlayerSlot } from './PlayerSlot'
import { CommunityCards } from './CommunityCards'

interface TableViewProps {
  players: Player[]
  myPlayerId: string | null
  currentSeat: number | null
  communityCards: PokerCard[]
  pot: number
}

function getSeatPosition(seatIndex: number, total: number): { top: string; left: string } {
  const angle = ((seatIndex / total) * 2 * Math.PI) - Math.PI / 2
  const rx = 40
  const ry = 30
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
  }
}

export function TableView({ players, myPlayerId, currentSeat, communityCards, pot }: TableViewProps) {
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <div className="relative w-full" style={{ paddingBottom: '65%' }}>
      {/* Table felt */}
      <div className="absolute inset-4 rounded-full bg-green-700 border-4 border-yellow-800 shadow-2xl" />

      {/* Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <CommunityCards cards={communityCards} />
        {pot > 0 && (
          <div className="bg-black/40 text-yellow-300 text-sm font-mono px-3 py-1 rounded-full">
            Pot: {pot}
          </div>
        )}
      </div>

      {/* Player slots */}
      {seated.map(player => {
        const pos = getSeatPosition(player.seat_index!, seated.length)
        return (
          <div
            key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            <PlayerSlot
              player={player}
              isMe={player.id === myPlayerId}
              isActive={player.seat_index === currentSeat}
            />
          </div>
        )
      })}
    </div>
  )
}

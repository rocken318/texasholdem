// src/app/room/[code]/LobbyView.tsx
import { GameQRCode } from '@/components/GameQRCode'
import type { Room, Player } from '@/types/domain'

interface LobbyViewProps {
  room: Room
  players: Player[]
  myPlayer: Player | null
  hostPlayerId: string | null
  onStart: () => void
}

export function LobbyView({ room, players, myPlayer, hostPlayerId, onStart }: LobbyViewProps) {
  const isHost = myPlayer?.is_host || myPlayer?.id === hostPlayerId
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold text-white mt-4">Waiting for players...</h1>
      <GameQRCode joinCode={room.join_code} />

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 flex flex-col gap-3">
        <h2 className="text-white font-semibold">Players ({seated.length}/{room.settings.maxPlayers})</h2>
        {seated.map(p => (
          <div key={p.id} className="flex items-center justify-between text-white">
            <span>{p.display_name}{p.is_host ? ' 👑' : ''}{p.id === myPlayer?.id ? ' (you)' : ''}</span>
            <span className="text-green-300 font-mono">{p.chips}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 text-white/70 text-sm flex flex-col gap-1">
        <div>{room.format === 'tournament' ? '🏆 Tournament' : '💰 Cash Game'}</div>
        <div>Blinds: {room.settings.smallBlind}/{room.settings.bigBlind}</div>
        <div>Starting chips: {room.settings.startingChips}</div>
        <div>Turn timer: {room.settings.turnTimerSec}s</div>
      </div>

      {isHost && seated.length >= 2 && (
        <button onClick={onStart}
          className="w-full max-w-sm py-4 rounded-xl bg-yellow-400 text-gray-900 font-bold text-xl">
          Start Game ▶
        </button>
      )}
      {isHost && seated.length < 2 && (
        <p className="text-white/60 text-sm">Need at least 2 players to start</p>
      )}
    </main>
  )
}

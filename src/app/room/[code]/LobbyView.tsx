// src/app/room/[code]/LobbyView.tsx
import { GameQRCode } from '@/components/GameQRCode'
import type { Room, Player } from '@/types/domain'
import type { Translations } from '@/lib/i18n'

interface LobbyViewProps {
  room: Room
  players: Player[]
  myPlayer: Player | null
  hostPlayerId: string | null
  onStart: () => void
  onAddBot?: () => void
  t: Translations
}

export function LobbyView({ room, players, myPlayer, hostPlayerId, onStart, onAddBot, t }: LobbyViewProps) {
  const isHost = myPlayer?.is_host || myPlayer?.id === hostPlayerId
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <main
      className="min-h-screen flex flex-col items-center gap-6 p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0c0518 0%, #060310 100%)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(60,20,100,0.4)_0%,_rgba(12,5,24,0.8)_50%,_rgba(4,2,12,1)_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm mt-4">
        {/* Header with animated pulse dots */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <h1
            className="text-2xl font-bold text-white tracking-wide animate-pulse"
            style={{ color: 'rgba(180,80,255,0.85)', textShadow: '0 0 20px rgba(140,50,255,0.5)' }}
          >{t.waitingForPlayers}</h1>
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
        </div>

        {/* QR Code with gold frame */}
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-[#D4AF37]/40 to-[#D4AF37]/10">
          <div className="bg-[#0c0518] rounded-2xl p-4">
            <GameQRCode joinCode={room.join_code} />
          </div>
        </div>

        {/* Player list */}
        <div className="w-full rounded-2xl border border-[#D4AF37]/20 bg-black/30 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D4AF37]/10 flex items-center justify-between">
            <h2 className="text-[#D4AF37] font-semibold tracking-wide">{t.players}</h2>
            <span className="text-white/60 text-sm font-mono">{seated.length}/{room.settings.maxPlayers}</span>
          </div>
          <div className="p-2 flex flex-col gap-1.5">
            {seated.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                  p.id === myPlayer?.id
                    ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20'
                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
                style={{ borderLeft: '2px solid rgba(140,50,255,0.3)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#2d5a27] flex items-center justify-center text-white/70 text-xs font-bold border border-white/10">
                    {i + 1}
                  </div>
                  <span className="text-white font-medium">
                    {p.display_name}
                    {p.is_host && <span className="ml-1.5 text-[#D4AF37]" title="Host">&#9813;</span>}
                    {p.id === myPlayer?.id && (
                      <span className="ml-1.5 text-white/40 text-sm">({t.you})</span>
                    )}
                  </span>
                </div>
                <span className="text-[#5ce65c] font-mono font-semibold">{p.chips.toLocaleString()}</span>
              </div>
            ))}
            {Array.from({ length: room.settings.maxPlayers - seated.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center px-4 py-3 rounded-xl border border-dashed border-white/10 text-white/15 text-sm"
              >
                Empty seat
              </div>
            ))}
          </div>
        </div>

        {/* Room info */}
        <div className="w-full rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-white/40 text-xs uppercase tracking-wider">Format</span>
              <span className="text-white font-medium mt-0.5">
                {room.format === 'tournament' ? t.tournament : t.cash}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40 text-xs uppercase tracking-wider">{t.blinds}</span>
              <span className="text-white font-mono font-medium mt-0.5">{room.settings.smallBlind}/{room.settings.bigBlind}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40 text-xs uppercase tracking-wider">{t.startingChipsLabel}</span>
              <span className="text-white font-mono font-medium mt-0.5">{room.settings.startingChips.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40 text-xs uppercase tracking-wider">{t.turnTimer}</span>
              <span className="text-white font-mono font-medium mt-0.5">{room.settings.turnTimerSec}s</span>
            </div>
          </div>
        </div>

        {/* Host actions */}
        {isHost && (
          <div className="w-full flex flex-col gap-2">
            {onAddBot && seated.length < room.settings.maxPlayers && (
              <button
                onClick={onAddBot}
                className="w-full py-3 rounded-xl border border-white/15 text-white/60 font-semibold text-sm hover:border-white/30 hover:text-white/80 transition-all duration-200 active:scale-[0.98]"
              >
                🤖 BOTを追加 / Add Bot
              </button>
            )}
            {seated.length >= 2 ? (
              <button
                onClick={onStart}
                className="w-full py-4 rounded-xl font-bold text-xl active:scale-[0.98] transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #F5D060, #D4AF37)',
                  color: '#1a1a0a',
                  boxShadow: '0 0 20px rgba(212,175,55,0.4), 0 4px 16px rgba(212,175,55,0.25)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(212,175,55,0.6), 0 4px 24px rgba(212,175,55,0.4)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(212,175,55,0.4), 0 4px 16px rgba(212,175,55,0.25)'
                }}
              >
                {t.startGame}
              </button>
            ) : (
              <p
                className="text-sm text-center animate-pulse"
                style={{ color: 'rgba(180,80,255,0.7)' }}
              >{t.needMorePlayers}</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

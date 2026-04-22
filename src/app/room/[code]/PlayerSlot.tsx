// src/app/room/[code]/PlayerSlot.tsx
import type { Player, PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'

interface PlayerSlotProps {
  player: Player
  isMe: boolean
  isActive: boolean
  betAmount?: number
  cards?: PokerCard[]
}

export function PlayerSlot({ player, isMe, isActive, betAmount = 0, cards }: PlayerSlotProps) {
  const inHand = player.status !== 'folded' && player.status !== 'out'
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'all_in'
  const initial = player.display_name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      {/* Turn indicator arrow */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            animation: 'arrowBob 0.9s ease-in-out infinite',
            zIndex: 20,
            lineHeight: 1,
          }}
        >
          <svg width="14" height="12" viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="7,12 0,0 14,0"
              fill="#ffd700"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.9)) drop-shadow(0 0 8px rgba(255,215,0,0.5))' }}
            />
          </svg>
        </div>
      )}

      {/* Hole cards: face-up (mine) or face-down (others) */}
      {isMe && cards && cards.length > 0 && !isFolded && (
        <div className="flex -space-x-3 mb-0.5">
          <div className="-rotate-6" style={{ filter: 'drop-shadow(0 4px 8px rgba(140,50,255,0.5))' }}>
            <Card card={cards[0]} className="ring-1 ring-[#bf80ff]/60" />
          </div>
          <div className="rotate-6" style={{ filter: 'drop-shadow(0 4px 8px rgba(140,50,255,0.5))' }}>
            <Card card={cards[1]} className="ring-1 ring-[#bf80ff]/60" />
          </div>
        </div>
      )}
      {inHand && !isFolded && (!isMe || !cards?.length) && (
        <div className="flex -space-x-1.5 mb-0.5" style={{ transform: 'scale(0.7)', transformOrigin: 'bottom center' }}>
          <div className="-rotate-6"><Card faceDown small /></div>
          <div className="rotate-6"><Card faceDown small /></div>
        </div>
      )}
      {isFolded && (
        <div className="flex -space-x-1.5 mb-0.5" style={{ transform: 'scale(0.7)', transformOrigin: 'bottom center' }}>
          <div style={{ animation: 'foldDiscardL 0.45s ease-out forwards' }}>
            <Card faceDown small />
          </div>
          <div style={{ animation: 'foldDiscardR 0.45s ease-out 0.06s forwards' }}>
            <Card faceDown small />
          </div>
        </div>
      )}

      {/* Main player HUD */}
      <div
        className={cn(
          'relative flex flex-col items-center rounded-lg px-1.5 py-1 min-w-[52px] max-w-[64px] transition-all duration-300',
          !inHand && 'opacity-50',
        )}
        style={{
          background: isMe
            ? 'linear-gradient(180deg, rgba(140,50,255,0.18) 0%, rgba(20,10,40,0.88) 40%, rgba(12,5,28,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(30,15,55,0.82) 0%, rgba(15,8,30,0.92) 100%)',
          border: isMe
            ? '1px solid rgba(180,80,255,0.45)'
            : '1px solid rgba(180,80,255,0.15)',
          boxShadow: isActive
            ? '0 0 14px rgba(180,80,255,0.75), 0 0 28px rgba(180,80,255,0.35)'
            : '0 2px 8px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Active pulsing ring */}
        {isActive && (
          <div
            className="absolute -inset-[2px] rounded-xl animate-pulse"
            style={{ border: '2px solid #bf80ff', boxShadow: '0 0 8px rgba(180,80,255,0.6)' }}
          />
        )}

        {/* Countdown bar */}
        {isActive && (
          <div className="absolute top-0 left-2 right-2 h-[2px] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #7c3aed, #bf80ff)', animation: 'shrinkBar 15s linear infinite' }}
            />
          </div>
        )}

        {/* Avatar */}
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
            isActive && 'ring-2 ring-[#bf80ff] ring-offset-1 ring-offset-transparent',
          )}
          style={{
            background: isMe
              ? 'linear-gradient(135deg, #bf80ff 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #3a2060 0%, #1e0f40 100%)',
            color: '#fff',
          }}
        >
          {initial}
        </div>

        {/* Name — gold when active, purple when me, white otherwise */}
        <span
          className="text-[8px] font-semibold max-w-[56px] truncate block leading-tight mt-0.5"
          style={{ color: isActive ? '#ffd700' : isMe ? '#d4a0ff' : 'rgba(255,255,255,0.85)' }}
        >
          {player.display_name}
        </span>

        {/* Chip count */}
        <div className="flex items-center gap-0.5 mt-0.5">
          <span className="text-[7px]" style={{ color: '#5ce65c' }}>$</span>
          <span className="text-[8px] font-mono font-semibold" style={{ color: '#5ce65c' }}>
            {player.chips.toLocaleString()}
          </span>
        </div>

        {/* Bet amount badge */}
        {betAmount > 0 && (
          <div
            className="flex items-center gap-0.5 mt-0.5 px-1.5 py-0 rounded-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(180,80,255,0.25) 0%, rgba(180,80,255,0.1) 100%)',
              border: '1px solid rgba(180,80,255,0.35)',
            }}
          >
            <span className="text-[8px]" style={{ color: '#bf80ff' }}>BET</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: '#d4a0ff' }}>
              {betAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* All-in badge */}
        {isAllIn && (
          <div
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-sm mt-0.5"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #bf80ff)', color: '#fff' }}
          >
            All In
          </div>
        )}

        {/* Fold overlay */}
        {isFolded && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
              FOLD
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

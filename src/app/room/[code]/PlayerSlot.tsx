// src/app/room/[code]/PlayerSlot.tsx
import type { Player } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'

export function PlayerSlot({ player, isMe, isActive }: {
  player: Player; isMe: boolean; isActive: boolean
}) {
  const inHand = player.status !== 'folded' && player.status !== 'out'
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'all_in'
  const initial = player.display_name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Face-down hole cards above slot */}
      {inHand && (
        <div className="flex -space-x-2 mb-0.5">
          <div className="-rotate-6">
            <Card faceDown small />
          </div>
          <div className="rotate-6">
            <Card faceDown small />
          </div>
        </div>
      )}

      {/* Main player HUD */}
      <div
        className={cn(
          'relative flex flex-col items-center rounded-xl px-2 py-1.5 min-w-[72px] max-w-[90px] transition-all duration-300',
          !inHand && 'opacity-50',
        )}
        style={{
          background: isMe
            ? 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(30,30,30,0.85) 40%, rgba(20,20,20,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(40,40,40,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: isMe
            ? '1px solid rgba(212,175,55,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isActive
            ? '0 0 12px rgba(212,175,55,0.6), 0 0 24px rgba(212,175,55,0.3)'
            : '0 2px 8px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Active turn pulsing ring */}
        {isActive && (
          <div
            className="absolute -inset-[2px] rounded-xl animate-pulse"
            style={{
              border: '2px solid #D4AF37',
              boxShadow: '0 0 8px rgba(212,175,55,0.5)',
            }}
          />
        )}

        {/* Countdown-style bar (visual only, for active player) */}
        {isActive && (
          <div className="absolute top-0 left-2 right-2 h-[2px] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #D4AF37, #F5D060)',
                animation: 'shrinkBar 15s linear infinite',
              }}
            />
          </div>
        )}

        {/* Avatar circle */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            isActive && 'ring-2 ring-[#D4AF37] ring-offset-1 ring-offset-transparent',
          )}
          style={{
            background: isMe
              ? 'linear-gradient(135deg, #D4AF37 0%, #8B7320 100%)'
              : 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
            color: isMe ? '#1a1a1a' : '#e2e8f0',
          }}
        >
          {initial}
        </div>

        {/* Name */}
        <span
          className={cn(
            'text-[10px] font-semibold max-w-[70px] truncate block leading-tight mt-0.5',
            isMe ? 'text-[#F5D060]' : 'text-white/90',
          )}
        >
          {player.display_name}
        </span>

        {/* Chip count */}
        <div className="flex items-center gap-0.5 mt-0.5">
          <span className="text-[9px]" style={{ color: '#5ce65c' }}>$</span>
          <span
            className="text-[11px] font-mono font-semibold"
            style={{ color: '#5ce65c' }}
          >
            {player.chips.toLocaleString()}
          </span>
        </div>

        {/* All-in badge */}
        {isAllIn && (
          <div
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-sm mt-0.5"
            style={{
              background: 'linear-gradient(90deg, #D4AF37, #F5D060)',
              color: '#1a1a1a',
            }}
          >
            All In
          </div>
        )}

        {/* Fold overlay */}
        {isFolded && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              FOLD
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

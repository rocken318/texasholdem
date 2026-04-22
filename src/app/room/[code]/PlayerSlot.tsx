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
  onCardTap?: () => void
}

/** Tiny inline SVG chip icon — 8×8 circle with a center dot */
function ChipIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="4" cy="4" r="3.5" fill="none" stroke="#5ce65c" strokeWidth="1" />
      <circle cx="4" cy="4" r="1.2" fill="#5ce65c" />
    </svg>
  )
}

export function PlayerSlot({ player, isMe, isActive, betAmount = 0, cards, onCardTap }: PlayerSlotProps) {
  const inHand = player.status !== 'folded' && player.status !== 'out'
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'all_in'
  const isOut = player.status === 'out'
  const initial = player.display_name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      {/* Turn indicator arrow — double-arrow with glow trail */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'arrowBob 0.9s ease-in-out infinite',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            lineHeight: 1,
          }}
        >
          {/* Primary arrow */}
          <svg width="14" height="10" viewBox="0 0 14 10" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="7,10 0,0 14,0"
              fill="#ffd700"
              style={{ filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.95)) drop-shadow(0 0 10px rgba(255,215,0,0.6))' }}
            />
          </svg>
          {/* Secondary smaller arrow for double-arrow effect */}
          <svg width="9" height="7" viewBox="0 0 9 7" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="4.5,7 0,0 9,0"
              fill="#ffd700"
              style={{ opacity: 0.55, filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.7))' }}
            />
          </svg>
          {/* Glow trail below arrows */}
          <div
            style={{
              width: 2,
              height: 8,
              background: 'linear-gradient(180deg, rgba(255,215,0,0.5) 0%, transparent 100%)',
              borderRadius: 1,
            }}
          />
        </div>
      )}

      {/* Hole cards: face-up (mine) or face-down (others) */}
      {isMe && cards && cards.length > 0 && !isFolded && (
        <div
          className="flex flex-col items-center gap-0.5 mb-0.5"
          onClick={onCardTap}
          style={onCardTap ? { cursor: 'pointer' } : undefined}
        >
          <div className="flex -space-x-3">
            <div className="-rotate-6" style={{ filter: 'drop-shadow(0 4px 8px rgba(140,50,255,0.5))' }}>
              <Card card={cards[0]} className="ring-1 ring-[#bf80ff]/60" />
            </div>
            <div className="rotate-6" style={{ filter: 'drop-shadow(0 4px 8px rgba(140,50,255,0.5))' }}>
              <Card card={cards[1]} className="ring-1 ring-[#bf80ff]/60" />
            </div>
          </div>
          {onCardTap && (
            <div className="text-[8px] text-center" style={{ color: 'rgba(180,80,255,0.6)' }}>👁</div>
          )}
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
          <div style={{ animation: 'foldDiscardL 0.5s ease-in forwards' }}>
            <Card faceDown small />
          </div>
          <div style={{ animation: 'foldDiscardR 0.5s ease-in forwards' }}>
            <Card faceDown small />
          </div>
        </div>
      )}

      {/* Main player HUD */}
      <div
        className={cn(
          'relative flex flex-col items-center rounded-lg px-1.5 py-1 min-w-[56px] max-w-[68px] transition-all duration-300',
        )}
        style={{
          background: isMe
            ? 'linear-gradient(180deg, rgba(160,60,255,0.28) 0%, rgba(20,10,40,0.92) 40%, rgba(12,5,28,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(30,15,55,0.82) 0%, rgba(15,8,30,0.92) 100%)',
          border: isAllIn
            ? '1px solid rgba(255,50,50,0.9)'
            : isMe
            ? '1px solid rgba(180,80,255,0.55)'
            : '1px solid rgba(180,80,255,0.15)',
          boxShadow: isActive
            ? '0 0 14px rgba(180,80,255,0.75), 0 0 28px rgba(180,80,255,0.35)'
            : isMe
            ? '0 2px 10px rgba(140,50,255,0.25), 0 2px 8px rgba(0,0,0,0.6)'
            : '0 2px 8px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          animation: isOut
            ? 'bustOut 0.8s ease-out forwards'
            : isAllIn
            ? 'allInPulse 1s ease-in-out infinite'
            : isFolded
            ? 'foldSlotFade 0.5s ease-in 0.4s forwards'
            : undefined,
          opacity: isFolded ? 1 : undefined,
        }}
      >
        {/* Top inner highlight glow line */}
        <div
          className="absolute top-0 inset-x-0 rounded-t-lg overflow-hidden"
          style={{ height: 2, pointerEvents: 'none' }}
        >
          <div
            style={{
              height: '100%',
              width: '80%',
              margin: '0 auto',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
          />
        </div>

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

        {/* All-in badge above avatar */}
        {isAllIn && (
          <div
            className="text-[11px] font-bold uppercase tracking-wider px-1 py-0 rounded-sm mb-0.5"
            style={{
              background: 'linear-gradient(90deg, #cc0000, #ff3333)',
              color: '#fff',
              animation: 'allInBadge 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            ALL IN!
          </div>
        )}

        {/* Avatar — styled as a casino chip */}
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0',
            isMe ? 'font-black' : 'font-bold',
          )}
          style={{
            background: isMe
              ? 'linear-gradient(135deg, #bf80ff 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #3a2060 0%, #1e0f40 100%)',
            color: '#fff',
            boxShadow: isMe
              ? '0 0 0 1.5px rgba(180,80,255,0.55), 0 0 0 3px rgba(0,0,0,0.5), 0 0 0 4.5px rgba(180,80,255,0.25)'
              : '0 0 0 1.5px rgba(180,80,255,0.3), 0 0 0 3px rgba(0,0,0,0.5), 0 0 0 4.5px rgba(180,80,255,0.12)',
          }}
        >
          {initial}
        </div>

        {/* Name — gold when active, purple when me, white otherwise */}
        <span
          className="text-[9px] font-semibold max-w-[60px] truncate block leading-tight mt-0.5"
          style={{
            color: isActive ? '#ffd700' : isMe ? '#d4a0ff' : 'rgba(255,255,255,0.85)',
            textShadow: isActive ? '0 0 8px rgba(255,215,0,0.6)' : undefined,
          }}
        >
          {player.display_name}
        </span>

        {/* Chip count with inline chip icon */}
        <div className="flex items-center gap-0.5 mt-0.5">
          <ChipIcon />
          <span className="text-[8px] font-mono font-semibold" style={{ color: '#5ce65c' }}>
            {player.chips.toLocaleString()}
          </span>
        </div>

        {/* Bet amount badge — chip-style BET label */}
        {betAmount > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {/* BET chip circle */}
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black"
              style={{
                background: 'rgba(180,80,255,0.3)',
                border: '1px solid rgba(180,80,255,0.5)',
                color: '#d4a0ff',
                lineHeight: 1,
              }}
            >
              BET
            </div>
            {/* Amount */}
            <span
              className="text-[10px] font-mono font-bold"
              style={{
                color: '#d4a0ff',
                textShadow: '0 0 6px rgba(180,80,255,0.5)',
              }}
            >
              {betAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* All-in badge (second instance, after chip count) */}
        {isAllIn && (
          <div
            className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-sm mt-0.5"
            style={{
              background: 'linear-gradient(90deg, #cc0000, #ff3333)',
              color: '#fff',
              animation: 'allInBadge 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            ALL IN!
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

        {/* Eliminated overlay — fades in after shake animation */}
        {isOut && (
          <div
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', animation: 'eliminatedFadeIn 0.8s ease-out forwards' }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight"
              style={{ color: 'rgba(255,60,60,0.95)' }}
            >
              ELIM<br />INATED
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

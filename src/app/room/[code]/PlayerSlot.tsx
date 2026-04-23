// src/app/room/[code]/PlayerSlot.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import type { Player, PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'
import { playCardSound, playFoldSound } from '@/lib/sounds'

interface PlayerSlotProps {
  player: Player
  isMe: boolean
  isActive: boolean
  betAmount?: number
  cards?: PokerCard[]
  onCardTap?: () => void
  isDealer?: boolean
  isSB?: boolean
  isBB?: boolean
}

/** Tiny inline SVG chip icon */
function ChipIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="4" cy="4" r="3.5" fill="none" stroke="#5ce65c" strokeWidth="1" />
      <circle cx="4" cy="4" r="1.2" fill="#5ce65c" />
    </svg>
  )
}

const THROW_MS = 580

export function PlayerSlot({ player, isMe, isActive, betAmount = 0, cards, onCardTap, isDealer, isSB, isBB }: PlayerSlotProps) {
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'all_in'
  const isOut = player.status === 'out'
  const inHand = player.status !== 'folded' && player.status !== 'out'
  const initial = player.display_name.charAt(0).toUpperCase()

  // Only play the throw animation once, when transitioning INTO folded state
  const prevStatusRef = useRef(player.status)
  const [foldAnimActive, setFoldAnimActive] = useState(false)

  useEffect(() => {
    if (prevStatusRef.current !== 'folded' && player.status === 'folded') {
      setFoldAnimActive(true)
      playFoldSound()
      const t = setTimeout(() => setFoldAnimActive(false), THROW_MS)
      return () => clearTimeout(t)
    }
    prevStatusRef.current = player.status
  }, [player.status])

  // Show cards only when in-hand (not folded, not eliminated)
  const hasMyCards = isMe && !!cards?.length
  const showCards = inHand && (hasMyCards || !isMe)

  const throwAnimL: React.CSSProperties = foldAnimActive
    ? { animation: `cardThrowL ${THROW_MS}ms cubic-bezier(0.25,0.46,0.45,0.94) forwards` }
    : {}
  const throwAnimR: React.CSSProperties = foldAnimActive
    ? { animation: `cardThrowR ${THROW_MS}ms cubic-bezier(0.25,0.46,0.45,0.94) forwards` }
    : {}

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      {/* Fold text above player (CoinPoker style) */}
      {isFolded && !foldAnimActive && (
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Fold
        </div>
      )}

      {/* BB/SB badge ABOVE avatar (CoinPoker style) */}
      {(isBB || isSB) && (
        <div
          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-sm mb-0.5"
          style={{
            background: isBB ? '#2a7a8a' : '#3a8a7a',
            color: '#fff',
            fontSize: '8px',
            lineHeight: '14px',
          }}
        >
          {isBB ? 'BB' : 'SB'}
        </div>
      )}

      {/* Turn indicator arrow */}
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
          <svg width="14" height="10" viewBox="0 0 14 10" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="7,10 0,0 14,0"
              fill="#ffd700"
              style={{ filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.95)) drop-shadow(0 0 10px rgba(255,215,0,0.6))' }}
            />
          </svg>
          <svg width="9" height="7" viewBox="0 0 9 7" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="4.5,7 0,0 9,0"
              fill="#ffd700"
              style={{ opacity: 0.55, filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.7))' }}
            />
          </svg>
        </div>
      )}

      {/* ── Card area ── */}
      {showCards && (
        <div
          className="flex mb-0.5"
          style={{
            transform: (!hasMyCards && !foldAnimActive) ? 'scale(0.7)' : undefined,
            transformOrigin: 'bottom center',
            cursor: (!foldAnimActive && hasMyCards && onCardTap) ? 'pointer' : undefined,
          }}
          onClick={(!foldAnimActive && hasMyCards && onCardTap) ? onCardTap : undefined}
        >
          {/* Left card */}
          <div style={{ display: 'inline-block', ...(!foldAnimActive ? { transform: 'rotate(-6deg)' } : throwAnimL) }}>
            {hasMyCards
              ? (
                <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                  <Card card={cards![0]} className="ring-1 ring-emerald-400/40" />
                </div>
              )
              : <Card faceDown small />
            }
          </div>
          {/* Right card */}
          <div style={{ display: 'inline-block', marginLeft: foldAnimActive ? 4 : -12, ...(!foldAnimActive ? { transform: 'rotate(6deg)' } : throwAnimR) }}>
            {hasMyCards
              ? (
                <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                  <Card card={cards![1]} className="ring-1 ring-emerald-400/40" />
                </div>
              )
              : <Card faceDown small />
            }
          </div>
        </div>
      )}
      {/* Eye hint for my cards */}
      {hasMyCards && !foldAnimActive && !isFolded && onCardTap && (
        <div className="text-[8px] text-center -mt-0.5 mb-0.5" style={{ color: 'rgba(100,200,120,0.6)' }}>👁</div>
      )}

      {/* ── Main player HUD — CoinPoker style: large avatar + dark box ── */}
      <div
        className={cn(
          'relative flex flex-col items-center rounded-xl px-2 py-1.5 min-w-[64px] max-w-[76px] transition-all duration-300',
        )}
        style={{
          background: isMe
            ? 'linear-gradient(180deg, rgba(30,60,40,0.9) 0%, rgba(15,25,18,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(25,30,35,0.88) 0%, rgba(12,14,18,0.95) 100%)',
          border: isAllIn
            ? '1px solid rgba(255,50,50,0.9)'
            : isActive
            ? '1px solid rgba(255,215,0,0.6)'
            : isMe
            ? '1px solid rgba(80,180,100,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isActive
            ? '0 0 14px rgba(255,215,0,0.5), 0 0 28px rgba(255,215,0,0.2)'
            : isMe
            ? '0 2px 10px rgba(0,0,0,0.6)'
            : '0 2px 8px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          animation: isOut
            ? 'bustOut 0.8s ease-out forwards'
            : isAllIn
            ? 'allInPulse 1s ease-in-out infinite'
            : isFolded && !foldAnimActive
            ? 'foldSlotFade 0.5s ease-in 0.4s forwards'
            : undefined,
          opacity: isFolded ? 1 : undefined,
        }}
      >
        {/* Active pulsing ring */}
        {isActive && (
          <div
            className="absolute -inset-[2px] rounded-xl animate-pulse"
            style={{ border: '2px solid #ffd700', boxShadow: '0 0 8px rgba(255,215,0,0.4)' }}
          />
        )}

        {/* Countdown bar */}
        {isActive && (
          <div className="absolute top-0 left-2 right-2 h-[2px] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #4ade80, #22c55e)', animation: 'shrinkBar 15s linear infinite' }}
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

        {/* Avatar — larger circle (CoinPoker style) */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-[16px] shrink-0',
            isMe ? 'font-black' : 'font-bold',
          )}
          style={{
            background: isMe
              ? 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #3a4550 0%, #1e2830 100%)',
            color: '#fff',
            boxShadow: isMe
              ? '0 0 0 2px rgba(74,222,128,0.5), 0 0 0 4px rgba(0,0,0,0.5)'
              : '0 0 0 2px rgba(255,255,255,0.15), 0 0 0 4px rgba(0,0,0,0.5)',
          }}
        >
          {initial}
        </div>

        {/* Dealer button — red diamond with D (CoinPoker style) */}
        {isDealer && (
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: '50%',
              right: -14,
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              background: '#e53e3e',
              borderRadius: 3,
              border: '1px solid #fc8181',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              rotate: '45deg',
            }}
          >
            <span style={{ rotate: '-45deg', color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1 }}>D</span>
          </div>
        )}

        {/* Name in dark box */}
        <span
          className="text-[10px] font-semibold max-w-[68px] truncate block leading-tight mt-1 px-1 py-0.5 rounded"
          style={{
            color: isActive ? '#ffd700' : isMe ? '#a0e0a0' : 'rgba(255,255,255,0.85)',
            textShadow: isActive ? '0 0 8px rgba(255,215,0,0.6)' : undefined,
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {player.display_name}
        </span>

        {/* Chip count */}
        <div className="flex items-center gap-0.5 mt-0.5">
          <ChipIcon />
          <span className="text-[9px] font-mono font-semibold" style={{ color: '#5ce65c' }}>
            {player.chips.toLocaleString()}
          </span>
        </div>

        {/* Bet amount badge */}
        {betAmount > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <div
              className="w-3 h-3 rounded-full flex items-center justify-center"
              style={{
                background: '#e53e3e',
                border: '1px solid #fc8181',
              }}
            />
            <span
              className="text-[10px] font-mono font-bold"
              style={{ color: '#fbbf24' }}
            >
              {betAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* All-in badge (after chip count) */}
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

        {/* Eliminated overlay */}
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

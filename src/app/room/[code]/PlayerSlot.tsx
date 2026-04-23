// src/app/room/[code]/PlayerSlot.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import type { Player, PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'
import { playFoldSound } from '@/lib/sounds'

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

const THROW_MS = 580

export function PlayerSlot({ player, isMe, isActive, betAmount = 0, cards, onCardTap, isDealer, isSB, isBB }: PlayerSlotProps) {
  const isFolded = player.status === 'folded'
  const isAllIn = player.status === 'all_in'
  const isOut = player.status === 'out'
  const inHand = player.status !== 'folded' && player.status !== 'out'
  const initial = player.display_name.charAt(0).toUpperCase()

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

  const hasMyCards = isMe && !!cards?.length
  const showCards = inHand && (hasMyCards || !isMe)

  return (
    <div className="flex flex-col items-center relative" style={{ gap: 2 }}>
      {/* Turn indicator */}
      {isActive && (
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          animation: 'arrowBob 0.9s ease-in-out infinite', zIndex: 20,
        }}>
          <svg width="12" height="8" viewBox="0 0 12 8">
            <polygon points="6,8 0,0 12,0" fill="#ffd700"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.9))' }} />
          </svg>
        </div>
      )}

      {/* Cards — small, next to each other above HUD */}
      {showCards && !isMe && (
        <div className="flex" style={{ gap: 2, transform: 'scale(0.65)', transformOrigin: 'bottom center', marginBottom: -4 }}>
          <Card faceDown small />
          <Card faceDown small />
        </div>
      )}

      {/* My cards — larger, shown above my HUD */}
      {showCards && hasMyCards && (
        <div
          className="flex"
          style={{ gap: -4, cursor: onCardTap ? 'pointer' : undefined, marginBottom: -2 }}
          onClick={onCardTap}
        >
          <div style={{ transform: 'rotate(-5deg)', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
            <Card card={cards![0]} mid className="ring-1 ring-emerald-400/40" />
          </div>
          <div style={{ transform: 'rotate(5deg)', marginLeft: -6, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
            <Card card={cards![1]} mid className="ring-1 ring-emerald-400/40" />
          </div>
        </div>
      )}

      {/* ── Compact HUD: horizontal [avatar | info] ── */}
      <div
        className="relative flex items-center rounded-lg transition-all duration-300"
        style={{
          padding: '3px 6px 3px 3px',
          gap: 5,
          background: isMe
            ? 'linear-gradient(135deg, rgba(30,60,40,0.92), rgba(12,20,14,0.96))'
            : 'linear-gradient(135deg, rgba(25,28,32,0.9), rgba(12,14,18,0.96))',
          border: isAllIn
            ? '1.5px solid rgba(255,50,50,0.9)'
            : isActive
            ? '1.5px solid rgba(255,215,0,0.6)'
            : isMe
            ? '1px solid rgba(80,180,100,0.35)'
            : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isActive
            ? '0 0 12px rgba(255,215,0,0.4)'
            : '0 2px 6px rgba(0,0,0,0.5)',
          animation: isOut
            ? 'bustOut 0.8s ease-out forwards'
            : isAllIn
            ? 'allInPulse 1s ease-in-out infinite'
            : isFolded && !foldAnimActive
            ? 'foldSlotFade 0.5s ease-in 0.4s forwards'
            : undefined,
        }}
      >
        {/* Active ring */}
        {isActive && (
          <div className="absolute -inset-[1.5px] rounded-lg animate-pulse"
            style={{ border: '1.5px solid #ffd700', boxShadow: '0 0 6px rgba(255,215,0,0.3)' }} />
        )}

        {/* Countdown bar */}
        {isActive && (
          <div className="absolute top-0 left-1 right-1 h-[1.5px] rounded-full overflow-hidden">
            <div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #4ade80, #22c55e)', animation: 'shrinkBar 15s linear infinite' }} />
          </div>
        )}

        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[13px] shrink-0',
            isMe ? 'font-black' : 'font-bold',
          )}
          style={{
            background: isMe
              ? 'linear-gradient(135deg, #4ade80, #16a34a)'
              : 'linear-gradient(135deg, #3a4550, #1e2830)',
            color: '#fff',
            boxShadow: '0 0 0 1.5px rgba(255,255,255,0.12)',
          }}
        >
          {initial}
        </div>

        {/* Info column: name + chips */}
        <div className="flex flex-col min-w-0" style={{ gap: 0 }}>
          <span className="text-[9px] font-bold truncate leading-tight" style={{
            color: isActive ? '#ffd700' : isMe ? '#a0e0a0' : 'rgba(255,255,255,0.8)',
            maxWidth: 52,
          }}>
            {player.display_name}
          </span>
          <span className="text-[9px] font-mono font-semibold leading-tight" style={{ color: '#5ce65c' }}>
            {player.chips.toLocaleString()}
          </span>
        </div>

        {/* Badges: D / SB / BB / ALL IN */}
        {isDealer && (
          <div className="absolute flex items-center justify-center"
            style={{
              top: -6, right: -6, width: 14, height: 14,
              background: '#e53e3e', borderRadius: 2, rotate: '45deg',
              border: '1px solid #fc8181', boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>
            <span style={{ rotate: '-45deg', color: '#fff', fontSize: 7, fontWeight: 800 }}>D</span>
          </div>
        )}

        {(isBB || isSB) && (
          <div className="absolute text-[7px] font-bold uppercase px-1 rounded-sm"
            style={{
              top: -7, left: '50%', transform: 'translateX(-50%)',
              background: isBB ? '#2a7a8a' : '#3a8a7a', color: '#fff', lineHeight: '12px',
            }}>
            {isBB ? 'BB' : 'SB'}
          </div>
        )}

        {isAllIn && (
          <div className="absolute text-[7px] font-bold uppercase px-1 rounded-sm"
            style={{
              bottom: -7, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #cc0000, #ff3333)', color: '#fff', lineHeight: '12px',
              whiteSpace: 'nowrap',
            }}>
            ALL IN
          </div>
        )}

        {/* Fold overlay */}
        {isFolded && !foldAnimActive && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/40">
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              FOLD
            </span>
          </div>
        )}

        {isOut && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,60,60,0.9)' }}>OUT</span>
          </div>
        )}
      </div>
    </div>
  )
}

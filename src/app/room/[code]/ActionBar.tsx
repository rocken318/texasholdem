// src/app/room/[code]/ActionBar.tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import type { Translations } from '@/lib/i18n'

interface ActionBarProps {
  currentBet: number
  myCurrentBet: number
  myChips: number
  bigBlind: number
  onAction: (action: string, amount?: number) => void
  t: Translations
  disabled?: boolean
  isMyTurn?: boolean
}

export function ActionBar({ currentBet, myCurrentBet, myChips, bigBlind, onAction, t, disabled = false, isMyTurn = true }: ActionBarProps) {
  const toCall = Math.max(0, currentBet - myCurrentBet)
  const canCheck = toCall === 0
  const minRaise = Math.max(currentBet + bigBlind, currentBet * 2)
  const [raiseAmount, setRaiseAmount] = useState(Math.min(minRaise, myChips))
  const [pending, setPending] = useState(false)
  const [pressedAction, setPressedAction] = useState<string | null>(null)

  useEffect(() => {
    if (disabled || !isMyTurn) {
      setPending(false)
      setPressedAction(null)
    }
  }, [disabled, isMyTurn])

  function handleAction(action: string, amount?: number) {
    if (pending || disabled) return
    setPending(true)
    setPressedAction(action)
    onAction(action, amount)
  }

  const isDisabled = pending || disabled || !isMyTurn

  const canRaise = myChips > toCall + bigBlind
  const effectiveCall = Math.min(toCall, myChips)

  // Estimate pot as ~2x current bet for preset calculations (conservative)
  const estimatedPot = Math.max(currentBet * 2, bigBlind * 3)

  const snapTo = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, minRaise), myChips)
    setRaiseAmount(clamped)
  }, [minRaise, myChips])

  const presets: { label: string; value: number }[] = [
    { label: 'Min', value: minRaise },
    { label: '½', value: Math.round(estimatedPot * 0.5 + currentBet) },
    { label: '1x', value: Math.round(estimatedPot + currentBet) },
    { label: '2x', value: Math.round(estimatedPot * 2 + currentBet) },
    { label: 'Max', value: myChips },
  ]

  const sliderPercent = myChips > minRaise
    ? ((raiseAmount - minRaise) / (myChips - minRaise)) * 100
    : 100

  return (
    <div
      className="flex flex-col gap-1 px-2 pt-1.5 pb-2 backdrop-blur-sm"
      style={{
        background: 'linear-gradient(180deg, rgba(8,4,20,0) 0%, rgba(8,4,20,0.7) 30%, rgba(4,2,12,0.95) 100%)',
        borderTop: '1px solid rgba(140,50,255,0.2)',
        opacity: isMyTurn ? 1 : 0.4,
        transition: 'opacity 0.3s ease',
      }}
    >

      {/* ── Raise slider section ── */}
      {canRaise && isMyTurn && (
        <div className="flex flex-col gap-1">
          {/* Preset buttons + amount */}
          <div className="flex items-center gap-1">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => snapTo(p.value)}
                className="flex-1 py-1 rounded-md text-[10px] font-bold tracking-wide transition-colors duration-100"
                style={{
                  background: 'linear-gradient(180deg, rgba(30,15,55,0.9) 0%, rgba(15,8,30,0.95) 100%)',
                  border: '1px solid rgba(140,50,255,0.35)',
                  color: '#d4a0ff',
                }}
              >
                {p.label}
              </button>
            ))}
            <div
              className="min-w-[3.5rem] py-1 px-1.5 rounded-md text-center font-mono text-[11px] font-bold tabular-nums"
              style={{
                background: 'linear-gradient(180deg, #050210 0%, #0a0420 100%)',
                border: '1px solid rgba(180,80,255,0.5)',
                color: '#d4a0ff',
              }}
            >
              {raiseAmount}
            </div>
          </div>

          {/* Custom slider */}
          <div className="relative px-1">
            <div className="slider-track-bg" />
            <div
              className="slider-track-fill"
              style={{ width: `${sliderPercent}%` }}
            />
            <input
              type="range"
              min={minRaise}
              max={myChips}
              value={raiseAmount}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              className="action-slider"
            />
          </div>
        </div>
      )}

      {/* ── Action buttons row ── */}
      <div className="flex gap-1.5">
        {/* Fold */}
        <button
          onClick={() => handleAction('fold')}
          disabled={isDisabled}
          className={`flex-1 h-9 rounded-xl font-bold text-xs tracking-wide
            bg-gradient-to-b from-red-700 to-red-900 text-red-100
            border border-red-600/50 shadow-md shadow-red-900/30
            active:from-red-800 active:to-red-950 active:scale-[0.97]
            transition-all duration-100
            ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
            ${pressedAction === 'fold' ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
        >
          {t.fold}
        </button>

        {/* Check / Call */}
        {canCheck ? (
          <button
            onClick={() => handleAction('check')}
            disabled={isDisabled}
            className={`flex-1 h-9 rounded-xl font-bold text-xs tracking-wide
              bg-gradient-to-b from-teal-500 to-teal-700 text-white
              border border-teal-400/40 shadow-md shadow-teal-900/30
              active:from-teal-600 active:to-teal-800 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'check' ? 'ring-2 ring-teal-300 animate-pulse' : ''}`}
          >
            {t.check}
          </button>
        ) : (
          <button
            onClick={() => handleAction('call')}
            disabled={isDisabled}
            className={`flex-1 h-9 rounded-xl font-bold text-xs tracking-wide flex flex-col items-center justify-center
              bg-gradient-to-b from-sky-500 to-sky-700 text-white
              border border-sky-400/40 shadow-md shadow-sky-900/30
              active:from-sky-600 active:to-sky-800 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'call' ? 'ring-2 ring-sky-300 animate-pulse' : ''}`}
          >
            <span className="leading-none text-[11px]">{t.call}</span>
            <span className="text-[9px] font-mono opacity-90 leading-none">{effectiveCall}</span>
          </button>
        )}

        {/* Raise */}
        {canRaise && (
          <button
            onClick={() => handleAction('raise', raiseAmount)}
            disabled={isDisabled}
            className={`flex-1 h-9 rounded-xl font-bold text-xs tracking-wide flex flex-col items-center justify-center
              bg-gradient-to-b from-amber-400 to-amber-600 text-gray-900
              border border-amber-300/60 shadow-md shadow-amber-900/30
              active:from-amber-500 active:to-amber-700 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'raise' ? 'ring-2 ring-amber-300 animate-pulse' : ''}`}
          >
            <span className="leading-none text-[11px]">{t.raise}</span>
            <span className="text-[9px] font-mono opacity-70 leading-none">{raiseAmount}</span>
          </button>
        )}

        {/* All-In */}
        {myChips > 0 && (
          <button
            onClick={() => handleAction('all_in')}
            disabled={isDisabled}
            className={`h-9 px-3 rounded-xl font-bold text-[10px] tracking-wider uppercase
              bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-500/10
              text-yellow-300 border border-yellow-400/50
              shadow-[0_0_8px_rgba(250,204,21,0.15)]
              active:bg-yellow-400/20 active:border-yellow-300/70 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'all_in' ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}
          >
            {t.allIn}
          </button>
        )}
      </div>
    </div>
  )
}

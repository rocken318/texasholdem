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
}

export function ActionBar({ currentBet, myCurrentBet, myChips, bigBlind, onAction, t, disabled = false }: ActionBarProps) {
  const toCall = Math.max(0, currentBet - myCurrentBet)
  const canCheck = toCall === 0
  const minRaise = Math.max(currentBet + bigBlind, currentBet * 2)
  const [raiseAmount, setRaiseAmount] = useState(Math.min(minRaise, myChips))
  const [pending, setPending] = useState(false)
  const [pressedAction, setPressedAction] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) {
      setPending(false)
      setPressedAction(null)
    }
  }, [disabled])

  function handleAction(action: string, amount?: number) {
    if (pending || disabled) return
    setPending(true)
    setPressedAction(action)
    onAction(action, amount)
  }

  const isDisabled = pending || disabled

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
    <div className="flex flex-col gap-2 px-3 pt-3 pb-4 bg-gradient-to-t from-black/70 via-black/50 to-black/30 border-t border-white/10 backdrop-blur-sm">

      {/* ── Raise slider section ── */}
      {canRaise && (
        <div className="flex flex-col gap-2">
          {/* Preset buttons */}
          <div className="flex items-center gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => snapTo(p.value)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wide
                  bg-white/8 text-purple-200/90 border border-white/10
                  active:bg-purple-500/30 active:border-purple-400/40
                  transition-colors duration-100"
              >
                {p.label}
              </button>
            ))}
            {/* Amount display */}
            <div className="min-w-[4.5rem] py-1.5 px-2 rounded-lg text-center
              bg-black/50 border border-[rgba(180,80,255,0.35)] font-mono text-sm font-bold text-[#d4a0ff] tabular-nums">
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

      {/* ── Pending indicator ── */}
      {(pending || disabled) && (
        <div className="flex items-center justify-center gap-2 py-1">
          <div className={`h-2 w-2 rounded-full animate-pulse ${disabled && !pending ? 'bg-white/25' : 'bg-white/60'}`} />
          <span className={`text-xs font-medium tracking-wide ${disabled && !pending ? 'text-white/30' : 'text-white/60'}`}>
            {pending
              ? (t.fold === 'Fold' ? 'Sending...' : '送信中...')
              : (t.fold === 'Fold' ? 'Waiting for others...' : '他のプレイヤーのターン')}
          </span>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-2">
        {/* Fold */}
        <button
          onClick={() => handleAction('fold')}
          disabled={isDisabled}
          className={`flex-1 min-h-[52px] rounded-2xl font-bold text-sm tracking-wide
            bg-gradient-to-b from-red-700 to-red-900 text-red-100
            border border-red-600/50 shadow-lg shadow-red-900/30
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
            className={`flex-1 min-h-[52px] rounded-2xl font-bold text-sm tracking-wide
              bg-gradient-to-b from-teal-500 to-teal-700 text-white
              border border-teal-400/40 shadow-lg shadow-teal-900/30
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
            className={`flex-1 min-h-[52px] rounded-2xl font-bold text-sm tracking-wide
              bg-gradient-to-b from-sky-500 to-sky-700 text-white
              border border-sky-400/40 shadow-lg shadow-sky-900/30
              active:from-sky-600 active:to-sky-800 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'call' ? 'ring-2 ring-sky-300 animate-pulse' : ''}`}
          >
            <span className="block leading-tight">{t.call}</span>
            <span className="block text-xs font-mono opacity-90">{effectiveCall}</span>
          </button>
        )}

        {/* Raise */}
        {canRaise && (
          <button
            onClick={() => handleAction('raise', raiseAmount)}
            disabled={isDisabled}
            className={`flex-1 min-h-[52px] rounded-2xl font-bold text-sm tracking-wide
              bg-gradient-to-b from-amber-400 to-amber-600 text-gray-900
              border border-amber-300/60 shadow-lg shadow-amber-900/30
              active:from-amber-500 active:to-amber-700 active:scale-[0.97]
              transition-all duration-100
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
              ${pressedAction === 'raise' ? 'ring-2 ring-amber-300 animate-pulse' : ''}`}
          >
            <span className="block leading-tight">{t.raise}</span>
            <span className="block text-xs font-mono opacity-70">{raiseAmount}</span>
          </button>
        )}
      </div>

      {/* ── All-In ── */}
      {myChips > 0 && (
        <button
          onClick={() => handleAction('all_in')}
          disabled={isDisabled}
          className={`w-full min-h-[44px] rounded-2xl font-bold text-sm tracking-wider uppercase
            bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-500/10
            text-yellow-300 border border-yellow-400/50
            shadow-[0_0_12px_rgba(250,204,21,0.15)]
            active:bg-yellow-400/20 active:border-yellow-300/70 active:scale-[0.98]
            transition-all duration-100
            ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
            ${pressedAction === 'all_in' ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}
        >
          {t.allIn}
          <span className="ml-2 font-mono text-yellow-200/80">{myChips}</span>
        </button>
      )}
    </div>
  )
}

// src/app/room/[code]/ActionBar.tsx
'use client'
import { useState } from 'react'

interface ActionBarProps {
  currentBet: number
  myCurrentBet: number
  myChips: number
  bigBlind: number
  onAction: (action: string, amount?: number) => void
}

export function ActionBar({ currentBet, myCurrentBet, myChips, bigBlind, onAction }: ActionBarProps) {
  const toCall = Math.max(0, currentBet - myCurrentBet)
  const canCheck = toCall === 0
  const minRaise = Math.max(currentBet + bigBlind, currentBet * 2)
  const [raiseAmount, setRaiseAmount] = useState(Math.min(minRaise, myChips))

  return (
    <div className="flex flex-col gap-2 p-3 bg-black/30">
      {myChips > toCall && (
        <div className="flex items-center gap-2 text-white text-sm">
          <span className="w-12 text-right text-xs">Raise</span>
          <input
            type="range"
            className="flex-1"
            min={minRaise}
            max={myChips}
            value={raiseAmount}
            onChange={e => setRaiseAmount(Number(e.target.value))}
          />
          <span className="w-14 text-right font-mono text-sm">{raiseAmount}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onAction('fold')}
          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm"
        >
          Fold
        </button>

        {canCheck ? (
          <button
            onClick={() => onAction('check')}
            className="flex-1 py-3 rounded-xl bg-gray-600 text-white font-bold text-sm"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction('call')}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
          >
            Call {Math.min(toCall, myChips)}
          </button>
        )}

        {myChips > toCall + bigBlind && (
          <button
            onClick={() => onAction('raise', raiseAmount)}
            className="flex-1 py-3 rounded-xl bg-yellow-500 text-gray-900 font-bold text-sm"
          >
            Raise
          </button>
        )}
      </div>

      {myChips > 0 && (
        <button
          onClick={() => onAction('all_in')}
          className="w-full py-2 rounded-xl border border-yellow-400 text-yellow-400 font-bold text-sm"
        >
          All In ({myChips})
        </button>
      )}
    </div>
  )
}

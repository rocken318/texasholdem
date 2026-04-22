// src/app/room/[code]/TurnTimer.tsx
'use client'
import { useEffect, useState } from 'react'

export function TurnTimer({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  // hooks must be unconditional — early return is below all hooks
  useEffect(() => {
    if (seconds === 0) return  // no-timer mode
    if (remaining <= 0) { onTimeout(); return }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining, seconds, onTimeout])

  if (seconds === 0) return null

  const pct = (remaining / seconds) * 100
  const color = pct > 50 ? 'bg-purple-400' : pct > 25 ? 'bg-fuchsia-400' : 'bg-red-500'

  return (
    <div className="w-full h-1.5 bg-white/10">
      <div
        className={`h-full transition-all duration-1000 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

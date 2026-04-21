// src/app/room/[code]/ResultView.tsx
'use client'
import { useRouter } from 'next/navigation'
import type { Translations } from '@/lib/i18n'

interface ResultViewProps {
  rankings: { playerId: string; displayName: string; chips: number; rank: number }[]
  t: Translations
}

export function ResultView({ rankings, t }: ResultViewProps) {
  const router = useRouter()
  const medals = ['🥇', '🥈', '🥉']

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold text-white">{t.gameOver}</h1>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {rankings.map(r => (
          <div key={r.playerId} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-white">
            <span className="text-2xl">{medals[r.rank - 1] ?? `#${r.rank}`}</span>
            <span className="font-semibold flex-1">{r.displayName}</span>
            <span className="font-mono text-green-300">{r.chips}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push('/')}
        className="mt-4 px-8 py-3 rounded-xl bg-white text-green-900 font-bold text-lg"
      >
        {t.newGame}
      </button>
    </main>
  )
}

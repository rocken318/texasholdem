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

  const rankStyles: Record<number, { border: string; bg: string; badge: string; badgeText: string; glow: string }> = {
    1: {
      border: 'border-[#D4AF37]/60',
      bg: 'bg-gradient-to-r from-[#D4AF37]/15 to-[#D4AF37]/5',
      badge: 'bg-gradient-to-br from-[#F5D060] to-[#D4AF37]',
      badgeText: 'text-[#1a1a0a]',
      glow: 'shadow-[0_0_30px_rgba(212,175,55,0.2)]',
    },
    2: {
      border: 'border-[#C0C0C0]/40',
      bg: 'bg-gradient-to-r from-[#C0C0C0]/10 to-transparent',
      badge: 'bg-gradient-to-br from-[#E8E8E8] to-[#A0A0A0]',
      badgeText: 'text-[#1a1a1a]',
      glow: '',
    },
    3: {
      border: 'border-[#CD7F32]/40',
      bg: 'bg-gradient-to-r from-[#CD7F32]/10 to-transparent',
      badge: 'bg-gradient-to-br from-[#E8A862] to-[#CD7F32]',
      badgeText: 'text-[#1a1a1a]',
      glow: '',
    },
  }

  const defaultStyle = {
    border: 'border-white/10',
    bg: 'bg-white/[0.03]',
    badge: 'bg-white/10',
    badgeText: 'text-white/60',
    glow: '',
  }

  return (
    <main className="min-h-screen bg-[#0a1a0a] flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3d1a_0%,_#0d1f0d_50%,_#060e06_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 text-[#D4AF37]/30 text-xl select-none mb-3">
            <span>&#9824;</span>
            <span>&#9829;</span>
            <span>&#9830;</span>
            <span>&#9827;</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{t.gameOver}</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
            <span className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase">Final standings</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
          </div>
        </div>

        {/* Rankings */}
        <div className="w-full flex flex-col gap-3">
          {rankings.map(r => {
            const style = rankStyles[r.rank] ?? defaultStyle
            return (
              <div
                key={r.playerId}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 border ${style.border} ${style.bg} ${style.glow} transition-all duration-300`}
              >
                {/* Rank badge */}
                <div className={`w-9 h-9 rounded-full ${style.badge} flex items-center justify-center font-bold text-sm ${style.badgeText} shrink-0`}>
                  {r.rank}
                </div>
                <span className={`font-semibold flex-1 ${r.rank === 1 ? 'text-[#F5D060]' : 'text-white'}`}>
                  {r.displayName}
                </span>
                <span className="font-mono text-[#5ce65c] font-semibold">{r.chips.toLocaleString()}</span>
              </div>
            )
          })}
        </div>

        {/* New Game button */}
        <button
          onClick={() => router.push('/create')}
          className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5D060] to-[#D4AF37] text-[#1a1a0a] font-bold text-lg shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
        >
          {t.newGame}
        </button>
      </div>
    </main>
  )
}

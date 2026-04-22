// src/app/room/[code]/ResultView.tsx
'use client'
import { useRouter } from 'next/navigation'
import type { Translations } from '@/lib/i18n'

interface ResultViewProps {
  rankings: { playerId: string; displayName: string; chips: number; rank: number }[]
  t: Translations
}

// 8 confetti pieces with varied colours and positions
const CONFETTI = [
  { left: '8%',  color: '#F5D060', delay: '0.0s', dur: '2.2s' },
  { left: '18%', color: '#ff6b6b', delay: '0.3s', dur: '2.6s' },
  { left: '28%', color: '#7ee8a2', delay: '0.15s', dur: '2.0s' },
  { left: '38%', color: '#80d4f5', delay: '0.5s', dur: '2.4s' },
  { left: '52%', color: '#f5a623', delay: '0.1s', dur: '2.8s' },
  { left: '64%', color: '#d4a0ff', delay: '0.4s', dur: '2.1s' },
  { left: '76%', color: '#F5D060', delay: '0.25s', dur: '2.5s' },
  { left: '88%', color: '#ff6b6b', delay: '0.6s', dur: '2.3s' },
]

export function ResultView({ rankings, t }: ResultViewProps) {
  const router = useRouter()

  const buttonDelay = `${rankings.length * 150 + 400}ms`

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden"
      style={{ animation: 'bgPulse 4s ease-in-out infinite' }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3d1a_0%,_#0d1f0d_50%,_#060e06_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">

        {/* ── Title ── */}
        <div className="text-center" style={{ animation: 'titleDrop 0.7s cubic-bezier(0.22,1,0.36,1) both' }}>
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_24px_rgba(212,175,55,0.5)]">
            {t.gameOver.toUpperCase()}
          </h1>

          {/* Suit symbols — slide in from sides after 0.4s */}
          <div
            className="flex items-center justify-center gap-3 mt-3"
            style={{ animation: 'titleDrop 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both' }}
          >
            <span style={{ color: '#C0C0C0', fontSize: '1.1rem', animation: 'suitSlideLeft 0.5s cubic-bezier(0.22,1,0.36,1) 0.4s both' }}>&#9824;</span>
            <span style={{ color: '#D4AF37', fontSize: '1.1rem', animation: 'suitSlideLeft 0.5s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>&#9829;</span>
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
            <span className="text-[#D4AF37]/70 text-[0.6rem] tracking-[0.35em] uppercase font-semibold">Final Standings</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
            <span style={{ color: '#D4AF37', fontSize: '1.1rem', animation: 'suitSlideRight 0.5s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>&#9830;</span>
            <span style={{ color: '#C0C0C0', fontSize: '1.1rem', animation: 'suitSlideRight 0.5s cubic-bezier(0.22,1,0.36,1) 0.4s both' }}>&#9827;</span>
          </div>
        </div>

        {/* ── Rankings ── */}
        <div className="w-full flex flex-col gap-3">
          {rankings.map((r, i) => {
            const isFirst = r.rank === 1
            const delay = `${i * 150}ms`

            // Rank badge style
            let badgeStyle: React.CSSProperties = {}
            let rowBorderClass = 'border-white/10'
            let rowBgClass = 'bg-white/[0.03]'
            let rowGlow = ''
            let nameColor = 'text-white'

            if (r.rank === 1) {
              badgeStyle = { background: 'linear-gradient(135deg, #F5D060, #D4AF37)', color: '#1a1a0a', boxShadow: '0 0 12px rgba(212,175,55,0.6)' }
              rowBorderClass = 'border-[#D4AF37]/60'
              rowBgClass = 'bg-gradient-to-r from-[#D4AF37]/15 to-[#D4AF37]/5'
              rowGlow = '0 0 30px rgba(212,175,55,0.25)'
              nameColor = 'text-[#F5D060]'
            } else if (r.rank === 2) {
              badgeStyle = { background: 'linear-gradient(135deg, #E8E8E8, #A0A0A0)', color: '#1a1a1a' }
              rowBorderClass = 'border-[#C0C0C0]/40'
              rowBgClass = 'bg-gradient-to-r from-[#C0C0C0]/10 to-transparent'
            } else if (r.rank === 3) {
              badgeStyle = { background: 'linear-gradient(135deg, #E8A862, #CD7F32)', color: '#1a1a1a' }
              rowBorderClass = 'border-[#CD7F32]/40'
              rowBgClass = 'bg-gradient-to-r from-[#CD7F32]/10 to-transparent'
            } else {
              badgeStyle = { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
            }

            return (
              <div key={r.playerId} style={{ animation: `rankSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay} both` }}>
                {/* Champion badge above rank-1 row */}
                {isFirst && (
                  <div
                    className="flex items-center justify-center mb-1"
                    style={{ animation: `rankSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay} both` }}
                  >
                    <span
                      className="text-xs font-black tracking-[0.3em] uppercase px-3 py-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #D4AF37, #F5D060, #D4AF37)',
                        color: '#1a1a0a',
                        boxShadow: '0 0 14px rgba(212,175,55,0.5)',
                        animation: 'goldBorderPulse 2s ease-in-out infinite',
                      }}
                    >
                      👑 CHAMPION
                    </span>
                  </div>
                )}

                {/* Player row */}
                <div
                  className={`relative flex items-center gap-3 rounded-xl px-4 py-3.5 border ${rowBorderClass} ${rowBgClass} transition-all duration-300 overflow-hidden`}
                  style={{
                    boxShadow: isFirst ? `${rowGlow}, 0 0 0 1.5px rgba(212,175,55,0.3)` : undefined,
                    animation: isFirst ? 'goldBorderPulse 2.5s ease-in-out infinite' : undefined,
                  }}
                >
                  {/* Confetti layer for 1st place */}
                  {isFirst && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      {CONFETTI.map((c, ci) => (
                        <div
                          key={ci}
                          style={{
                            position: 'absolute',
                            left: c.left,
                            top: '-6px',
                            width: '5px',
                            height: '10px',
                            borderRadius: '2px',
                            background: c.color,
                            opacity: 0.75,
                            animation: `confettiFall ${c.dur} ${c.delay} ease-in infinite`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Rank badge */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 relative z-10"
                    style={badgeStyle}
                  >
                    {r.rank}
                  </div>

                  {/* Name */}
                  <span className={`font-semibold flex-1 relative z-10 ${nameColor}`}>
                    {r.displayName}
                  </span>

                  {/* Chip count */}
                  <div
                    className="flex items-center gap-1 relative z-10"
                    style={isFirst ? { animation: 'chipCountEntrance 0.8s cubic-bezier(0.22,1,0.36,1) both' } : undefined}
                  >
                    {/* Chip SVG icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="7" cy="7" r="6.5" stroke="#D4AF37" strokeWidth="1" fill="rgba(212,175,55,0.15)" />
                      <circle cx="7" cy="7" r="4" stroke="#D4AF37" strokeWidth="0.75" fill="rgba(212,175,55,0.1)" />
                      <text x="7" y="10.5" textAnchor="middle" fontSize="6" fill="#D4AF37" fontWeight="bold">◈</text>
                    </svg>
                    <span
                      className="font-mono font-semibold"
                      style={{ color: isFirst ? '#F5D060' : '#5ce65c' }}
                    >
                      {r.chips.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── New Game button ── */}
        <button
          onClick={() => router.push('/create')}
          className="mt-2 w-full py-3.5 rounded-xl font-black text-lg text-[#1a1a0a] active:scale-[0.97] transition-transform duration-100"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #F5D060, #D4AF37)',
            backgroundSize: '200% 100%',
            boxShadow: '0 0 24px rgba(212,175,55,0.4), 0 4px 16px rgba(0,0,0,0.4)',
            animation: `btnEntrance 0.6s cubic-bezier(0.22,1,0.36,1) ${buttonDelay} both, btnPulse 2.5s ease-in-out ${buttonDelay} infinite`,
          }}
        >
          {t.newGame}
        </button>
      </div>
    </main>
  )
}

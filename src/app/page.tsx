// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/hooks/useLanguage'

export default function Home() {
  const [code, setCode] = useState('')
  const router = useRouter()
  const { t, toggleLang } = useLanguage()

  return (
    <main className="min-h-screen bg-[#0a1a0a] flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3d1a_0%,_#0d1f0d_50%,_#060e06_100%)]" />

      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />

      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 text-[#D4AF37]/70 text-sm hover:border-[#D4AF37]/60 hover:text-[#D4AF37] transition-all duration-200"
      >
        {t.switchLang}
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Decorative suits top */}
        <div className="flex items-center gap-3 text-[#D4AF37]/20 text-2xl select-none">
          <span>&#9824;</span>
          <span>&#9829;</span>
          <span>&#9830;</span>
          <span>&#9827;</span>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Texas Hold&apos;em
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
            <span className="text-[#D4AF37] text-sm font-medium tracking-[0.3em] uppercase">Poker</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
          </div>
        </div>

        {/* Decorative suits bottom */}
        <div className="flex items-center gap-3 text-[#D4AF37]/20 text-2xl select-none">
          <span>&#9827;</span>
          <span>&#9830;</span>
          <span>&#9829;</span>
          <span>&#9824;</span>
        </div>

        {/* Code input and buttons */}
        <div className="flex flex-col gap-4 w-full">
          <div className="relative">
            <input
              className="w-full px-5 py-4 rounded-xl text-center text-3xl font-mono uppercase tracking-[0.4em] border border-[#D4AF37]/30 bg-black/40 text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/70 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all duration-300 backdrop-blur-sm"
              placeholder={t.enterCode}
              value={code}
              maxLength={6}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && code.length === 6 && router.push(`/room/${code}`)}
            />
            <div className="absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent" />
          </div>

          <button
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5D060] to-[#D4AF37] text-[#1a1a0a] font-bold text-lg shadow-lg shadow-[#D4AF37]/20 disabled:opacity-30 disabled:shadow-none hover:shadow-[#D4AF37]/40 hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
            disabled={code.length !== 6}
            onClick={() => router.push(`/room/${code}`)}
          >
            {t.joinGame}
          </button>

          <button
            className="w-full py-3.5 rounded-xl border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-lg hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/60 transition-all duration-200 active:scale-[0.98]"
            onClick={() => router.push('/create')}
          >
            {t.createRoom}
          </button>
        </div>
      </div>
    </main>
  )
}

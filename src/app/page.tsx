// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [code, setCode] = useState('')
  const router = useRouter()

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold text-white">♠ Texas Hold&apos;em</h1>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          className="w-full px-4 py-3 rounded-xl text-center text-2xl font-mono uppercase tracking-widest border-2 border-white/30 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white"
          placeholder="ENTER CODE"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && code.length === 6 && router.push(`/room/${code}`)}
        />
        <button
          className="w-full py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40"
          disabled={code.length !== 6}
          onClick={() => router.push(`/room/${code}`)}
        >
          Join Game
        </button>
        <button
          className="w-full py-3 rounded-xl border-2 border-white/40 text-white font-bold text-lg"
          onClick={() => router.push('/create')}
        >
          Create Room
        </button>
      </div>
    </main>
  )
}

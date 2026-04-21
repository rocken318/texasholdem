// src/app/create/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomSettings } from '@/types/domain'

const DEFAULTS: RoomSettings = {
  maxPlayers: 6, startingChips: 1000, smallBlind: 10, bigBlind: 20,
  turnTimerSec: 30, anteEnabled: false, anteAmount: 0,
}

export default function CreatePage() {
  const router = useRouter()
  const [format, setFormat] = useState<'cash' | 'tournament'>('cash')
  const [settings, setSettings] = useState<RoomSettings>(DEFAULTS)
  const [name, setName] = useState('')
  const [asPlayer, setAsPlayer] = useState(true)
  const [loading, setLoading] = useState(false)

  function update(key: keyof RoomSettings, val: number | boolean) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function handleCreate() {
    if (!name.trim()) { alert('Enter your name'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, settings }),
      })
      const { room, hostPlayerId } = await res.json()

      if (asPlayer) {
        await fetch(`/api/rooms/${room.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: name, isHost: true, playerId: hostPlayerId }),
        })
      }

      localStorage.setItem(`texasholdem_host_${room.join_code}`, hostPlayerId)
      localStorage.setItem(`texasholdem_player_${room.id}`, JSON.stringify({ playerId: hostPlayerId, displayName: name }))
      router.push(`/room/${room.join_code}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-green-900 p-6 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-white mt-4">Create Room</h1>

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-5 flex flex-col gap-4 text-white">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Your name</span>
          <input className="px-3 py-2 rounded-lg bg-white/20 placeholder-white/40 focus:outline-none"
            placeholder="Display name" value={name} maxLength={20}
            onChange={e => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Format</span>
          <div className="flex gap-2">
            {(['cash', 'tournament'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-lg font-semibold capitalize ${format === f ? 'bg-white text-green-900' : 'border border-white/40'}`}>
                {f}
              </button>
            ))}
          </div>
        </label>

        <NumberSetting label="Max Players" value={settings.maxPlayers} min={2} max={9} onChange={v => update('maxPlayers', v)} />
        <NumberSetting label="Starting Chips" value={settings.startingChips} min={100} max={100000} step={100} onChange={v => update('startingChips', v)} />
        <NumberSetting label="Small Blind" value={settings.smallBlind} min={1} max={1000} onChange={v => update('smallBlind', v)} />
        <NumberSetting label="Big Blind" value={settings.bigBlind} min={2} max={2000} onChange={v => update('bigBlind', v)} />
        <NumberSetting label="Turn Timer (sec)" value={settings.turnTimerSec} min={10} max={60} onChange={v => update('turnTimerSec', v)} />

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={asPlayer} onChange={e => setAsPlayer(e.target.checked)}
            className="w-5 h-5 rounded" />
          <span className="text-sm font-semibold">Join as player (not just host)</span>
        </label>

        <button onClick={handleCreate} disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold text-lg disabled:opacity-40">
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </main>
  )
}

function NumberSetting({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} className="flex-1" />
        <span className="w-14 text-right font-mono">{value}</span>
      </div>
    </label>
  )
}

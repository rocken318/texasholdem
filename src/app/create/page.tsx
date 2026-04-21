// src/app/create/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomSettings } from '@/types/domain'
import { useLanguage } from '@/lib/hooks/useLanguage'

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
  const { t, toggleLang } = useLanguage()

  function update(key: keyof RoomSettings, val: number | boolean) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function handleCreate() {
    if (!name.trim()) { alert(t.enterYourName); return }
    setLoading(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, settings }),
      })
      if (!res.ok) throw new Error(await getApiError(res))
      const { room, hostPlayerId } = await res.json()

      if (asPlayer) {
        const playerRes = await fetch(`/api/rooms/${room.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: name, isHost: true, playerId: hostPlayerId }),
        })
        if (!playerRes.ok) throw new Error(await getApiError(playerRes))
      }

      localStorage.setItem(`texasholdem_host_${room.join_code}`, hostPlayerId)
      localStorage.setItem(`texasholdem_player_${room.id}`, JSON.stringify({ playerId: hostPlayerId, displayName: name }))
      router.push(`/room/${room.join_code}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-green-900 p-6 flex flex-col items-center gap-6">
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 px-3 py-1 rounded-lg border border-white/30 text-white/70 text-sm"
      >
        {t.switchLang}
      </button>

      <h1 className="text-3xl font-bold text-white mt-4">{t.createRoomTitle}</h1>

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-5 flex flex-col gap-4 text-white">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{t.yourName}</span>
          <input className="px-3 py-2 rounded-lg bg-white/20 placeholder-white/40 focus:outline-none"
            placeholder={t.displayName} value={name} maxLength={20}
            onChange={e => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{t.format}</span>
          <div className="flex gap-2">
            {(['cash', 'tournament'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-lg font-semibold ${format === f ? 'bg-white text-green-900' : 'border border-white/40'}`}>
                {f === 'cash' ? t.cash : t.tournament}
              </button>
            ))}
          </div>
        </label>

        <NumberSetting label={t.maxPlayers} value={settings.maxPlayers} min={2} max={9} onChange={v => update('maxPlayers', v)} />
        <NumberSetting label={t.startingChips} value={settings.startingChips} min={100} max={100000} step={100} onChange={v => update('startingChips', v)} />
        <NumberSetting label={t.smallBlind} value={settings.smallBlind} min={1} max={1000} onChange={v => update('smallBlind', v)} />
        <NumberSetting label={t.bigBlind} value={settings.bigBlind} min={2} max={2000} onChange={v => update('bigBlind', v)} />
        <NumberSetting label={t.turnTimerSec} value={settings.turnTimerSec} min={10} max={60} onChange={v => update('turnTimerSec', v)} />

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={asPlayer} onChange={e => setAsPlayer(e.target.checked)}
            className="w-5 h-5 rounded" />
          <span className="text-sm font-semibold">{t.joinAsPlayer}</span>
        </label>

        <button onClick={handleCreate} disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold text-lg disabled:opacity-40">
          {loading ? t.creating : t.createRoomTitle}
        </button>
      </div>
    </main>
  )
}

async function getApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({})) as { error?: string }
  return body.error ?? `Error ${res.status}`
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

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
    <main className="min-h-screen bg-[#0a1a0a] p-6 flex flex-col items-center gap-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3d1a_0%,_#0d1f0d_50%,_#060e06_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />

      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 text-[#D4AF37]/70 text-sm hover:border-[#D4AF37]/60 hover:text-[#D4AF37] transition-all duration-200"
      >
        {t.switchLang}
      </button>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm mt-4">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.createRoomTitle}</h1>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
            <span className="text-[#D4AF37]/50 text-xs">&#9824; &#9829; &#9830; &#9827;</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
          </div>
        </div>

        {/* Form card */}
        <div className="w-full rounded-2xl border border-[#D4AF37]/15 bg-black/30 backdrop-blur-sm p-5 flex flex-col gap-5 text-white">
          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">{t.yourName}</span>
            <input
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 placeholder-white/25 text-white focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.08] transition-all duration-200"
              placeholder={t.displayName}
              value={name}
              maxLength={20}
              onChange={e => setName(e.target.value)}
            />
          </label>

          {/* Format */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">{t.format}</span>
            <div className="flex gap-2">
              {(['cash', 'tournament'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    format === f
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5D060] text-[#1a1a0a] shadow-md shadow-[#D4AF37]/20'
                      : 'border border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
                  }`}
                >
                  {f === 'cash' ? t.cash : t.tournament}
                </button>
              ))}
            </div>
          </label>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Settings */}
          <NumberSetting label={t.maxPlayers} value={settings.maxPlayers} min={2} max={9} onChange={v => update('maxPlayers', v)} />
          <NumberSetting label={t.startingChips} value={settings.startingChips} min={100} max={100000} step={100} onChange={v => update('startingChips', v)} />
          <NumberSetting label={t.smallBlind} value={settings.smallBlind} min={1} max={1000} onChange={v => update('smallBlind', v)} />
          <NumberSetting label={t.bigBlind} value={settings.bigBlind} min={2} max={2000} onChange={v => update('bigBlind', v)} />
          <TimerSetting label={t.turnTimerSec} value={settings.turnTimerSec} onChange={v => update('turnTimerSec', v)} />

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Join as player checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={asPlayer}
                onChange={e => setAsPlayer(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border border-white/20 bg-white/[0.06] peer-checked:bg-[#D4AF37] peer-checked:border-[#D4AF37] transition-all duration-200 flex items-center justify-center">
                {asPlayer && (
                  <svg className="w-3 h-3 text-[#1a1a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-white/70 group-hover:text-white/90 transition-colors">{t.joinAsPlayer}</span>
          </label>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5D060] to-[#D4AF37] text-[#1a1a0a] font-bold text-lg shadow-lg shadow-[#D4AF37]/20 disabled:opacity-30 disabled:shadow-none hover:shadow-[#D4AF37]/40 hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? t.creating : t.createRoomTitle}
          </button>
        </div>
      </div>
    </main>
  )
}

async function getApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({})) as { error?: string }
  return body.error ?? `Error ${res.status}`
}

function TimerSetting({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  // 0 = no limit, 10-60 = seconds
  const steps = [0, 10, 15, 20, 30, 45, 60]
  const stepIndex = steps.indexOf(value) >= 0 ? steps.indexOf(value) : 3
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-mono text-[#D4AF37] font-semibold">
          {value === 0 ? '∞ なし' : `${value}s`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={stepIndex}
        onChange={e => onChange(steps[Number(e.target.value)])}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#D4AF37] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,175,55,0.4)]"
      />
      <div className="flex justify-between text-[10px] text-white/30 px-0.5">
        {steps.map(s => <span key={s}>{s === 0 ? '∞' : s}</span>)}
      </div>
    </label>
  )
}

function NumberSetting({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-mono text-[#D4AF37] font-semibold">{value.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#D4AF37] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,175,55,0.4)]"
      />
    </label>
  )
}

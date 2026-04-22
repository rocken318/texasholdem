// src/app/room/[code]/RoomClient.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRoomStream } from '@/lib/hooks/useRoomStream'
import { useLocalPlayer } from '@/lib/hooks/useLocalPlayer'
import { useLanguage } from '@/lib/hooks/useLanguage'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { PokerEvent } from '@/lib/events/types'
import { LobbyView } from './LobbyView'
import { GameView } from './GameView'
import { ResultView } from './ResultView'
import type { ShowdownResult } from './HandResultOverlay'

interface RoomClientProps {
  initialRoom: Room
}

type ViewState = 'name_input' | 'lobby' | 'playing' | 'finished'

export function RoomClient({ initialRoom }: RoomClientProps) {
  const [room] = useState(initialRoom)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [hand, setHand] = useState<Hand | null>(null)
  const [myCards, setMyCards] = useState<PokerCard[]>([])
  const [myHandCurrentBet, setMyHandCurrentBet] = useState(0)
  const [tableBets, setTableBets] = useState<Record<string, number>>({})
  const [lastAction, setLastAction] = useState<{ playerId: string; action: string; amount: number } | null>(null)
  const [currentSeat, setCurrentSeat] = useState<number | null>(null)
  const [view, setView] = useState<ViewState>(initialRoom.status === 'finished' ? 'finished' : 'name_input')
  const [name, setName] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [rankings, setRankings] = useState<{ playerId: string; displayName: string; chips: number; rank: number }[]>([])
  const [showdownResults, setShowdownResults] = useState<ShowdownResult[]>([])
  const [handResult, setHandResult] = useState<{ winnerIds: string[]; pot: number } | null>(null)
  const [botIds, setBotIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    const stored = localStorage.getItem(`texasholdem_bots_${initialRoom.id}`)
    return new Set(stored ? (JSON.parse(stored) as string[]) : [])
  })
  const { t, toggleLang } = useLanguage()

  // Refs for use inside SSE event handler closures
  const handRef = useRef<Hand | null>(null)
  const playersRef = useRef<Player[]>([])
  const botIdsRef = useRef(botIds)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const handResultRef = useRef<{ winnerIds: string[]; pot: number } | null>(null)
  const pendingHandStartRef = useRef<(PokerEvent & { type: 'hand_started' }) | null>(null)

  // Keep refs in sync
  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { handRef.current = hand }, [hand])
  useEffect(() => { botIdsRef.current = botIds }, [botIds])
  useEffect(() => { handResultRef.current = handResult }, [handResult])

  const { getPlayer, savePlayer } = useLocalPlayer(room.id)
  const hostPlayerId = typeof window !== 'undefined'
    ? localStorage.getItem(`texasholdem_host_${room.join_code}`)
    : null

  useEffect(() => {
    const saved = getPlayer()
    if (!saved) return
    fetch(`/api/rooms/${room.id}/players`)
      .then(r => r.json())
      .then(async ({ players: ps }: { players: Player[] }) => {
        setPlayers(ps)
        const me = ps.find(p => p.id === saved.playerId)
        if (!me) return
        setMyPlayer(me)
        if (room.status === 'playing') {
          setView('playing')
          // Restore current hand state so the board isn't blank on re-entry
          const res = await fetch(`/api/rooms/${room.id}/current-hand`)
          if (!res.ok) return
          const data = await res.json() as {
            hand: (Omit<Hand, 'deck' | 'winner_ids'> & { winner_ids?: null }) | null
            tableBets: Record<string, number>
            handPlayers: { player_id: string; current_bet: number; total_bet: number; status: string }[]
          }
          if (!data.hand) return
          setHand({ ...data.hand, deck: [], winner_ids: null } as Hand)
          setTableBets(data.tableBets)
          setCurrentSeat(data.hand.current_seat)
          const myHp = data.handPlayers.find(hp => hp.player_id === me.id)
          if (myHp) setMyHandCurrentBet(myHp.current_bet)
        } else {
          setView('lobby')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bot action trigger (host-only): asks Gemini 2.5 Flash then executes
  const triggerBotAction = useCallback(async (playerId: string) => {
    const safeFallback = handRef.current?.current_bet === 0 ? 'check' : 'fold'
    let action = safeFallback
    let amount: number | undefined

    try {
      const aiRes = await fetch(`/api/rooms/${room.id}/ai-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPlayerId: playerId }),
      })
      if (aiRes.ok) {
        const data = await aiRes.json() as { action?: string; amount?: number }
        if (data.action) {
          action = data.action
          amount = data.amount
        }
      }
    } catch {
      // network error — use fallback
    }

    try {
      await fetch(`/api/rooms/${room.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action, amount }),
      })
    } catch {
      console.error('[bot] action submit failed for', playerId)
    }
  }, [room.id])

  useRoomStream(room.id, (event: PokerEvent) => {
    if (event.type === 'player_joined') {
      setPlayers(ps => ps.some(p => p.id === event.player.id) ? ps : [...ps, event.player])
    }
    if (event.type === 'player_left') {
      setPlayers(ps => ps.filter(p => p.id !== event.playerId))
    }
    if (event.type === 'game_started') {
      setPlayers(event.players)
      setView('playing')
    }
    if (event.type === 'hand_started') {
      // If the hand result overlay is currently showing, buffer this event and
      // apply it after the overlay is dismissed to avoid immediately clearing it.
      if (handResultRef.current !== null) {
        pendingHandStartRef.current = event
        return
      }
      setTableBets({})
      setLastAction(null)
      setHandResult(null)
      setShowdownResults([])
      // Always create a fresh hand object — even if hand is currently null
      setHand({
        id: event.handId,
        room_id: room.id,
        hand_number: event.handNumber,
        dealer_seat: event.dealerSeat,
        community_cards: [],
        pot: 0,
        side_pots: [],
        street: 'preflop',
        current_seat: null,
        current_bet: 0,
        deck: [],
        winner_ids: null,
        started_at: Date.now(),
        finished_at: null,
      })
      setMyCards([])
      setMyHandCurrentBet(0)
      setCurrentSeat(null)
    }
    if (event.type === 'blinds_posted') {
      setHand(h => h ? { ...h, pot: event.pot, current_bet: event.bbAmount } : h)
      setTableBets({ [event.sbPlayerId]: event.sbAmount, [event.bbPlayerId]: event.bbAmount })
      // Track my current bet if I posted a blind
      setMyPlayer(me => {
        if (!me) return me
        if (me.id === event.bbPlayerId) setMyHandCurrentBet(event.bbAmount)
        else if (me.id === event.sbPlayerId) setMyHandCurrentBet(event.sbAmount)
        return me
      })
    }
    if (event.type === 'turn_started') {
      setCurrentSeat(event.seatIndex)
      // Auto-act for bots (host only)
      if (hostPlayerId && botIdsRef.current.has(event.playerId)) {
        const delay = 600 + Math.random() * 1200
        setTimeout(() => triggerBotAction(event.playerId), delay)
      }
    }
    if (event.type === 'community_dealt') {
      setHand(h => h ? { ...h, community_cards: event.cards, street: event.street as Hand['street'], current_bet: 0 } : h)
      setMyHandCurrentBet(0)
      setTableBets({})
    }
    if (event.type === 'player_action') {
      setHand(h => h ? { ...h, pot: event.pot, current_bet: event.currentBet } : h)
      setLastAction({ playerId: event.playerId, action: event.action, amount: event.amount })
      if (event.action !== 'fold' && event.action !== 'check') {
        setTableBets(prev => ({
          ...prev,
          [event.playerId]: (prev[event.playerId] ?? 0) + event.amount,
        }))
      }
      // If this was my action, update my current bet
      setMyPlayer(me => {
        if (!me) return me
        if (me.id === event.playerId) {
          if (event.action === 'call') setMyHandCurrentBet(prev => prev + event.amount)
          else if (event.action === 'raise') setMyHandCurrentBet(event.currentBet)
          else if (event.action === 'all_in') setMyHandCurrentBet(prev => prev + event.amount)
        }
        return me
      })
    }
    if (event.type === 'chips_updated') {
      setPlayers(ps => ps.map(p => {
        const upd = event.players.find(u => u.id === p.id)
        return upd ? { ...p, chips: upd.chips } : p
      }))
      setMyPlayer(me => {
        if (!me) return me
        const upd = event.players.find(u => u.id === me.id)
        return upd ? { ...me, chips: upd.chips } : me
      })
    }
    if (event.type === 'showdown') {
      setShowdownResults(event.results.map(r => ({
        ...r,
        displayName: playersRef.current.find(p => p.id === r.playerId)?.display_name ?? '?',
      })))
    }
    if (event.type === 'hand_finished') {
      setHand(h => h ? { ...h, street: 'finished', winner_ids: event.winnerIds } : h)
      setHandResult({ winnerIds: event.winnerIds, pot: event.pot })
    }
    if (event.type === 'game_finished') {
      setRankings(event.rankings)
      setView('finished')
    }
  })

  // Fetch hole cards when hand changes (after hand_started sets hand.id)
  useEffect(() => {
    if (!hand?.id || !myPlayer?.id) return
    fetch(`/api/hands/${hand.id}/my-cards?playerId=${myPlayer.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { cards?: PokerCard[]; myCurrentBet?: number } | null) => {
        if (data?.cards) setMyCards(data.cards)
        if (data?.myCurrentBet !== undefined) setMyHandCurrentBet(data.myCurrentBet)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.id])

  async function handleJoin() {
    // On mobile, IME keyboards may not fire onChange during composition.
    // Fall back to reading the DOM value directly so the button always works.
    const displayName = (name || nameInputRef.current?.value || '').trim()
    if (joining) return
    if (!displayName) { setJoinError(t.enterYourName); return }
    setJoinError(null)
    setJoining(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })
      if (!res.ok) {
        setJoinError(await getApiError(res))
        return
      }
      const { player } = await res.json() as { player: Player }
      if (!player?.id) { setJoinError('Failed to join room'); return }
      savePlayer(player.id, displayName)
      setMyPlayer(player)
      setPlayers(ps => ps.some(p => p.id === player.id) ? ps : [...ps, player])
      setView('lobby')
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setJoining(false)
    }
  }

  async function handleAddBot() {
    const res = await fetch(`/api/rooms/${room.id}/bots`, { method: 'POST' })
    if (!res.ok) return
    const { player } = await res.json() as { player: Player }
    setBotIds(prev => {
      const next = new Set(prev)
      next.add(player.id)
      localStorage.setItem(`texasholdem_bots_${room.id}`, JSON.stringify([...next]))
      return next
    })
  }

  function handleHandResultDismiss() {
    setHandResult(null)
    setShowdownResults([])
    // Apply any hand_started event that arrived while the overlay was showing
    const pending = pendingHandStartRef.current
    if (pending) {
      pendingHandStartRef.current = null
      setTableBets({})
      setLastAction(null)
      setHand({
        id: pending.handId,
        room_id: room.id,
        hand_number: pending.handNumber,
        dealer_seat: pending.dealerSeat,
        community_cards: [],
        pot: 0,
        side_pots: [],
        street: 'preflop',
        current_seat: null,
        current_bet: 0,
        deck: [],
        winner_ids: null,
        started_at: Date.now(),
        finished_at: null,
      })
      setMyCards([])
      setMyHandCurrentBet(0)
      setCurrentSeat(null)
    }
  }

  async function handleStart() {
    if (!hostPlayerId) return
    await fetch(`/api/rooms/${room.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPlayerId }),
    })
  }

  if (view === 'name_input') {
    return (
      <main className="min-h-[100dvh] bg-green-900 flex flex-col items-center overflow-y-auto p-6 pt-16">
        <button onClick={toggleLang}
          className="absolute top-4 right-4 px-3 py-1 rounded-lg border border-white/30 text-white/70 text-sm">
          {t.switchLang}
        </button>
        <div className="flex flex-col items-center gap-6 w-full max-w-xs my-auto">
          <h1 className="text-3xl font-bold text-white">{t.joinTable}</h1>
          <input
            ref={nameInputRef}
            className="px-4 py-3 rounded-xl text-lg w-full bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white"
            placeholder={t.namePlaceholder} value={name} maxLength={20}
            onChange={e => setName(e.target.value)}
            onInput={e => setName((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()} />
          {joinError && (
            <p className="text-red-400 text-sm text-center">{joinError}</p>
          )}
          <button onClick={handleJoin} disabled={joining}
            className="w-full py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40">
            {joining ? t.joining : t.sitDown}
          </button>
        </div>
      </main>
    )
  }

  if (view === 'lobby') {
    return <LobbyView room={room} players={players} myPlayer={myPlayer} hostPlayerId={hostPlayerId} onStart={handleStart} onAddBot={handleAddBot} t={t} />
  }

  if (view === 'finished') {
    return <ResultView rankings={rankings} t={t} />
  }

  return (
    <GameView
      room={room} players={players} myPlayer={myPlayer}
      hand={hand} myCards={myCards} myHandCurrentBet={myHandCurrentBet}
      tableBets={tableBets} lastAction={lastAction}
      currentSeat={currentSeat}
      handResult={handResult}
      showdownResults={showdownResults}
      onHandResultDismiss={handleHandResultDismiss}
      t={t}
    />
  )
}

async function getApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({})) as { error?: string }
  return body.error ?? `Error ${res.status}`
}

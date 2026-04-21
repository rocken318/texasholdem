// src/app/room/[code]/RoomClient.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRoomStream } from '@/lib/hooks/useRoomStream'
import { useLocalPlayer } from '@/lib/hooks/useLocalPlayer'
import { useLanguage } from '@/lib/hooks/useLanguage'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { PokerEvent } from '@/lib/events/types'
import { LobbyView } from './LobbyView'
import { GameView } from './GameView'
import { ResultView } from './ResultView'

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
  const [currentSeat, setCurrentSeat] = useState<number | null>(null)
  const [view, setView] = useState<ViewState>(initialRoom.status === 'finished' ? 'finished' : 'name_input')
  const [name, setName] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [rankings, setRankings] = useState<{ playerId: string; displayName: string; chips: number; rank: number }[]>([])
  const { t, toggleLang } = useLanguage()

  const { getPlayer, savePlayer } = useLocalPlayer(room.id)
  const hostPlayerId = typeof window !== 'undefined'
    ? localStorage.getItem(`texasholdem_host_${room.join_code}`)
    : null

  useEffect(() => {
    const saved = getPlayer()
    if (!saved) return
    fetch(`/api/rooms/${room.id}/players`)
      .then(r => r.json())
      .then(({ players: ps }: { players: Player[] }) => {
        setPlayers(ps)
        const me = ps.find(p => p.id === saved.playerId)
        if (me) {
          setMyPlayer(me)
          setView(room.status === 'playing' ? 'playing' : 'lobby')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // myPlayer ref for use inside event handler closure
  const myPlayerRef = { current: null as Player | null }

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
    }
    if (event.type === 'community_dealt') {
      setHand(h => h ? { ...h, community_cards: event.cards, street: event.street as Hand['street'], current_bet: 0 } : h)
      setMyHandCurrentBet(0)
    }
    if (event.type === 'player_action') {
      setHand(h => h ? { ...h, pot: event.pot, current_bet: event.currentBet } : h)
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
    if (event.type === 'hand_finished') {
      setHand(h => h ? { ...h, street: 'finished', winner_ids: event.winnerIds } : h)
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
    const displayName = name.trim()
    if (!displayName || joining) return
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
      <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-6 p-6">
        <button onClick={toggleLang}
          className="absolute top-4 right-4 px-3 py-1 rounded-lg border border-white/30 text-white/70 text-sm">
          {t.switchLang}
        </button>
        <h1 className="text-3xl font-bold text-white">{t.joinTable}</h1>
        <input
          className="px-4 py-3 rounded-xl text-lg w-full max-w-xs bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder={t.namePlaceholder} value={name} maxLength={20}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()} />
        {joinError && (
          <p className="text-red-400 text-sm text-center max-w-xs">{joinError}</p>
        )}
        <button onClick={handleJoin} disabled={!name.trim() || joining}
          className="w-full max-w-xs py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40">
          {joining ? t.joining : t.sitDown}
        </button>
      </main>
    )
  }

  if (view === 'lobby') {
    return <LobbyView room={room} players={players} myPlayer={myPlayer} hostPlayerId={hostPlayerId} onStart={handleStart} t={t} />
  }

  if (view === 'finished') {
    return <ResultView rankings={rankings} t={t} />
  }

  return (
    <GameView
      room={room} players={players} myPlayer={myPlayer}
      hand={hand} myCards={myCards} myHandCurrentBet={myHandCurrentBet}
      currentSeat={currentSeat} t={t}
    />
  )
}

async function getApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({})) as { error?: string }
  return body.error ?? `Error ${res.status}`
}

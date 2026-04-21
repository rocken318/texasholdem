// src/app/room/[code]/RoomClient.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRoomStream } from '@/lib/hooks/useRoomStream'
import { useLocalPlayer } from '@/lib/hooks/useLocalPlayer'
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
  const [currentSeat, setCurrentSeat] = useState<number | null>(null)
  const [view, setView] = useState<ViewState>(initialRoom.status === 'finished' ? 'finished' : 'name_input')
  const [name, setName] = useState('')
  const [rankings, setRankings] = useState<{ playerId: string; displayName: string; chips: number; rank: number }[]>([])

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

  useRoomStream(room.id, (event: PokerEvent) => {
    if (event.type === 'player_joined') {
      setPlayers(ps => ps.some(p => p.id === event.player.id) ? ps : [...ps, event.player])
    }
    if (event.type === 'player_left') {
      setPlayers(ps => ps.filter(p => p.id !== event.playerId))
    }
    if (event.type === 'game_started') {
      setView('playing')
    }
    if (event.type === 'hand_started') {
      setHand(h => h ? { ...h, id: event.handId, hand_number: event.handNumber } : null)
      // Fetch hole cards for this hand
      setMyCards([])
      if (myPlayer) {
        fetch(`/api/hands/${event.handId}/my-cards?playerId=${myPlayer.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.cards) setMyCards(data.cards) })
      }
    }
    if (event.type === 'turn_started') {
      setCurrentSeat(event.seatIndex)
    }
    if (event.type === 'community_dealt') {
      setHand(h => h ? { ...h, community_cards: event.cards, street: event.street as Hand['street'] } : null)
    }
    if (event.type === 'player_action') {
      setHand(h => h ? { ...h, pot: event.pot } : null)
    }
    if (event.type === 'chips_updated') {
      setPlayers(ps => ps.map(p => {
        const upd = event.players.find(u => u.id === p.id)
        return upd ? { ...p, chips: upd.chips } : p
      }))
    }
    if (event.type === 'game_finished') {
      setRankings(event.rankings)
      setView('finished')
    }
  })

  async function handleJoin() {
    if (!name.trim()) return
    const res = await fetch(`/api/rooms/${room.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    if (!res.ok) { alert('Failed to join'); return }
    const { player } = await res.json()
    savePlayer(player.id, name)
    setMyPlayer(player)
    setPlayers(ps => [...ps, player])
    setView('lobby')
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
        <h1 className="text-3xl font-bold text-white">Join Table</h1>
        <input
          className="px-4 py-3 rounded-xl text-lg w-full max-w-xs bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Your name" value={name} maxLength={20}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()} />
        <button onClick={handleJoin} disabled={!name.trim()}
          className="w-full max-w-xs py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40">
          Sit Down
        </button>
      </main>
    )
  }

  if (view === 'lobby') {
    return <LobbyView room={room} players={players} myPlayer={myPlayer} hostPlayerId={hostPlayerId} onStart={handleStart} />
  }

  if (view === 'finished') {
    return <ResultView rankings={rankings} />
  }

  return (
    <GameView
      room={room} players={players} myPlayer={myPlayer}
      hand={hand} myCards={myCards} currentSeat={currentSeat}
    />
  )
}

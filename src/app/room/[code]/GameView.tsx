// src/app/room/[code]/GameView.tsx
'use client'
import { useState, useEffect } from 'react'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { Translations } from '@/lib/i18n'
import { TableView } from './TableView'
import { MyCards } from './MyCards'
import { ActionBar } from './ActionBar'
import { TurnTimer } from './TurnTimer'

interface GameViewProps {
  room: Room
  players: Player[]
  myPlayer: Player | null
  hand: Hand | null
  myCards: PokerCard[]
  myHandCurrentBet: number
  tableBets: Record<string, number>
  lastAction: { playerId: string; action: string; amount: number } | null
  currentSeat: number | null
  t: Translations
}

function getActionLabel(action: string, amount: number, t: Translations): string {
  switch (action) {
    case 'fold': return t.fold
    case 'check': return t.check
    case 'call': return `${t.call} ${amount}`
    case 'raise': return `${t.raise} ${amount}`
    case 'all_in': return `${t.allIn}!`
    default: return action
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'fold': return 'text-red-300'
    case 'check': return 'text-teal-300'
    case 'call': return 'text-sky-300'
    case 'raise': return 'text-amber-300'
    case 'all_in': return 'text-yellow-300'
    default: return 'text-white'
  }
}

export function GameView({ room, players, myPlayer, hand, myCards, myHandCurrentBet, tableBets, lastAction, currentSeat, t }: GameViewProps) {
  const isMyTurn = myPlayer?.seat_index === currentSeat && currentSeat !== null

  // Action toast state
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    if (!lastAction) return
    const player = players.find(p => p.id === lastAction.playerId)
    const playerName = player?.display_name ?? '?'
    const label = getActionLabel(lastAction.action, lastAction.amount, t)
    const color = getActionColor(lastAction.action)
    setToast({ message: `${playerName}: ${label}`, color })
    setToastVisible(true)
    const timer = setTimeout(() => {
      setToastVisible(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [lastAction, players, t])

  // Clear toast from DOM after fade-out
  useEffect(() => {
    if (!toastVisible && toast) {
      const timer = setTimeout(() => setToast(null), 300)
      return () => clearTimeout(timer)
    }
  }, [toastVisible, toast])

  async function handleAction(action: string, amount?: number) {
    if (!myPlayer) return
    await fetch(`/api/rooms/${room.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayer.id, action, amount }),
    })
  }

  return (
    <main className="min-h-screen bg-green-800 flex flex-col">
      {/* Action toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50
            bg-black/80 rounded-xl py-2 px-5 shadow-lg
            transition-all duration-300 ease-out
            ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          <span className={`font-bold text-sm whitespace-nowrap ${toast.color}`}>
            {toast.message}
          </span>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <TableView
          players={players}
          myPlayerId={myPlayer?.id ?? null}
          mySeatIndex={myPlayer?.seat_index ?? null}
          currentSeat={currentSeat}
          communityCards={hand?.community_cards ?? []}
          pot={hand?.pot ?? 0}
          tableBets={tableBets}
        />
      </div>

      <div className="flex flex-col">
        {isMyTurn && hand && (
          <TurnTimer
            key={`${hand.id}-${currentSeat}`}
            seconds={room.settings.turnTimerSec}
            onTimeout={() => handleAction('fold')}
          />
        )}
        <MyCards cards={myCards} />
        {isMyTurn && hand && myPlayer && (
          <ActionBar
            currentBet={hand.current_bet}
            myCurrentBet={myHandCurrentBet}
            myChips={myPlayer.chips}
            bigBlind={room.settings.bigBlind}
            onAction={handleAction}
            t={t}
          />
        )}
      </div>
    </main>
  )
}

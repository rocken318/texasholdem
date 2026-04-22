// src/app/room/[code]/GameView.tsx
'use client'
import { useMemo, useState, useEffect } from 'react'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { Translations } from '@/lib/i18n'
import { TableView } from './TableView'
import { ActionBar } from './ActionBar'
import { TurnTimer } from './TurnTimer'
import { HandResultOverlay, type ShowdownResult } from './HandResultOverlay'
import { Card } from '@/components/Card'
import { playTurnSound, playWinSound } from '@/lib/sounds'

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
  handResult: { winnerIds: string[]; pot: number } | null
  showdownResults: ShowdownResult[]
  onHandResultDismiss: () => void
  onHandResultReady: () => void
  t: Translations
}


function CardPeekModal({ cards, onClose }: { cards: PokerCard[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Title */}
        <div className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#bf80ff' }}>
          YOUR HAND / あなたの手
        </div>

        {/* Large cards */}
        <div className="flex gap-4">
          <div style={{ filter: 'drop-shadow(0 0 20px rgba(140,50,255,0.8))' }}>
            <Card card={cards[0]} large />
          </div>
          <div style={{ filter: 'drop-shadow(0 0 20px rgba(140,50,255,0.8))' }}>
            <Card card={cards[1]} large />
          </div>
        </div>

        {/* Card details */}
        <div className="text-center">
          <div className="text-xs text-white/40 tracking-wide">タップして閉じる</div>
        </div>
      </div>
    </div>
  )
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

export function GameView({ room, players, myPlayer, hand, myCards, myHandCurrentBet, tableBets, lastAction, currentSeat, handResult, showdownResults, onHandResultDismiss, onHandResultReady, t }: GameViewProps) {
  const [submittingAction, setSubmittingAction] = useState(false)
  const isMyTurn = !submittingAction && myPlayer?.seat_index === currentSeat && currentSeat !== null
  const [peekingCards, setPeekingCards] = useState(false)

  useEffect(() => {
    setSubmittingAction(false)
  }, [currentSeat])

  // Play turn notification sound
  useEffect(() => {
    if (isMyTurn) playTurnSound()
  }, [isMyTurn])

  // Play win sound
  useEffect(() => {
    if (handResult && myPlayer && handResult.winnerIds.includes(myPlayer.id)) {
      playWinSound()
    }
  }, [handResult, myPlayer])

  // Action toast — derived from lastAction, no setState in effects
  const toastData = useMemo(() => {
    if (!lastAction) return null
    const player = players.find(p => p.id === lastAction.playerId)
    return {
      // key encodes enough action data to restart CSS animation on each unique action
      key: `toast-${lastAction.playerId}-${lastAction.action}-${lastAction.amount}`,
      message: `${player?.display_name ?? '?'}: ${getActionLabel(lastAction.action, lastAction.amount, t)}`,
      color: getActionColor(lastAction.action),
    }
  }, [lastAction, players, t])

  async function handleAction(action: string, amount?: number) {
    if (!myPlayer) return
    setSubmittingAction(true)
    await fetch(`/api/rooms/${room.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayer.id, action, amount }),
    })
  }

  // Compute winner names for overlay
  const winnerNames = handResult
    ? handResult.winnerIds.map(id => players.find(p => p.id === id)?.display_name ?? '?')
    : []

  return (
    <main
      className="h-[100dvh] flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: "url('/bg/casino.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />

      {/* Content above overlay */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Card peek modal */}
        {peekingCards && myCards.length > 0 && (
          <CardPeekModal cards={myCards} onClose={() => setPeekingCards(false)} />
        )}

        {/* Hand result overlay */}
        {handResult && (
          <HandResultOverlay
            winnerIds={handResult.winnerIds}
            winnerNames={winnerNames}
            pot={handResult.pot}
            showdownResults={showdownResults}
            onDismiss={onHandResultDismiss}
            onReady={onHandResultReady}
          />
        )}

        {/* Action toast — key restarts CSS animation on each new action */}
        {toastData && (
          <div
            key={toastData.key}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 rounded-xl py-2 px-5 shadow-lg"
            style={{ animation: 'toastFade 1.8s ease-out forwards' }}
          >
            <span className={`font-bold text-sm whitespace-nowrap ${toastData.color}`}>
              {toastData.message}
            </span>
          </div>
        )}

        <div className="flex-1 min-h-0 relative overflow-hidden pt-6 pb-2">
          <TableView
            players={players}
            myPlayerId={myPlayer?.id ?? null}
            mySeatIndex={myPlayer?.seat_index ?? null}
            currentSeat={currentSeat}
            communityCards={hand?.community_cards ?? []}
            pot={hand?.pot ?? 0}
            tableBets={tableBets}
            myCards={myCards}
            onMyCardTap={() => setPeekingCards(true)}
          />
        </div>

        <div
          className="flex-shrink-0 flex flex-col"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(4,2,12,0.4) 100%)' }}
        >
          {isMyTurn && hand && (
            <TurnTimer
              key={`${hand.id}-${currentSeat}`}
              seconds={room.settings.turnTimerSec}
              onTimeout={() => handleAction('fold')}
            />
          )}

          {hand && myPlayer && (
            <ActionBar
              currentBet={hand.current_bet}
              myCurrentBet={myHandCurrentBet}
              myChips={myPlayer.chips}
              bigBlind={room.settings.bigBlind}
              onAction={handleAction}
              t={t}
              disabled={false}
              isMyTurn={isMyTurn}
            />
          )}
        </div>
      </div>
    </main>
  )
}

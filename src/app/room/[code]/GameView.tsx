// src/app/room/[code]/GameView.tsx
'use client'
import { useMemo } from 'react'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { Translations } from '@/lib/i18n'
import { TableView } from './TableView'
import { ActionBar } from './ActionBar'
import { TurnTimer } from './TurnTimer'
import { HandResultOverlay, type ShowdownResult } from './HandResultOverlay'

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

export function GameView({ room, players, myPlayer, hand, myCards, myHandCurrentBet, tableBets, lastAction, currentSeat, handResult, showdownResults, onHandResultDismiss, t }: GameViewProps) {
  const isMyTurn = myPlayer?.seat_index === currentSeat && currentSeat !== null

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
        {/* Hand result overlay */}
        {handResult && (
          <HandResultOverlay
            winnerIds={handResult.winnerIds}
            winnerNames={winnerNames}
            pot={handResult.pot}
            showdownResults={showdownResults}
            onDismiss={onHandResultDismiss}
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

        <div className="flex-1 min-h-0 relative overflow-hidden pt-6">
          <TableView
            players={players}
            myPlayerId={myPlayer?.id ?? null}
            mySeatIndex={myPlayer?.seat_index ?? null}
            currentSeat={currentSeat}
            communityCards={hand?.community_cards ?? []}
            pot={hand?.pot ?? 0}
            tableBets={tableBets}
            myCards={myCards}
          />
        </div>

        <div className="flex-shrink-0 flex flex-col">
          {isMyTurn && hand && (
            <TurnTimer
              key={`${hand.id}-${currentSeat}`}
              seconds={room.settings.turnTimerSec}
              onTimeout={() => handleAction('fold')}
            />
          )}

          {isMyTurn && (
            <div className="flex justify-center py-1">
              <div
                className="px-5 py-1 rounded-full text-xs font-black tracking-[0.2em] uppercase"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(255,215,0,0.22), rgba(255,215,0,0.12))',
                  border: '1px solid rgba(255,215,0,0.5)',
                  color: '#ffd700',
                  boxShadow: '0 0 12px rgba(255,215,0,0.25), 0 0 24px rgba(255,215,0,0.1)',
                  animation: 'cardPulse 1.8s ease-in-out infinite',
                }}
              >
                {t.fold === 'Fold' ? 'YOUR TURN' : 'あなたのターン'}
              </div>
            </div>
          )}

          {hand && myPlayer && (
            <ActionBar
              currentBet={hand.current_bet}
              myCurrentBet={myHandCurrentBet}
              myChips={myPlayer.chips}
              bigBlind={room.settings.bigBlind}
              onAction={handleAction}
              t={t}
              disabled={!isMyTurn}
            />
          )}
        </div>
      </div>
    </main>
  )
}

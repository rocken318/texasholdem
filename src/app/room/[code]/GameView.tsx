// src/app/room/[code]/GameView.tsx
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
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
  currentSeat: number | null
}

export function GameView({ room, players, myPlayer, hand, myCards, currentSeat }: GameViewProps) {
  const isMyTurn = myPlayer?.seat_index === currentSeat && currentSeat !== null

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
      <div className="flex-1 relative overflow-hidden">
        <TableView
          players={players}
          myPlayerId={myPlayer?.id ?? null}
          currentSeat={currentSeat}
          communityCards={hand?.community_cards ?? []}
          pot={hand?.pot ?? 0}
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
            myCurrentBet={0}
            myChips={myPlayer.chips}
            bigBlind={room.settings.bigBlind}
            onAction={handleAction}
          />
        )}
      </div>
    </main>
  )
}

// src/app/room/[code]/PlayerSlot.tsx
import type { Player } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'

export function PlayerSlot({ player, isMe, isActive }: {
  player: Player; isMe: boolean; isActive: boolean
}) {
  const inHand = player.status !== 'folded' && player.status !== 'out'

  return (
    <div className={cn(
      'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-center min-w-[60px]',
      isActive && 'ring-2 ring-yellow-400',
      isMe && 'bg-white/20',
      !inHand && 'opacity-40',
    )}>
      {inHand && (
        <div className="flex gap-0.5">
          <Card faceDown small />
          <Card faceDown small />
        </div>
      )}
      <span className="text-white text-xs font-semibold max-w-[64px] truncate block">
        {player.display_name}
      </span>
      <span className="text-green-300 text-xs font-mono">{player.chips}</span>
    </div>
  )
}

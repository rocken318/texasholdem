// src/lib/events/broadcast.ts
import type { PokerEvent } from './types'

export function getRoomBroadcastTopic(roomId: string): string {
  return `room-${roomId}`
}

export async function broadcastRoomEvent(roomId: string, event: PokerEvent): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const topic = getRoomBroadcastTopic(roomId)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify({
        messages: [{ topic, event: 'game_event', payload: event, private: false }],
      }),
    })
    if (!res.ok) {
      console.error('broadcast failed', { roomId, status: res.status })
    }
  } catch (error) {
    console.error('broadcast error', { roomId, error })
  }
}

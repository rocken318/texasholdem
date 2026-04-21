// src/lib/hooks/useRoomStream.ts
'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { PokerEvent } from '@/lib/events/types'

export function useRoomStream(roomId: string | null, onEvent: (e: PokerEvent) => void) {
  const onEventRef = useRef(onEvent)
  useLayoutEffect(() => { onEventRef.current = onEvent })
  useEffect(() => {
    if (!roomId) return
    const es = new EventSource(`/api/stream/${roomId}`)
    es.onmessage = (e) => {
      try { onEventRef.current(JSON.parse(e.data) as PokerEvent) } catch { /* ignore */ }
    }
    return () => es.close()
  }, [roomId])
}

// src/app/api/stream/[roomId]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRoomBroadcastTopic } from '@/lib/events/broadcast'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (data: unknown) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { closed = true }
      }

      send({ type: 'connected', roomId })

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const topic = getRoomBroadcastTopic(roomId)
      const channel = supabase.channel(topic, { config: { private: false } })
      channel.on('broadcast', { event: 'game_event' }, ({ payload }) => send(payload))
      channel.subscribe()

      const ping = setInterval(() => {
        if (closed) { clearInterval(ping); void supabase.removeChannel(channel); return }
        try { controller.enqueue(encoder.encode(': ping\n\n')) }
        catch { closed = true; clearInterval(ping); void supabase.removeChannel(channel) }
      }, 15000)

      req.signal.addEventListener('abort', async () => {
        closed = true
        clearInterval(ping)
        await supabase.removeChannel(channel)
        try { controller.close() } catch { /* ignore */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

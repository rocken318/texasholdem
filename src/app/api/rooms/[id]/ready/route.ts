// src/app/api/rooms/[id]/ready/route.ts
import { markReady } from '@/lib/poker/readyGate'
import { NextRequest } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params
  const { playerId } = await req.json() as { playerId: string }
  if (playerId) markReady(roomId, playerId)
  return Response.json({ ok: true })
}

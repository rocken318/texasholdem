import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })

  const hp = await store.getHandPlayer(id, playerId)
  if (!hp) return NextResponse.json({ error: 'Not in this hand' }, { status: 404 })

  return NextResponse.json({ cards: hp.hole_cards })
}

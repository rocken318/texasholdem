import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params
  const room = await store.getRoomByCode(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  return NextResponse.json({ room })
}

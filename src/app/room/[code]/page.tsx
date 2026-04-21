// src/app/room/[code]/page.tsx
import { notFound } from 'next/navigation'
import { store } from '@/lib/store'
import { RoomClient } from './RoomClient'

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const room = await store.getRoomByCode(code.toUpperCase())
  if (!room) notFound()
  return <RoomClient initialRoom={room} />
}

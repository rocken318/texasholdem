// src/app/debug/page.tsx — 開発用デバッグページ
'use client'
import { useState } from 'react'

export default function DebugPage() {
  const [log, setLog] = useState<string[]>([])
  const [roomId, setRoomId] = useState('')

  function addLog(msg: string) {
    setLog(prev => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`])
  }

  async function testCreateRoom() {
    addLog('POST /api/rooms ...')
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'cash',
          settings: { maxPlayers: 6, startingChips: 1000, smallBlind: 10, bigBlind: 20, turnTimerSec: 30, anteEnabled: false, anteAmount: 0 },
        }),
      })
      const body = await res.json()
      addLog(`→ ${res.status} ${JSON.stringify(body)}`)
      if (body.room?.id) setRoomId(body.room.id)
    } catch (e) {
      addLog(`→ ERROR: ${e}`)
    }
  }

  async function testJoinRoom() {
    if (!roomId) { addLog('先にルームを作成してください'); return }
    addLog(`POST /api/rooms/${roomId}/players ...`)
    try {
      const res = await fetch(`/api/rooms/${roomId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'テストユーザー' }),
      })
      const body = await res.json()
      addLog(`→ ${res.status} ${JSON.stringify(body)}`)
    } catch (e) {
      addLog(`→ ERROR: ${e}`)
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Debug Page</h1>
      <div className="flex gap-3 flex-wrap">
        <button onClick={testCreateRoom}
          className="px-4 py-2 bg-blue-600 rounded font-bold">
          1. ルーム作成テスト
        </button>
        <button onClick={testJoinRoom}
          className="px-4 py-2 bg-green-600 rounded font-bold">
          2. 参加テスト
        </button>
        <button onClick={() => setLog([])}
          className="px-4 py-2 bg-gray-600 rounded">
          クリア
        </button>
      </div>
      {roomId && <p className="text-yellow-300 text-sm">Room ID: {roomId}</p>}
      <div className="bg-black rounded p-4 font-mono text-sm flex flex-col gap-1 min-h-48">
        {log.length === 0 && <span className="text-gray-500">ボタンを押してテストしてください</span>}
        {log.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </main>
  )
}

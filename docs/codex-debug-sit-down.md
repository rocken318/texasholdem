# デバッグ依頼：「着席する」ボタンが機能しない

## アプリ概要

Next.js 15 App Router + Supabase PostgreSQL で作ったオンラインテキサスホールデムポーカー。
ルーム作成者（ホスト）とゲストが同じルームに参加して遊ぶ。認証なし、名前入力だけで参加できる設計。

## 問題

ゲスト側で `/room/[CODE]` を開くと「テーブルに参加」画面が表示される。
名前を入力して「着席する」を押しても何も起きない（ロビー画面に遷移しない）。

## 環境

- OS: Windows 11, PowerShell
- `npx next dev -p 3001` で起動
- `.env.local` に Supabase の URL と SERVICE_ROLE_KEY は設定済み

## 再現手順

1. `npx next dev -p 3001`
2. ブラウザで `http://localhost:3001` を開く
3. 「ルームを作成」→ ルームを作成する（これはホスト側）
4. 別のタブ/デバイスで `http://localhost:3001/room/<CODE>` を開く
5. 名前を入力して「着席する」を押す → **何も起きない**

## 調査してほしいこと

### 1. まずサーバーのエラーログを確認

`npx next dev` のターミナル出力に `POST /api/rooms/[id]/players` のエラーが出ていないか確認。
エラーが出ていれば、その内容を教えてください。

### 2. APIルートを直接テストする

ルームを作成後、ブラウザのDevTools → Network タブで POST `/api/rooms/.../players` のレスポンスを確認。
ステータスコードと `body` の内容を確認してください。

```bash
# または curl で直接テスト（<ROOM_ID> は実際のUUIDに置き換え）
curl -X POST http://localhost:3001/api/rooms/<ROOM_ID>/players \
  -H "Content-Type: application/json" \
  -d '{"displayName":"テスト"}'
```

### 3. 疑われる原因一覧

#### A. Supabase のテーブルが存在しない（最有力）

`supabase/schema.sql` を Supabase ダッシュボードの SQL エディタで実行していない場合、
INSERT が `relation "rooms" does not exist` エラーで失敗する。

確認方法：Supabase ダッシュボード → Table Editor で `rooms`, `players`, `hands`, `hand_players`, `actions` テーブルが存在するか確認。

存在しない場合：`supabase/schema.sql` の内容をそのまま SQL エディタで実行する。

#### B. RoomClient の `handleJoin` でエラーが握り潰されている

`src/app/room/[code]/RoomClient.tsx` の `handleJoin` 関数：
エラーが起きると `joinError` state に文字列が入り、赤字で画面に表示されるはず。
もし赤いエラーメッセージが表示されていないなら、fetch 自体が呼ばれていない可能性がある。

確認：ボタンを押したときに DevTools のコンソールに何かエラーが出ているか確認。

#### C. `room.id` が undefined の可能性

`RoomClient` は `initialRoom` prop で Room オブジェクトを受け取り、`room.id` を使って
`/api/rooms/${room.id}/players` に POST する。`room.id` が空だと `/api/rooms/undefined/players` になる。

確認：DevTools Network タブで POST先のURLを確認。

#### D. APIルートの `[id]` ルーティングの問題

`src/app/api/rooms/[id]/route.ts` → `id` param を join_code として使って `getRoomByCode` を呼んでいる。
`src/app/api/rooms/[id]/players/route.ts` → `id` param を room UUID として `getRoomById` を呼んでいる。

`POST /api/rooms/<UUID>/players` が来たとき、`getRoomById(uuid)` が正常に動くか確認。

## 関連ファイル

```
src/app/room/[code]/RoomClient.tsx         ← handleJoin 関数
src/app/api/rooms/[id]/players/route.ts    ← POST handler
src/lib/store.ts                           ← getRoomById, createPlayer
src/lib/supabase/server.ts                 ← Supabase クライアント生成
supabase/schema.sql                        ← テーブル定義
.env.local                                 ← Supabase 接続情報（設定済み）
```

## handleJoin のコード（現在）

```typescript
async function handleJoin() {
  if (!name.trim()) return
  setJoinError(null)
  try {
    const res = await fetch(`/api/rooms/${room.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      setJoinError(body.error ?? `Error ${res.status}`)
      return
    }
    const { player } = await res.json() as { player: Player }
    savePlayer(player.id, name)
    setMyPlayer(player)
    setPlayers(ps => [...ps, player])
    setView('lobby')
  } catch (e) {
    setJoinError(e instanceof Error ? e.message : 'Network error')
  }
}
```

## POST /api/rooms/[id]/players のコード（現在）

```typescript
export async function POST(req, context) {
  const { id } = await context.params   // ← room UUID
  const body = await req.json()

  const room = await store.getRoomById(id)                   // ← UUID で検索
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 409 })

  const players = await store.getPlayersByRoom(id)
  if (players.length >= room.settings.maxPlayers)
    return NextResponse.json({ error: 'Room full' }, { status: 409 })

  const player = await store.createPlayer({ ... })
  await broadcastRoomEvent(id, { type: 'player_joined', player })
  return NextResponse.json({ player })
}
```

## 依頼内容

1. 上記の確認手順に沿って原因を特定してください
2. 原因が判明したら修正してください
3. 修正後、「着席する」を押したらロビー画面に遷移することを確認してください

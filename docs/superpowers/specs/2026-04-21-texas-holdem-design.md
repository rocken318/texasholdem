# Texas Hold'em Online — 設計ドキュメント

**作成日:** 2026-04-21  
**ベース:** PartyRant-jp（URL/QR参加システム流用）  
**Git:** https://github.com/rocken318/texasholdem.git

---

## 概要

QRコード / 6文字コードで友達と即座にオンラインテキサスホールデムができるWebアプリ。ログイン不要・名前入力だけで参加できる。スマホ最適化。

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| Framework | Next.js (App Router) + TypeScript |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime + SSE（PartyRant-jp流用） |
| Auth | なし（全員匿名、名前入力のみ） |
| Styling | TailwindCSS |
| カードUI | CSS自作コンポーネント（スート記号はUnicode） |
| ハンド評価 | `pokersolver` npm パッケージ |
| QRコード | `qrcode.react` |

---

## PartyRant-jpから流用するコード

- `useGameStream` — SSE購読フック
- `useLocalPlayer` — localStorageセッション管理
- `broadcastGameEvent` — Supabase Realtime経由ブロードキャスト
- `generateJoinCode` — 6文字コード生成（重複チェック付き）
- `GameQRCode` — QRコードコンポーネント（localhost対応）

---

## データモデル

```sql
-- ルーム（ゲームセッション）
rooms
  id              text PK
  join_code       text UNIQUE NOT NULL    -- 6文字コード
  host_player_id  text NOT NULL           -- 作成者のplayer_id
  status          text NOT NULL           -- lobby | playing | finished
  format          text NOT NULL           -- cash | tournament
  settings        jsonb NOT NULL
    -- {
    --   maxPlayers: number,          // 2-9
    --   startingChips: number,
    --   smallBlind: number,
    --   bigBlind: number,
    --   turnTimerSec: number,        // 10-60
    --   anteEnabled: boolean,
    --   anteAmount: number,
    --   -- tournament only:
    --   blindLevelSec: number,
    --   blindSchedule: [{level, small, big, ante}],
    --   endCondition: 'players' | 'time',
    --   endValue: number             // 残り人数 or 分数
    -- }
  created_at      bigint NOT NULL

-- プレイヤー（匿名）
players
  id              text PK
  room_id         text FK → rooms NOT NULL
  display_name    text NOT NULL
  chips           integer NOT NULL DEFAULT 0
  status          text NOT NULL    -- waiting | active | folded | all_in | out
  seat_index      integer          -- 0〜8, null=観戦中
  is_host         boolean NOT NULL DEFAULT false
  joined_at       bigint NOT NULL

-- ハンド（1回の勝負）
hands
  id              text PK
  room_id         text FK → rooms NOT NULL
  hand_number     integer NOT NULL
  dealer_seat     integer NOT NULL
  community_cards jsonb NOT NULL DEFAULT '[]'   -- [{suit, rank}, ...]
  pot             integer NOT NULL DEFAULT 0
  side_pots       jsonb NOT NULL DEFAULT '[]'   -- [{amount, eligible_player_ids[]}]
  street          text NOT NULL  -- preflop | flop | turn | river | showdown | finished
  winner_ids      jsonb                          -- showdown後に設定
  started_at      bigint NOT NULL
  finished_at     bigint

-- ハンドごとのプレイヤー状態（ホールカード含む）
hand_players
  id              text PK
  hand_id         text FK → hands NOT NULL
  player_id       text FK → players NOT NULL
  hole_cards      jsonb NOT NULL               -- [{suit, rank}, {suit, rank}]
  current_bet     integer NOT NULL DEFAULT 0
  total_bet       integer NOT NULL DEFAULT 0   -- このハンドでの累計ベット
  status          text NOT NULL  -- active | folded | all_in
  final_hand_rank text                         -- showdown時の役名（例: "Flush"）
  UNIQUE(hand_id, player_id)

-- アクションログ
actions
  id              text PK
  hand_id         text FK → hands NOT NULL
  player_id       text FK → players NOT NULL
  street          text NOT NULL  -- preflop | flop | turn | river
  action          text NOT NULL  -- fold | check | call | raise | all_in
  amount          integer NOT NULL DEFAULT 0
  acted_at        bigint NOT NULL
```

**セキュリティ:** `hand_players.hole_cards` はサーバーサイドAPI経由でのみアクセス。Supabaseクライアントへの直接クエリは行わない（RLS無効、サービスロールキーのみ使用）。

---

## ゲーム状態機械

```
[lobby]
  ↓ ホスト「ゲーム開始」ボタン（参加者2人以上）
[preflop]
  ・ デッキシャッフル、ホールカード2枚配布（本人が GET /api/hands/[id]/my-cards で取得）
  ・ SB/BB/Ante徴収
  ・ UTGからベッティングラウンド
  ↓ 全員アクション完了（コール or フォールド）
[flop]
  ・ コミュニティカード3枚公開
  ・ SB左からベッティングラウンド
  ↓
[turn]
  ・ コミュニティカード1枚追加
  ・ ベッティングラウンド
  ↓
[river]
  ・ コミュニティカード1枚追加
  ・ ベッティングラウンド
  ↓
[showdown]
  ・ 残プレイヤーのホールカード公開（全員にSSEで通知）
  ・ ハンド評価・勝者決定・ポット分配
  ↓
[hand_finished]
  ・ チップ更新
  ・ トーナメント: チップ0のプレイヤーをout
  ・ 終了条件チェック → 満たせば [game_finished]
  ・ 満たさなければ dealer+1 で次のハンドへ

特殊ケース:
  ・ 1人以外全員フォールド → showdownスキップで即勝利
  ・ all_in発生 → サイドポット計算
  ・ ターンタイムアウト → 自動fold（check可能なら自動check）
```

---

## SSEイベント一覧

### 全員向けブロードキャスト

```typescript
player_joined     { player: Player }
player_left       { playerId: string }
game_started      { seats: PlayerSeat[], dealerSeat: number }
hand_started      { handNumber: number, dealerSeat: number }
blinds_posted     { sbPlayerId, bbPlayerId, sbAmount, bbAmount }
turn_started      { playerId: string, timeoutSec: number, validActions: Action[] }
player_action     { playerId: string, action: string, amount: number, pot: number }
community_dealt   { cards: Card[], street: string }
showdown          { results: ShowdownResult[] }  // 全員のホールカード含む
chips_updated     { players: { id, chips }[] }
hand_finished     { winnerId: string[], pot: number, nextDealerSeat: number }
game_finished     { rankings: { playerId, displayName, chips, rank }[] }
blind_level_up    { level: number, small: number, big: number }  // tournament
```

### 本人のみ（個別SSE or 初回REST取得）

```typescript
hole_cards        { handId: string, cards: Card[] }
```

ホールカードはSSEではなく、ハンド開始時に `GET /api/hands/[handId]/my-cards` で取得する（認証はlocalStorageのplayerIdで）。

---

## APIエンドポイント

```
POST /api/rooms                    ルーム作成
GET  /api/rooms/[code]             コードでルーム取得
POST /api/rooms/[id]/players       参加（名前入力）
GET  /api/rooms/[id]/players       プレイヤー一覧

POST /api/rooms/[id]/start         ゲーム開始（ホストのみ）
POST /api/rooms/[id]/action        プレイヤーアクション（fold/check/call/raise/all_in）
GET  /api/hands/[id]/my-cards      自分のホールカード取得（playerIdで認証）

GET  /api/stream/[roomId]          SSEストリーム（PartyRant-jp流用）
GET  /api/local-url                ローカルIP取得（QRコード用、流用）
```

---

## ポーカーエンジン（サーバー側専用）

`src/lib/poker/` に配置。クライアントには絶対にimportしない。

```
src/lib/poker/
├── deck.ts          デッキ生成・シャッフル（Fisher-Yates）
├── evaluator.ts     pokersolver wrapping、役判定・比較
├── pot.ts           メインポット・サイドポット計算
├── engine.ts        ゲームロジック本体（状態遷移）
└── types.ts         Card, Hand, Action, GameState等の型定義
```

**外部依存:** `pokersolver` — MIT License、52枚デッキのホールデム評価に対応。

---

## UIコンポーネント構成

```
src/app/
├── page.tsx                    トップ（コード入力 or ルーム作成ボタン）
├── create/page.tsx             ルーム設定フォーム
├── join/page.tsx               コード入力（PartyRant-jp流用）
└── room/[code]/
    ├── page.tsx                ルートラッパー
    ├── LobbyView.tsx           待機室（QRコード、参加者リスト、設定表示）
    ├── GameView.tsx            ゲーム本体
    │   ├── TableView.tsx       楕円テーブル + プレイヤー配置
    │   ├── PlayerSlot.tsx      名前・チップ・カード裏面・ターン表示
    │   ├── CommunityCards.tsx  コミュニティカード5枚（中央）
    │   ├── PotDisplay.tsx      ポット金額
    │   ├── MyCards.tsx         自分のホールカード（画面下部）
    │   ├── ActionBar.tsx       Fold/Check/Call/Raise + レイズ額スライダー
    │   ├── TurnTimer.tsx       残り時間プログレスバー
    │   └── GameLog.tsx         アクション履歴（折りたたみ）
    └── ResultView.tsx          ゲーム終了ランキング

src/components/
├── Card.tsx                    CSSカードコンポーネント（表/裏）
├── GameQRCode.tsx              流用
└── RoomSettings.tsx            設定フォームパーツ
```

### Card.tsx デザイン方針
- TailwindCSSで白背景・角丸・シャドウのカード形状
- スート記号はUnicode（♠ ♥ ♦ ♣）
- 赤スート（♥♦）は `text-red-500`、黒スート（♠♣）は `text-gray-900`
- 裏面は紺色 + パターン背景
- スマホで見やすいよう数字を大きめに

---

## ルーム設定パラメータ

| 設定名 | 型 | デフォルト | 範囲/選択肢 |
|--------|-----|---------|------------|
| format | string | cash | cash / tournament |
| maxPlayers | number | 6 | 2〜9 |
| startingChips | number | 1000 | 100〜100000 |
| smallBlind | number | 10 | 1〜1000 |
| bigBlind | number | 20 | 2〜2000 |
| turnTimerSec | number | 30 | 10〜60 |
| anteEnabled | boolean | false | — |
| anteAmount | number | 0 | 1〜500 |
| **tournament only** | | | |
| blindLevelSec | number | 600 | 60〜3600 |
| endCondition | string | players | players / time |
| endValue | number | 1 | 人数:1〜8 / 分数:10〜240 |

---

## ディレクトリ構成（最終）

```
texasholdem/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── create/
│   │   ├── join/
│   │   ├── room/[code]/
│   │   └── api/
│   │       ├── rooms/
│   │       ├── hands/
│   │       └── stream/[roomId]/
│   ├── components/
│   ├── lib/
│   │   ├── poker/          ← サーバー専用
│   │   ├── hooks/          ← useGameStream, useLocalPlayer (流用)
│   │   ├── events/         ← broadcast.ts, types.ts (流用)
│   │   └── supabase/
│   └── types/
├── supabase/
│   └── schema.sql
└── docs/
    └── superpowers/specs/
        └── 2026-04-21-texas-holdem-design.md
```

---

## 未決定事項（実装時に判断）

- ホストがゲーム中に退出した場合の処理（次のプレイヤーへホスト権限移譲？）
- オールイン時のホールカード公開タイミング（ランニングイット）
- キャッシュゲームのリバイ（チップ補充）機能の有無

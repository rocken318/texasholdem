# Texas Hold'em Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first online Texas Hold'em app with QR/URL room joining, anonymous players, configurable rules, and real-time gameplay via SSE.

**Architecture:** Next.js App Router + Supabase (PostgreSQL + Realtime). Server holds all game state; clients send actions via HTTP POST and receive updates via SSE. Hole cards are server-only and delivered per-player via REST. Poker engine runs server-side only.

**Tech Stack:** Next.js 15, TypeScript, Supabase, TailwindCSS, pokersolver, qrcode.react, Vitest

---

## File Map

```
texasholdem/
├── src/
│   ├── lib/
│   │   ├── poker/
│   │   │   ├── types.ts         Card, HandState, ValidActions, etc.
│   │   │   ├── deck.ts          createDeck, shuffle, deal
│   │   │   ├── evaluator.ts     evaluateHand, findWinners (pokersolver wrapper)
│   │   │   ├── pot.ts           calculatePots, distributePot
│   │   │   └── engine.ts        startHand, processAction, getValidActions
│   │   ├── hooks/
│   │   │   ├── useRoomStream.ts SSE hook (adapted from PartyRant-jp)
│   │   │   └── useLocalPlayer.ts localStorage session (copied)
│   │   ├── events/
│   │   │   ├── broadcast.ts     broadcastRoomEvent (adapted)
│   │   │   └── types.ts         PokerEvent union type
│   │   ├── store.ts             DB access layer (rooms, players, hands)
│   │   ├── supabase/
│   │   │   └── server.ts        createServerClient
│   │   └── utils.ts             generateId, generateJoinCode, cn
│   ├── app/
│   │   ├── page.tsx             Home (code input + create button)
│   │   ├── create/page.tsx      Room settings form
│   │   ├── join/page.tsx        Code input
│   │   ├── room/[code]/
│   │   │   ├── page.tsx         Route wrapper + data fetching
│   │   │   ├── RoomClient.tsx   Main client component (state machine)
│   │   │   ├── LobbyView.tsx    Waiting room + QR
│   │   │   ├── GameView.tsx     Game container
│   │   │   ├── TableView.tsx    Oval table + player slots
│   │   │   ├── PlayerSlot.tsx   Name, chips, cards, turn indicator
│   │   │   ├── CommunityCards.tsx 5 board cards
│   │   │   ├── MyCards.tsx      Player's hole cards (bottom of screen)
│   │   │   ├── ActionBar.tsx    Fold/Check/Call/Raise + slider
│   │   │   ├── TurnTimer.tsx    Progress bar countdown
│   │   │   └── ResultView.tsx   Rankings
│   │   └── api/
│   │       ├── rooms/route.ts               POST create
│   │       ├── rooms/[code]/route.ts         GET by code
│   │       ├── rooms/[id]/players/route.ts   POST join, GET list
│   │       ├── rooms/[id]/start/route.ts     POST start game
│   │       ├── rooms/[id]/action/route.ts    POST player action
│   │       ├── hands/[id]/my-cards/route.ts  GET hole cards
│   │       ├── stream/[roomId]/route.ts      GET SSE
│   │       └── local-url/route.ts            GET local IP
│   ├── components/
│   │   ├── Card.tsx             CSS card (front/back)
│   │   └── GameQRCode.tsx       QR code component
│   └── types/
│       └── domain.ts            Room, Player, Hand DB types
├── supabase/
│   └── schema.sql
└── tests/
    └── poker/
        ├── deck.test.ts
        ├── evaluator.test.ts
        ├── pot.test.ts
        └── engine.test.ts
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local.example`, `vitest.config.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd Y:/texasholdem
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js qrcode.react pokersolver lucide-react clsx tailwind-merge
npm install -D vitest @vitest/ui happy-dom @types/pokersolver
```

- [ ] **Step 3: Move src and configure vitest**

After `create-next-app`, move files into `src/` if not already there. Then create `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Copy to `.env.local` and fill in real values.

- [ ] **Step 5: pokersolver type declaration**

```typescript
// src/types/pokersolver.d.ts
declare module 'pokersolver' {
  export class Hand {
    rank: number
    name: string
    cards: { toString(): string }[]
    static solve(cards: string[]): Hand
    static winners(hands: Hand[]): Hand[]
  }
}
```

- [ ] **Step 6: Commit**

```bash
git init
git remote add origin https://github.com/rocken318/texasholdem.git
git add .
git commit -m "chore: initial Next.js project setup with vitest"
git push -u origin main
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write schema**

```sql
-- supabase/schema.sql

create table if not exists rooms (
  id              text primary key,
  join_code       text unique not null,
  host_player_id  text not null,
  status          text not null default 'lobby',
  format          text not null default 'cash',
  settings        jsonb not null default '{}',
  created_at      bigint not null
);

create table if not exists players (
  id              text primary key,
  room_id         text not null references rooms(id),
  display_name    text not null,
  chips           integer not null default 0,
  status          text not null default 'waiting',
  seat_index      integer,
  is_host         boolean not null default false,
  joined_at       bigint not null
);

create table if not exists hands (
  id              text primary key,
  room_id         text not null references rooms(id),
  hand_number     integer not null,
  dealer_seat     integer not null,
  community_cards jsonb not null default '[]',
  pot             integer not null default 0,
  side_pots       jsonb not null default '[]',
  street          text not null default 'preflop',
  current_seat    integer,
  current_bet     integer not null default 0,
  deck            jsonb not null default '[]',
  winner_ids      jsonb,
  started_at      bigint not null,
  finished_at     bigint
);

create table if not exists hand_players (
  id              text primary key,
  hand_id         text not null references hands(id),
  player_id       text not null references players(id),
  hole_cards      jsonb not null default '[]',
  current_bet     integer not null default 0,
  total_bet       integer not null default 0,
  status          text not null default 'active',
  final_hand_rank text,
  unique(hand_id, player_id)
);

create table if not exists actions (
  id          text primary key,
  hand_id     text not null references hands(id),
  player_id   text not null references players(id),
  street      text not null,
  action      text not null,
  amount      integer not null default 0,
  acted_at    bigint not null
);

create index if not exists players_room_id_idx on players(room_id);
create index if not exists hands_room_id_idx on hands(room_id);
create index if not exists hand_players_hand_id_idx on hand_players(hand_id);
create index if not exists actions_hand_id_idx on actions(hand_id);
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open Supabase dashboard → SQL Editor → paste and run `schema.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add supabase schema for poker tables"
```

---

## Task 3: Shared Utils + Supabase Client

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Create utils**

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
```

- [ ] **Step 2: Create Supabase server client**

```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts src/lib/supabase/server.ts
git commit -m "feat: add shared utils and supabase client"
```

---

## Task 4: Domain Types

**Files:**
- Create: `src/types/domain.ts`, `src/lib/poker/types.ts`

- [ ] **Step 1: Create DB domain types**

```typescript
// src/types/domain.ts
export interface RoomSettings {
  maxPlayers: number        // 2-9
  startingChips: number
  smallBlind: number
  bigBlind: number
  turnTimerSec: number      // 10-60
  anteEnabled: boolean
  anteAmount: number
  // tournament only
  blindLevelSec?: number
  blindSchedule?: { level: number; small: number; big: number; ante: number }[]
  endCondition?: 'players' | 'time'
  endValue?: number
}

export interface Room {
  id: string
  join_code: string
  host_player_id: string
  status: 'lobby' | 'playing' | 'finished'
  format: 'cash' | 'tournament'
  settings: RoomSettings
  created_at: number
}

export interface Player {
  id: string
  room_id: string
  display_name: string
  chips: number
  status: 'waiting' | 'active' | 'folded' | 'all_in' | 'out'
  seat_index: number | null
  is_host: boolean
  joined_at: number
}

export interface Hand {
  id: string
  room_id: string
  hand_number: number
  dealer_seat: number
  community_cards: PokerCard[]
  pot: number
  side_pots: SidePot[]
  street: Street
  current_seat: number | null
  current_bet: number
  deck: PokerCard[]
  winner_ids: string[] | null
  started_at: number
  finished_at: number | null
}

export interface HandPlayer {
  id: string
  hand_id: string
  player_id: string
  hole_cards: PokerCard[]
  current_bet: number
  total_bet: number
  status: 'active' | 'folded' | 'all_in'
  final_hand_rank: string | null
}

export interface Action {
  id: string
  hand_id: string
  player_id: string
  street: Street
  action: PlayerActionType
  amount: number
  acted_at: number
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished'
export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

export interface SidePot {
  amount: number
  eligiblePlayerIds: string[]
}

export interface PokerCard {
  suit: 'S' | 'H' | 'D' | 'C'
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'
}
```

- [ ] **Step 2: Create poker engine types**

```typescript
// src/lib/poker/types.ts
export type { PokerCard, SidePot, PlayerActionType, Street } from '@/types/domain'

export interface ValidActions {
  canFold: boolean
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canRaise: boolean
  minRaise: number
  maxRaise: number
  canAllIn: boolean
}

export interface HandEvalResult {
  rank: number
  name: string
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/ src/lib/poker/types.ts
git commit -m "feat: add domain and poker types"
```

---

## Task 5: Deck Module (TDD)

**Files:**
- Create: `src/lib/poker/deck.ts`, `tests/poker/deck.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/poker/deck.test.ts
import { describe, it, expect } from 'vitest'
import { createDeck, shuffle, deal } from '@/lib/poker/deck'

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    const unique = new Set(deck.map(c => `${c.rank}${c.suit}`))
    expect(unique.size).toBe(52)
  })

  it('contains all 4 suits', () => {
    const deck = createDeck()
    const suits = new Set(deck.map(c => c.suit))
    expect(suits).toEqual(new Set(['S', 'H', 'D', 'C']))
  })
})

describe('shuffle', () => {
  it('returns 52 cards', () => {
    const deck = createDeck()
    expect(shuffle(deck)).toHaveLength(52)
  })

  it('does not mutate original deck', () => {
    const deck = createDeck()
    const first = deck[0]
    shuffle(deck)
    expect(deck[0]).toEqual(first)
  })

  it('produces different order most of the time', () => {
    const deck = createDeck()
    const shuffled = shuffle(deck)
    const same = deck.every((c, i) => c.rank === shuffled[i].rank && c.suit === shuffled[i].suit)
    expect(same).toBe(false)
  })
})

describe('deal', () => {
  it('deals correct count and reduces remaining', () => {
    const deck = createDeck()
    const { cards, remaining } = deal(deck, 2)
    expect(cards).toHaveLength(2)
    expect(remaining).toHaveLength(50)
  })

  it('dealt cards are first N cards of deck', () => {
    const deck = createDeck()
    const { cards } = deal(deck, 3)
    expect(cards[0]).toEqual(deck[0])
    expect(cards[2]).toEqual(deck[2])
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test tests/poker/deck.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/poker/deck'`

- [ ] **Step 3: Implement deck module**

```typescript
// src/lib/poker/deck.ts
import type { PokerCard } from '@/types/domain'

const SUITS = ['S', 'H', 'D', 'C'] as const
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

export function shuffle(deck: PokerCard[]): PokerCard[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function deal(deck: PokerCard[], count: number): { cards: PokerCard[]; remaining: PokerCard[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test tests/poker/deck.test.ts
```
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/deck.ts tests/poker/deck.test.ts
git commit -m "feat: add deck module with TDD"
```

---

## Task 6: Hand Evaluator (TDD)

**Files:**
- Create: `src/lib/poker/evaluator.ts`, `tests/poker/evaluator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/poker/evaluator.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateHand, findWinners } from '@/lib/poker/evaluator'
import type { PokerCard } from '@/types/domain'

const c = (rank: PokerCard['rank'], suit: PokerCard['suit']): PokerCard => ({ rank, suit })

describe('evaluateHand', () => {
  it('identifies a flush', () => {
    const hole = [c('A', 'H'), c('K', 'H')]
    const community = [c('Q', 'H'), c('J', 'H'), c('9', 'H'), c('2', 'S'), c('3', 'D')]
    const result = evaluateHand(hole, community)
    expect(result.name).toBe('Flush')
  })

  it('identifies a pair', () => {
    const hole = [c('A', 'H'), c('A', 'S')]
    const community = [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    const result = evaluateHand(hole, community)
    expect(result.name).toBe('Pair')
  })

  it('higher rank beats lower rank', () => {
    const straight = evaluateHand(
      [c('5', 'H'), c('4', 'S')],
      [c('3', 'D'), c('2', 'C'), c('A', 'H'), c('K', 'S'), c('Q', 'D')]
    )
    const pair = evaluateHand(
      [c('A', 'H'), c('A', 'S')],
      [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    )
    expect(straight.rank).toBeGreaterThan(pair.rank)
  })
})

describe('findWinners', () => {
  it('finds single winner', () => {
    const community = [c('2', 'D'), c('5', 'C'), c('9', 'H'), c('K', 'S'), c('Q', 'D')]
    const winners = findWinners([
      { playerId: 'p1', hole: [c('A', 'H'), c('A', 'S')] },  // pair of aces
      { playerId: 'p2', hole: [c('3', 'H'), c('4', 'S')] },  // high card
    ], community)
    expect(winners).toEqual(['p1'])
  })

  it('handles split pot (tie)', () => {
    const community = [c('A', 'D'), c('K', 'C'), c('Q', 'H'), c('J', 'S'), c('T', 'D')]
    const winners = findWinners([
      { playerId: 'p1', hole: [c('2', 'H'), c('3', 'S')] },  // board straight
      { playerId: 'p2', hole: [c('4', 'H'), c('5', 'S')] },  // board straight
    ], community)
    expect(winners).toHaveLength(2)
    expect(winners).toContain('p1')
    expect(winners).toContain('p2')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test tests/poker/evaluator.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement evaluator**

```typescript
// src/lib/poker/evaluator.ts
import { Hand } from 'pokersolver'
import type { PokerCard } from '@/types/domain'
import type { HandEvalResult } from './types'

function toSolverCard(card: PokerCard): string {
  // pokersolver format: rank + lowercase suit (e.g. "As", "Th", "2d")
  return card.rank + card.suit.toLowerCase()
}

export function evaluateHand(hole: PokerCard[], community: PokerCard[]): HandEvalResult {
  const cards = [...hole, ...community].map(toSolverCard)
  const solved = Hand.solve(cards)
  return {
    rank: solved.rank,
    name: solved.name,
  }
}

export function findWinners(
  hands: { playerId: string; hole: PokerCard[] }[],
  community: PokerCard[]
): string[] {
  const solved = hands.map(({ playerId, hole }) => ({
    playerId,
    hand: Hand.solve([...hole, ...community].map(toSolverCard)),
  }))
  const winnerHands = Hand.winners(solved.map(s => s.hand))
  return solved.filter(s => winnerHands.includes(s.hand)).map(s => s.playerId)
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test tests/poker/evaluator.test.ts
```
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/evaluator.ts tests/poker/evaluator.test.ts src/types/pokersolver.d.ts
git commit -m "feat: add hand evaluator with pokersolver"
```

---

## Task 7: Pot Calculator (TDD)

**Files:**
- Create: `src/lib/poker/pot.ts`, `tests/poker/pot.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/poker/pot.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePots, totalPot } from '@/lib/poker/pot'

describe('calculatePots', () => {
  it('single pot when no all-ins', () => {
    const players = [
      { playerId: 'p1', totalBet: 100, status: 'active' as const },
      { playerId: 'p2', totalBet: 100, status: 'active' as const },
      { playerId: 'p3', totalBet: 100, status: 'active' as const },
    ]
    const pots = calculatePots(players)
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(300)
    expect(pots[0].eligiblePlayerIds).toContain('p1')
  })

  it('folded player excluded from eligible', () => {
    const players = [
      { playerId: 'p1', totalBet: 100, status: 'active' as const },
      { playerId: 'p2', totalBet: 100, status: 'folded' as const },
    ]
    const pots = calculatePots(players)
    expect(pots[0].eligiblePlayerIds).not.toContain('p2')
    expect(pots[0].amount).toBe(200)
  })

  it('creates side pot when player all-in for less', () => {
    const players = [
      { playerId: 'p1', totalBet: 50,  status: 'all_in' as const },
      { playerId: 'p2', totalBet: 100, status: 'active' as const },
      { playerId: 'p3', totalBet: 100, status: 'active' as const },
    ]
    const pots = calculatePots(players)
    expect(pots).toHaveLength(2)
    // main pot: 50*3 = 150, eligible: all 3
    expect(pots[0].amount).toBe(150)
    expect(pots[0].eligiblePlayerIds).toContain('p1')
    // side pot: 50*2 = 100, eligible: p2, p3 only
    expect(pots[1].amount).toBe(100)
    expect(pots[1].eligiblePlayerIds).not.toContain('p1')
  })
})

describe('totalPot', () => {
  it('sums all pot amounts', () => {
    const pots = [
      { amount: 150, eligiblePlayerIds: ['p1'] },
      { amount: 100, eligiblePlayerIds: ['p2'] },
    ]
    expect(totalPot(pots)).toBe(250)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test tests/poker/pot.test.ts
```

- [ ] **Step 3: Implement pot calculator**

```typescript
// src/lib/poker/pot.ts
import type { SidePot } from '@/types/domain'

interface PotPlayer {
  playerId: string
  totalBet: number
  status: 'active' | 'folded' | 'all_in'
}

export function calculatePots(players: PotPlayer[]): SidePot[] {
  const allInAmounts = players
    .filter(p => p.status === 'all_in')
    .map(p => p.totalBet)
    .sort((a, b) => a - b)

  if (allInAmounts.length === 0) {
    const amount = players.reduce((sum, p) => sum + p.totalBet, 0)
    const eligible = players.filter(p => p.status !== 'folded').map(p => p.playerId)
    return [{ amount, eligiblePlayerIds: eligible }]
  }

  const levels = [...new Set(allInAmounts)]
  const pots: SidePot[] = []
  let prevLevel = 0

  for (const level of levels) {
    const contributors = players.filter(p => p.totalBet > prevLevel)
    const amount = (level - prevLevel) * contributors.length
    const eligible = contributors.filter(p => p.status !== 'folded').map(p => p.playerId)
    pots.push({ amount, eligiblePlayerIds: eligible })
    prevLevel = level
  }

  // Remaining above highest all-in
  const maxAllIn = levels[levels.length - 1]
  const remaining = players.filter(p => p.totalBet > maxAllIn)
  if (remaining.length > 0) {
    const amount = remaining.reduce((sum, p) => sum + (p.totalBet - maxAllIn), 0)
    const eligible = remaining.filter(p => p.status !== 'folded').map(p => p.playerId)
    pots.push({ amount, eligiblePlayerIds: eligible })
  }

  return pots
}

export function totalPot(pots: SidePot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0)
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test tests/poker/pot.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/pot.ts tests/poker/pot.test.ts
git commit -m "feat: add pot calculator with side pot support"
```

---

## Task 8: Game Engine (TDD)

**Files:**
- Create: `src/lib/poker/engine.ts`, `tests/poker/engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/poker/engine.test.ts
import { describe, it, expect } from 'vitest'
import { getValidActions, isBettingRoundComplete, getNextActiveSeat } from '@/lib/poker/engine'
import type { Hand, HandPlayer } from '@/types/domain'

function makePlayer(overrides: Partial<HandPlayer> = {}): HandPlayer {
  return {
    id: 'hp1', hand_id: 'h1', player_id: 'p1',
    hole_cards: [], current_bet: 0, total_bet: 0,
    status: 'active', final_hand_rank: null,
    ...overrides,
  }
}

describe('getValidActions', () => {
  it('can check when no bet to call', () => {
    const player = makePlayer({ current_bet: 20 })
    const result = getValidActions(player, { currentBet: 20, bigBlind: 20, playerChips: 980 })
    expect(result.canCheck).toBe(true)
    expect(result.canCall).toBe(false)
  })

  it('must call when behind', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 40, bigBlind: 20, playerChips: 1000 })
    expect(result.canCheck).toBe(false)
    expect(result.canCall).toBe(true)
    expect(result.callAmount).toBe(40)
  })

  it('all-in when call exceeds chips', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 500, bigBlind: 20, playerChips: 100 })
    expect(result.callAmount).toBe(100)
    expect(result.canAllIn).toBe(true)
  })

  it('minRaise is at least 2x current bet', () => {
    const player = makePlayer({ current_bet: 0 })
    const result = getValidActions(player, { currentBet: 20, bigBlind: 20, playerChips: 1000 })
    expect(result.minRaise).toBeGreaterThanOrEqual(40)
  })
})

describe('isBettingRoundComplete', () => {
  it('complete when all active players matched bet', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'active', current_bet: 20 }),
    ]
    expect(isBettingRoundComplete(players, 20, null)).toBe(true)
  })

  it('not complete when someone is behind', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'active', current_bet: 0 }),
    ]
    expect(isBettingRoundComplete(players, 20, null)).toBe(false)
  })

  it('all_in players do not block completion', () => {
    const players = [
      makePlayer({ player_id: 'p1', status: 'active', current_bet: 20 }),
      makePlayer({ player_id: 'p2', status: 'all_in', current_bet: 10 }),
    ]
    expect(isBettingRoundComplete(players, 20, null)).toBe(true)
  })
})

describe('getNextActiveSeat', () => {
  it('returns next active seat', () => {
    const seats = [
      { seatIndex: 0, status: 'folded' as const },
      { seatIndex: 1, status: 'active' as const },
      { seatIndex: 2, status: 'active' as const },
    ]
    expect(getNextActiveSeat(seats, 0)).toBe(1)
  })

  it('wraps around', () => {
    const seats = [
      { seatIndex: 0, status: 'active' as const },
      { seatIndex: 1, status: 'folded' as const },
      { seatIndex: 2, status: 'active' as const },
    ]
    expect(getNextActiveSeat(seats, 2)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test tests/poker/engine.test.ts
```

- [ ] **Step 3: Implement engine**

```typescript
// src/lib/poker/engine.ts
import type { HandPlayer } from '@/types/domain'
import type { ValidActions } from './types'

interface ValidActionContext {
  currentBet: number
  bigBlind: number
  playerChips: number
}

export function getValidActions(player: HandPlayer, ctx: ValidActionContext): ValidActions {
  const toCall = Math.max(0, ctx.currentBet - player.current_bet)
  const canCheck = toCall === 0
  const callAmount = Math.min(toCall, ctx.playerChips)
  const canCall = toCall > 0 && toCall <= ctx.playerChips
  const minRaise = Math.min(ctx.currentBet + ctx.bigBlind, ctx.playerChips)
  const canRaise = ctx.playerChips > toCall + 1

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaise,
    maxRaise: ctx.playerChips,
    canAllIn: ctx.playerChips > 0,
  }
}

export function isBettingRoundComplete(
  handPlayers: HandPlayer[],
  currentBet: number,
  lastRaiserPlayerId: string | null
): boolean {
  const active = handPlayers.filter(p => p.status === 'active')
  if (active.length === 0) return true
  // All active players must have matched the current bet
  return active.every(p => p.current_bet >= currentBet)
}

export function getNextActiveSeat(
  seats: { seatIndex: number; status: 'active' | 'folded' | 'all_in' }[],
  currentSeat: number
): number {
  const sorted = [...seats].sort((a, b) => a.seatIndex - b.seatIndex)
  const eligible = sorted.filter(s => s.status === 'active')
  if (eligible.length === 0) return -1
  const next = eligible.find(s => s.seatIndex > currentSeat)
  return next ? next.seatIndex : eligible[0].seatIndex
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test tests/poker/engine.test.ts
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/poker/engine.ts tests/poker/engine.test.ts
git commit -m "feat: add game engine helpers with TDD"
```

---

## Task 9: Event Types + SSE Infrastructure

**Files:**
- Create: `src/lib/events/types.ts`, `src/lib/events/broadcast.ts`, `src/lib/hooks/useRoomStream.ts`, `src/lib/hooks/useLocalPlayer.ts`

- [ ] **Step 1: Create poker event types**

```typescript
// src/lib/events/types.ts
import type { Player, PokerCard, SidePot } from '@/types/domain'

export type PokerEvent =
  | { type: 'connected'; roomId: string }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started'; dealerSeat: number; players: Player[] }
  | { type: 'hand_started'; handId: string; handNumber: number; dealerSeat: number }
  | { type: 'blinds_posted'; sbPlayerId: string; bbPlayerId: string; sbAmount: number; bbAmount: number; pot: number }
  | { type: 'turn_started'; playerId: string; seatIndex: number; timeoutSec: number }
  | { type: 'player_action'; playerId: string; action: string; amount: number; pot: number }
  | { type: 'community_dealt'; cards: PokerCard[]; street: string }
  | { type: 'showdown'; results: { playerId: string; holeCards: PokerCard[]; handName: string }[] }
  | { type: 'chips_updated'; players: { id: string; chips: number }[] }
  | { type: 'hand_finished'; winnerIds: string[]; pot: number; nextDealerSeat: number }
  | { type: 'game_finished'; rankings: { playerId: string; displayName: string; chips: number; rank: number }[] }
  | { type: 'blind_level_up'; level: number; small: number; big: number }
```

- [ ] **Step 2: Create broadcast helper**

```typescript
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
```

- [ ] **Step 3: Create SSE stream route**

```typescript
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
```

- [ ] **Step 4: Create client hooks**

```typescript
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
```

```typescript
// src/lib/hooks/useLocalPlayer.ts
'use client'

export function useLocalPlayer(roomId: string) {
  const key = `texasholdem_player_${roomId}`

  function getPlayer(): { playerId: string; displayName: string } | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  function savePlayer(playerId: string, displayName: string) {
    localStorage.setItem(key, JSON.stringify({ playerId, displayName }))
  }

  function clearPlayer() { localStorage.removeItem(key) }

  return { getPlayer, savePlayer, clearPlayer }
}
```

- [ ] **Step 5: Create local-url route**

```typescript
// src/app/api/local-url/route.ts
import { NextResponse } from 'next/server'
import { networkInterfaces } from 'os'

export function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const port = reqUrl.port || '3000'
  const proto = reqUrl.protocol
  const nets = networkInterfaces()
  let localIp: string | null = null
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) { localIp = net.address; break }
    }
    if (localIp) break
  }
  return NextResponse.json({ networkUrl: localIp ? `${proto}//${localIp}:${port}` : null })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/events/ src/lib/hooks/ src/app/api/stream/ src/app/api/local-url/
git commit -m "feat: add SSE infrastructure and event types"
```

---

## Task 10: Store (DB Access Layer)

**Files:**
- Create: `src/lib/store.ts`

- [ ] **Step 1: Implement store**

```typescript
// src/lib/store.ts
import { createServerClient } from '@/lib/supabase/server'
import type { Room, Player, Hand, HandPlayer, Action } from '@/types/domain'

export const store = {
  // Rooms
  async createRoom(room: Omit<Room, 'created_at'> & { created_at: number }): Promise<Room> {
    const db = createServerClient()
    const { data, error } = await db.from('rooms').insert(room).select().single()
    if (error) throw error
    return data as Room
  },

  async getRoomByCode(joinCode: string): Promise<Room | null> {
    const db = createServerClient()
    const { data } = await db.from('rooms').select().eq('join_code', joinCode).single()
    return (data as Room) ?? null
  },

  async getRoomById(id: string): Promise<Room | null> {
    const db = createServerClient()
    const { data } = await db.from('rooms').select().eq('id', id).single()
    return (data as Room) ?? null
  },

  async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('rooms').update(updates).eq('id', id)
    if (error) throw error
  },

  // Players
  async createPlayer(player: Player): Promise<Player> {
    const db = createServerClient()
    const { data, error } = await db.from('players').insert(player).select().single()
    if (error) throw error
    return data as Player
  },

  async getPlayersByRoom(roomId: string): Promise<Player[]> {
    const db = createServerClient()
    const { data } = await db.from('players').select().eq('room_id', roomId).order('joined_at')
    return (data as Player[]) ?? []
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('players').update(updates).eq('id', id)
    if (error) throw error
  },

  // Hands
  async createHand(hand: Hand): Promise<Hand> {
    const db = createServerClient()
    const { data, error } = await db.from('hands').insert(hand).select().single()
    if (error) throw error
    return data as Hand
  },

  async getCurrentHand(roomId: string): Promise<Hand | null> {
    const db = createServerClient()
    const { data } = await db
      .from('hands').select()
      .eq('room_id', roomId)
      .not('street', 'eq', 'finished')
      .order('hand_number', { ascending: false })
      .limit(1)
      .single()
    return (data as Hand) ?? null
  },

  async updateHand(id: string, updates: Partial<Hand>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('hands').update(updates).eq('id', id)
    if (error) throw error
  },

  // Hand Players
  async createHandPlayers(handPlayers: HandPlayer[]): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('hand_players').insert(handPlayers)
    if (error) throw error
  },

  async getHandPlayers(handId: string): Promise<HandPlayer[]> {
    const db = createServerClient()
    const { data } = await db.from('hand_players').select().eq('hand_id', handId)
    return (data as HandPlayer[]) ?? []
  },

  async getHandPlayer(handId: string, playerId: string): Promise<HandPlayer | null> {
    const db = createServerClient()
    const { data } = await db
      .from('hand_players').select()
      .eq('hand_id', handId).eq('player_id', playerId).single()
    return (data as HandPlayer) ?? null
  },

  async updateHandPlayer(handId: string, playerId: string, updates: Partial<HandPlayer>): Promise<void> {
    const db = createServerClient()
    const { error } = await db
      .from('hand_players').update(updates)
      .eq('hand_id', handId).eq('player_id', playerId)
    if (error) throw error
  },

  // Actions
  async createAction(action: Action): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('actions').insert(action)
    if (error) throw error
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add store DB access layer"
```

---

## Task 11: Rooms API

**Files:**
- Create: `src/app/api/rooms/route.ts`, `src/app/api/rooms/[code]/route.ts`

- [ ] **Step 1: POST /api/rooms (create room)**

```typescript
// src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { generateId, generateJoinCode } from '@/lib/utils'
import type { RoomSettings } from '@/types/domain'

export async function POST(req: NextRequest) {
  const body = await req.json() as { format: 'cash' | 'tournament'; settings: RoomSettings }

  // Try up to 5 times for unique code
  let joinCode = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateJoinCode()
    const existing = await store.getRoomByCode(candidate)
    if (!existing) { joinCode = candidate; break }
  }
  if (!joinCode) return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })

  const now = Date.now()
  const hostPlayerId = generateId()
  const roomId = generateId()

  const room = await store.createRoom({
    id: roomId,
    join_code: joinCode,
    host_player_id: hostPlayerId,
    status: 'lobby',
    format: body.format,
    settings: body.settings,
    created_at: now,
  })

  return NextResponse.json({ room, hostPlayerId })
}
```

- [ ] **Step 2: GET /api/rooms/[code]**

```typescript
// src/app/api/rooms/[code]/route.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rooms/
git commit -m "feat: add rooms API (create + get by code)"
```

---

## Task 12: Players API

**Files:**
- Create: `src/app/api/rooms/[id]/players/route.ts`

- [ ] **Step 1: Implement players route**

```typescript
// src/app/api/rooms/[id]/players/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { generateId } from '@/lib/utils'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const players = await store.getPlayersByRoom(id)
  return NextResponse.json({ players })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json() as { displayName: string; isHost?: boolean; playerId?: string }

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 409 })

  const players = await store.getPlayersByRoom(id)
  if (players.length >= room.settings.maxPlayers) {
    return NextResponse.json({ error: 'Room full' }, { status: 409 })
  }

  const player = await store.createPlayer({
    id: body.playerId ?? generateId(),
    room_id: id,
    display_name: body.displayName.trim().slice(0, 20),
    chips: room.settings.startingChips,
    status: 'waiting',
    seat_index: players.length, // assign next seat
    is_host: body.isHost ?? false,
    joined_at: Date.now(),
  })

  await broadcastRoomEvent(id, { type: 'player_joined', player })
  return NextResponse.json({ player })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/rooms/[id]/players/
git commit -m "feat: add players API"
```

---

## Task 13: Game Start API

**Files:**
- Create: `src/app/api/rooms/[id]/start/route.ts`

- [ ] **Step 1: Implement start route**

```typescript
// src/app/api/rooms/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { createDeck, shuffle, deal } from '@/lib/poker/deck'
import { generateId } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json() as { hostPlayerId: string }

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.host_player_id !== body.hostPlayerId) {
    return NextResponse.json({ error: 'Not host' }, { status: 403 })
  }

  const players = await store.getPlayersByRoom(id)
  const seated = players.filter(p => p.seat_index !== null)
  if (seated.length < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })

  // Update room status
  await store.updateRoom(id, { status: 'playing' })

  // Start first hand
  const dealerSeat = seated[0].seat_index!
  const { handId, sbPlayerId, bbPlayerId } = await startNewHand(id, seated, dealerSeat, room.settings, 1)

  await broadcastRoomEvent(id, { type: 'game_started', dealerSeat, players: seated })

  return NextResponse.json({ handId })
}

async function startNewHand(
  roomId: string,
  players: import('@/types/domain').Player[],
  dealerSeat: number,
  settings: import('@/types/domain').RoomSettings,
  handNumber: number
) {
  const sorted = [...players].sort((a, b) => a.seat_index! - b.seat_index!)
  const n = sorted.length
  const dealerIdx = sorted.findIndex(p => p.seat_index === dealerSeat)
  const sbIdx = (dealerIdx + 1) % n
  const bbIdx = (dealerIdx + 2) % n
  const utgIdx = (dealerIdx + 3) % n

  const sbPlayer = sorted[sbIdx]
  const bbPlayer = sorted[bbIdx]

  // Deal hole cards
  let deck = shuffle(createDeck())
  const handId = generateId()
  const now = Date.now()

  const handPlayers: import('@/types/domain').HandPlayer[] = []
  for (const player of sorted) {
    const { cards, remaining } = deal(deck, 2)
    deck = remaining
    handPlayers.push({
      id: generateId(),
      hand_id: handId,
      player_id: player.id,
      hole_cards: cards,
      current_bet: 0,
      total_bet: 0,
      status: 'active',
      final_hand_rank: null,
    })
  }

  // Post blinds
  const sbAmount = Math.min(settings.smallBlind, sbPlayer.chips)
  const bbAmount = Math.min(settings.bigBlind, bbPlayer.chips)

  await store.createHand({
    id: handId,
    room_id: roomId,
    hand_number: handNumber,
    dealer_seat: dealerSeat,
    community_cards: [],
    pot: sbAmount + bbAmount,
    side_pots: [],
    street: 'preflop',
    current_seat: sorted[utgIdx].seat_index,
    current_bet: bbAmount,
    deck,
    winner_ids: null,
    started_at: now,
    finished_at: null,
  })

  await store.createHandPlayers(handPlayers)

  // Update blind bets
  await store.updateHandPlayer(handId, sbPlayer.id, { current_bet: sbAmount, total_bet: sbAmount })
  await store.updateHandPlayer(handId, bbPlayer.id, { current_bet: bbAmount, total_bet: bbAmount })
  await store.updatePlayer(sbPlayer.id, { chips: sbPlayer.chips - sbAmount })
  await store.updatePlayer(bbPlayer.id, { chips: bbPlayer.chips - bbAmount })

  await broadcastRoomEvent(roomId, {
    type: 'hand_started', handId, handNumber, dealerSeat,
  })
  await broadcastRoomEvent(roomId, {
    type: 'blinds_posted',
    sbPlayerId: sbPlayer.id, bbPlayerId: bbPlayer.id,
    sbAmount, bbAmount, pot: sbAmount + bbAmount,
  })
  await broadcastRoomEvent(roomId, {
    type: 'turn_started',
    playerId: sorted[utgIdx].id,
    seatIndex: sorted[utgIdx].seat_index!,
    timeoutSec: settings.turnTimerSec,
  })

  return { handId, sbPlayerId: sbPlayer.id, bbPlayerId: bbPlayer.id }
}

export { startNewHand }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/rooms/[id]/start/
git commit -m "feat: add game start API with hand initialization"
```

---

## Task 14: Player Action API

**Files:**
- Create: `src/app/api/rooms/[id]/action/route.ts`

- [ ] **Step 1: Implement action route**

```typescript
// src/app/api/rooms/[id]/action/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { broadcastRoomEvent } from '@/lib/events/broadcast'
import { getValidActions, getNextActiveSeat, isBettingRoundComplete } from '@/lib/poker/engine'
import { calculatePots, totalPot } from '@/lib/poker/pot'
import { findWinners, evaluateHand } from '@/lib/poker/evaluator'
import { deal } from '@/lib/poker/deck'
import { generateId } from '@/lib/utils'
import { startNewHand } from '../start/route'
import type { PlayerActionType, Street } from '@/types/domain'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json() as {
    playerId: string
    action: PlayerActionType
    amount?: number
  }

  const room = await store.getRoomById(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const hand = await store.getCurrentHand(id)
  if (!hand) return NextResponse.json({ error: 'No active hand' }, { status: 400 })

  const players = await store.getPlayersByRoom(id)
  const handPlayers = await store.getHandPlayers(hand.id)
  const actingHandPlayer = handPlayers.find(hp => hp.player_id === body.playerId)
  const actingPlayer = players.find(p => p.id === body.playerId)

  if (!actingHandPlayer || !actingPlayer) {
    return NextResponse.json({ error: 'Player not in hand' }, { status: 400 })
  }

  // Validate it's this player's turn
  if (actingPlayer.seat_index !== hand.current_seat) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
  }

  const validActions = getValidActions(actingHandPlayer, {
    currentBet: hand.current_bet,
    bigBlind: room.settings.bigBlind,
    playerChips: actingPlayer.chips,
  })

  // Apply action
  let newChips = actingPlayer.chips
  let newCurrentBet = actingHandPlayer.current_bet
  let newTotalBet = actingHandPlayer.total_bet
  let newStatus = actingHandPlayer.status

  if (body.action === 'fold') {
    newStatus = 'folded'
  } else if (body.action === 'check') {
    if (!validActions.canCheck) return NextResponse.json({ error: 'Cannot check' }, { status: 400 })
  } else if (body.action === 'call') {
    const callAmt = validActions.callAmount
    newChips -= callAmt
    newCurrentBet += callAmt
    newTotalBet += callAmt
  } else if (body.action === 'raise') {
    const raiseAmt = Math.max(body.amount ?? validActions.minRaise, validActions.minRaise)
    const totalNeeded = raiseAmt - actingHandPlayer.current_bet
    newChips -= totalNeeded
    newCurrentBet = raiseAmt
    newTotalBet += totalNeeded
  } else if (body.action === 'all_in') {
    newCurrentBet += actingPlayer.chips
    newTotalBet += actingPlayer.chips
    newChips = 0
    newStatus = 'all_in'
  }

  await store.updateHandPlayer(hand.id, body.playerId, {
    current_bet: newCurrentBet,
    total_bet: newTotalBet,
    status: newStatus,
  })
  await store.updatePlayer(body.playerId, { chips: newChips, status: newStatus === 'all_in' ? 'all_in' : actingPlayer.status })

  const newCurrentHandBet = body.action === 'raise' ? (body.amount ?? validActions.minRaise)
    : body.action === 'all_in' ? Math.max(hand.current_bet, newCurrentBet)
    : hand.current_bet

  await store.updateHand(hand.id, { current_bet: newCurrentHandBet })

  // Log action
  await store.createAction({
    id: generateId(),
    hand_id: hand.id,
    player_id: body.playerId,
    street: hand.street,
    action: body.action,
    amount: newTotalBet - actingHandPlayer.total_bet,
    acted_at: Date.now(),
  })

  const updatedHandPlayers = await store.getHandPlayers(hand.id)
  const pots = calculatePots(updatedHandPlayers.map(hp => {
    const p = players.find(pl => pl.id === hp.player_id)!
    return { playerId: hp.player_id, totalBet: hp.total_bet, status: hp.status }
  }))
  const pot = totalPot(pots)

  await broadcastRoomEvent(id, {
    type: 'player_action', playerId: body.playerId,
    action: body.action, amount: newTotalBet - actingHandPlayer.total_bet, pot,
  })

  // Check if only one player remaining
  const activePlayers = updatedHandPlayers.filter(hp => hp.status === 'active' || hp.status === 'all_in')
  const notFolded = updatedHandPlayers.filter(hp => hp.status !== 'folded')
  if (notFolded.length === 1) {
    // Everyone else folded — instant win
    await resolveHand(hand.id, id, [notFolded[0].player_id], pot, pots, updatedHandPlayers, players, room, hand.hand_number, hand.dealer_seat)
    return NextResponse.json({ ok: true })
  }

  // Check if betting round complete
  const roundComplete = isBettingRoundComplete(updatedHandPlayers, newCurrentHandBet, null)
  if (roundComplete) {
    await advanceStreet(hand, id, updatedHandPlayers, players, room, pot, pots)
  } else {
    // Find next player
    const seatedActive = players.filter(p => {
      const hp = updatedHandPlayers.find(hp => hp.player_id === p.id)
      return hp && hp.status === 'active' && p.seat_index !== null
    }).map(p => ({ seatIndex: p.seat_index!, status: 'active' as const }))

    const nextSeat = getNextActiveSeat(seatedActive, actingPlayer.seat_index!)
    await store.updateHand(hand.id, { current_seat: nextSeat })

    const nextPlayer = players.find(p => p.seat_index === nextSeat)!
    await broadcastRoomEvent(id, {
      type: 'turn_started',
      playerId: nextPlayer.id,
      seatIndex: nextSeat,
      timeoutSec: room.settings.turnTimerSec,
    })
  }

  return NextResponse.json({ ok: true })
}

async function advanceStreet(
  hand: import('@/types/domain').Hand,
  roomId: string,
  handPlayers: import('@/types/domain').HandPlayer[],
  players: import('@/types/domain').Player[],
  room: import('@/types/domain').Room,
  pot: number,
  pots: import('@/types/domain').SidePot[]
) {
  // Reset current_bet for all active players for new street
  for (const hp of handPlayers.filter(h => h.status === 'active')) {
    await store.updateHandPlayer(hand.id, hp.player_id, { current_bet: 0 })
  }
  await store.updateHand(hand.id, { current_bet: 0, pot })

  const streets: Street[] = ['preflop', 'flop', 'turn', 'river']
  const nextStreetMap: Record<string, Street> = {
    preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown'
  }
  const nextStreet = nextStreetMap[hand.street]

  if (nextStreet === 'showdown' || handPlayers.filter(hp => hp.status === 'active').length === 0) {
    // Deal remaining community cards if needed then showdown
    let deck = hand.deck
    let community = hand.community_cards
    if (community.length < 5) {
      const needed = 5 - community.length
      const { cards, remaining } = deal(deck, needed)
      community = [...community, ...cards]
      deck = remaining
      await store.updateHand(hand.id, { community_cards: community, deck, street: 'showdown' })
      await broadcastRoomEvent(roomId, { type: 'community_dealt', cards: community, street: 'showdown' })
    }
    await doShowdown(hand.id, roomId, handPlayers, players, room, pot, pots, community, hand.hand_number, hand.dealer_seat)
    return
  }

  // Deal community cards
  let deck = hand.deck
  let community = hand.community_cards
  const dealCount = nextStreet === 'flop' ? 3 : 1
  const { cards, remaining } = deal(deck, dealCount)
  community = [...community, ...cards]
  deck = remaining

  await store.updateHand(hand.id, { street: nextStreet, community_cards: community, deck })
  await broadcastRoomEvent(roomId, { type: 'community_dealt', cards: community, street: nextStreet })

  // Find first active player after dealer
  const sortedPlayers = [...players].sort((a, b) => a.seat_index! - b.seat_index!)
  const dealerIdx = sortedPlayers.findIndex(p => p.seat_index === hand.dealer_seat)
  const seatedActive = sortedPlayers.filter(p => {
    const hp = handPlayers.find(hp => hp.player_id === p.id)
    return hp && hp.status === 'active' && p.seat_index !== null
  }).map(p => ({ seatIndex: p.seat_index!, status: 'active' as const }))

  const firstSeat = getNextActiveSeat(seatedActive, hand.dealer_seat)
  await store.updateHand(hand.id, { current_seat: firstSeat })
  const firstPlayer = players.find(p => p.seat_index === firstSeat)!
  await broadcastRoomEvent(roomId, {
    type: 'turn_started',
    playerId: firstPlayer.id,
    seatIndex: firstSeat,
    timeoutSec: room.settings.turnTimerSec,
  })
}

async function doShowdown(
  handId: string,
  roomId: string,
  handPlayers: import('@/types/domain').HandPlayer[],
  players: import('@/types/domain').Player[],
  room: import('@/types/domain').Room,
  pot: number,
  pots: import('@/types/domain').SidePot[],
  community: import('@/types/domain').PokerCard[],
  handNumber: number,
  dealerSeat: number
) {
  const eligible = handPlayers.filter(hp => hp.status !== 'folded')
  const winnerIds = findWinners(
    eligible.map(hp => ({ playerId: hp.player_id, hole: hp.hole_cards })),
    community
  )

  // Evaluate hands for display
  const results = eligible.map(hp => ({
    playerId: hp.player_id,
    holeCards: hp.hole_cards,
    handName: evaluateHand(hp.hole_cards, community).name,
  }))

  await broadcastRoomEvent(roomId, { type: 'showdown', results })
  await resolveHand(handId, roomId, winnerIds, pot, pots, handPlayers, players, room, handNumber, dealerSeat)
}

async function resolveHand(
  handId: string,
  roomId: string,
  winnerIds: string[],
  pot: number,
  pots: import('@/types/domain').SidePot[],
  handPlayers: import('@/types/domain').HandPlayer[],
  players: import('@/types/domain').Player[],
  room: import('@/types/domain').Room,
  handNumber: number,
  dealerSeat: number
) {
  // Distribute chips
  const perWinner = Math.floor(pot / winnerIds.length)
  for (const wId of winnerIds) {
    const p = players.find(p => p.id === wId)!
    await store.updatePlayer(wId, { chips: p.chips + perWinner })
  }

  await store.updateHand(handId, {
    street: 'finished',
    winner_ids: winnerIds,
    finished_at: Date.now(),
  })

  const updatedPlayers = await store.getPlayersByRoom(roomId)
  await broadcastRoomEvent(roomId, {
    type: 'chips_updated',
    players: updatedPlayers.map(p => ({ id: p.id, chips: p.chips })),
  })

  // Check tournament elimination
  const activePlayers = updatedPlayers.filter(p => p.chips > 0 && p.seat_index !== null)

  await broadcastRoomEvent(roomId, {
    type: 'hand_finished',
    winnerIds,
    pot,
    nextDealerSeat: getNextDealerSeat(activePlayers, dealerSeat),
  })

  // Check end condition
  if (room.format === 'tournament' && activePlayers.length <= 1) {
    const rankings = [...updatedPlayers]
      .sort((a, b) => b.chips - a.chips)
      .map((p, i) => ({ playerId: p.id, displayName: p.display_name, chips: p.chips, rank: i + 1 }))
    await store.updateRoom(roomId, { status: 'finished' })
    await broadcastRoomEvent(roomId, { type: 'game_finished', rankings })
    return
  }

  // Start next hand after short delay (clients handle timing)
  const nextDealer = getNextDealerSeat(activePlayers, dealerSeat)
  await startNewHand(roomId, activePlayers, nextDealer, room.settings, handNumber + 1)
}

function getNextDealerSeat(players: import('@/types/domain').Player[], currentDealer: number): number {
  const sorted = [...players].sort((a, b) => a.seat_index! - b.seat_index!)
  const next = sorted.find(p => p.seat_index! > currentDealer)
  return next ? next.seat_index! : sorted[0].seat_index!
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/rooms/[id]/action/ src/app/api/rooms/[id]/start/
git commit -m "feat: add action API with full hand lifecycle"
```

---

## Task 15: Hole Cards API

**Files:**
- Create: `src/app/api/hands/[id]/my-cards/route.ts`

- [ ] **Step 1: Implement hole cards route**

```typescript
// src/app/api/hands/[id]/my-cards/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/hands/
git commit -m "feat: add hole cards API"
```

---

## Task 16: Card CSS Component

**Files:**
- Create: `src/components/Card.tsx`

- [ ] **Step 1: Implement Card component**

```tsx
// src/components/Card.tsx
import { cn } from '@/lib/utils'
import type { PokerCard } from '@/types/domain'

const SUIT_SYMBOL: Record<string, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
}

const RANK_DISPLAY: Record<string, string> = {
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
}

interface CardProps {
  card?: PokerCard
  faceDown?: boolean
  small?: boolean
  className?: string
}

export function Card({ card, faceDown = false, small = false, className }: CardProps) {
  if (faceDown || !card) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-white/30 bg-blue-900 flex items-center justify-center shadow-md',
        small ? 'w-8 h-11' : 'w-14 h-20',
        className
      )}>
        <div className={cn(
          'rounded border border-white/20 bg-blue-800',
          small ? 'w-5 h-8' : 'w-9 h-14'
        )} />
      </div>
    )
  }

  const isRed = card.suit === 'H' || card.suit === 'D'
  const rankLabel = RANK_DISPLAY[card.rank] ?? card.rank
  const suitSymbol = SUIT_SYMBOL[card.suit]

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white shadow-md flex flex-col justify-between p-1 select-none',
      small ? 'w-8 h-11' : 'w-14 h-20',
      className
    )}>
      <div className={cn(
        'font-bold leading-none',
        small ? 'text-xs' : 'text-base',
        isRed ? 'text-red-500' : 'text-gray-900'
      )}>
        <div>{rankLabel}</div>
        <div>{suitSymbol}</div>
      </div>
      {!small && (
        <div className={cn(
          'font-bold leading-none rotate-180 self-end',
          'text-base',
          isRed ? 'text-red-500' : 'text-gray-900'
        )}>
          <div>{rankLabel}</div>
          <div>{suitSymbol}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create GameQRCode component**

```tsx
// src/components/GameQRCode.tsx
'use client'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface GameQRCodeProps {
  joinCode: string
  size?: number
}

export function GameQRCode({ joinCode, size = 180 }: GameQRCodeProps) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    async function fetchUrl() {
      try {
        const res = await fetch('/api/local-url')
        const { networkUrl } = await res.json()
        const base = networkUrl ?? window.location.origin
        setUrl(`${base}/join/${joinCode}`)
      } catch {
        setUrl(`${window.location.origin}/join/${joinCode}`)
      }
    }
    fetchUrl()
  }, [joinCode])

  if (!url) return <div className="w-44 h-44 bg-gray-100 animate-pulse rounded" />

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl shadow">
        <QRCodeSVG value={url} size={size} />
      </div>
      <p className="text-2xl font-mono font-bold tracking-widest">{joinCode}</p>
      <p className="text-xs text-gray-500 break-all text-center">{url}</p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add Card CSS component and GameQRCode"
```

---

## Task 17: Home, Join, Create Pages

**Files:**
- Create: `src/app/page.tsx`, `src/app/join/page.tsx`, `src/app/create/page.tsx`

- [ ] **Step 1: Home page**

```tsx
// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [code, setCode] = useState('')
  const router = useRouter()

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold text-white">♠ Texas Hold'em</h1>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          className="w-full px-4 py-3 rounded-xl text-center text-2xl font-mono uppercase tracking-widest border-2 border-white/30 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white"
          placeholder="ENTER CODE"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && code.length === 6 && router.push(`/join/${code}`)}
        />
        <button
          className="w-full py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40"
          disabled={code.length !== 6}
          onClick={() => router.push(`/join/${code}`)}
        >
          Join Game
        </button>
        <button
          className="w-full py-3 rounded-xl border-2 border-white/40 text-white font-bold text-lg"
          onClick={() => router.push('/create')}
        >
          Create Room
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Join page**

```tsx
// src/app/join/page.tsx
'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

function JoinForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [code, setCode] = useState(params.get('code') ?? '')

  async function handleJoin() {
    const res = await fetch(`/api/rooms/${code.toUpperCase()}`)
    if (!res.ok) { alert('Room not found'); return }
    router.push(`/room/${code.toUpperCase()}`)
  }

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-white">Join Game</h1>
      <input
        className="px-4 py-3 rounded-xl text-center text-2xl font-mono uppercase tracking-widest border-2 border-white/30 bg-white/10 text-white focus:outline-none focus:border-white w-full max-w-xs"
        placeholder="XXXXXX"
        value={code}
        maxLength={6}
        onChange={e => setCode(e.target.value.toUpperCase())}
      />
      <button
        className="w-full max-w-xs py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40"
        disabled={code.length !== 6}
        onClick={handleJoin}
      >
        Join
      </button>
    </main>
  )
}

export default function JoinPage() {
  return <Suspense><JoinForm /></Suspense>
}
```

- [ ] **Step 3: Create page**

```tsx
// src/app/create/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomSettings } from '@/types/domain'

const DEFAULTS: RoomSettings = {
  maxPlayers: 6, startingChips: 1000, smallBlind: 10, bigBlind: 20,
  turnTimerSec: 30, anteEnabled: false, anteAmount: 0,
}

export default function CreatePage() {
  const router = useRouter()
  const [format, setFormat] = useState<'cash' | 'tournament'>('cash')
  const [settings, setSettings] = useState<RoomSettings>(DEFAULTS)
  const [name, setName] = useState('')
  const [asPlayer, setAsPlayer] = useState(true)
  const [loading, setLoading] = useState(false)

  function update(key: keyof RoomSettings, val: number | boolean) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function handleCreate() {
    if (!name.trim()) { alert('Enter your name'); return }
    setLoading(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, settings }),
    })
    const { room, hostPlayerId } = await res.json()

    // Join as player if host wants to play
    if (asPlayer) {
      await fetch(`/api/rooms/${room.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, isHost: true, playerId: hostPlayerId }),
      })
    }

    localStorage.setItem(`texasholdem_host_${room.join_code}`, hostPlayerId)
    localStorage.setItem(`texasholdem_player_${room.id}`, JSON.stringify({ playerId: hostPlayerId, displayName: name }))
    router.push(`/room/${room.join_code}`)
  }

  return (
    <main className="min-h-screen bg-green-900 p-6 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-white mt-4">Create Room</h1>

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-5 flex flex-col gap-4 text-white">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Your name</span>
          <input className="px-3 py-2 rounded-lg bg-white/20 placeholder-white/40 focus:outline-none"
            placeholder="Display name" value={name} maxLength={20}
            onChange={e => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Format</span>
          <div className="flex gap-2">
            {(['cash', 'tournament'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-lg font-semibold capitalize ${format === f ? 'bg-white text-green-900' : 'border border-white/40'}`}>
                {f}
              </button>
            ))}
          </div>
        </label>

        <NumberSetting label="Max Players" value={settings.maxPlayers} min={2} max={9} onChange={v => update('maxPlayers', v)} />
        <NumberSetting label="Starting Chips" value={settings.startingChips} min={100} max={100000} step={100} onChange={v => update('startingChips', v)} />
        <NumberSetting label="Small Blind" value={settings.smallBlind} min={1} max={1000} onChange={v => update('smallBlind', v)} />
        <NumberSetting label="Big Blind" value={settings.bigBlind} min={2} max={2000} onChange={v => update('bigBlind', v)} />
        <NumberSetting label="Turn Timer (sec)" value={settings.turnTimerSec} min={10} max={60} onChange={v => update('turnTimerSec', v)} />

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={asPlayer} onChange={e => setAsPlayer(e.target.checked)}
            className="w-5 h-5 rounded" />
          <span className="text-sm font-semibold">Play as a player (not just host)</span>
        </label>

        <button onClick={handleCreate} disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold text-lg disabled:opacity-40">
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </main>
  )
}

function NumberSetting({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} className="flex-1" />
        <span className="w-14 text-right font-mono">{value}</span>
      </div>
    </label>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/join/ src/app/create/
git commit -m "feat: add home, join, and create pages"
```

---

## Task 18: Room Page + Lobby View

**Files:**
- Create: `src/app/room/[code]/page.tsx`, `src/app/room/[code]/RoomClient.tsx`, `src/app/room/[code]/LobbyView.tsx`

- [ ] **Step 1: Room page server component**

```tsx
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
```

- [ ] **Step 2: RoomClient state machine**

```tsx
// src/app/room/[code]/RoomClient.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRoomStream } from '@/lib/hooks/useRoomStream'
import { useLocalPlayer } from '@/lib/hooks/useLocalPlayer'
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import type { PokerEvent } from '@/lib/events/types'
import { LobbyView } from './LobbyView'
import { GameView } from './GameView'
import { ResultView } from './ResultView'

interface RoomClientProps {
  initialRoom: Room
}

type ViewState = 'name_input' | 'lobby' | 'playing' | 'finished'

export function RoomClient({ initialRoom }: RoomClientProps) {
  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [hand, setHand] = useState<Hand | null>(null)
  const [myCards, setMyCards] = useState<PokerCard[]>([])
  const [currentSeat, setCurrentSeat] = useState<number | null>(null)
  const [view, setView] = useState<ViewState>(initialRoom.status === 'finished' ? 'finished' : 'name_input')
  const [name, setName] = useState('')
  const [rankings, setRankings] = useState<{ playerId: string; displayName: string; chips: number; rank: number }[]>([])

  const { getPlayer, savePlayer } = useLocalPlayer(room.id)
  const hostPlayerId = typeof window !== 'undefined' ? localStorage.getItem(`texasholdem_host_${room.join_code}`) : null

  // Restore session
  useEffect(() => {
    const saved = getPlayer()
    if (saved) {
      fetch(`/api/rooms/${room.id}/players`).then(r => r.json()).then(({ players: ps }: { players: Player[] }) => {
        setPlayers(ps)
        const me = ps.find(p => p.id === saved.playerId)
        if (me) { setMyPlayer(me); setView(room.status === 'playing' ? 'playing' : 'lobby') }
        else setView('name_input')
      })
    }
  }, [])

  useRoomStream(room.id, (event: PokerEvent) => {
    if (event.type === 'player_joined') {
      setPlayers(ps => ps.some(p => p.id === event.player.id) ? ps : [...ps, event.player])
    }
    if (event.type === 'player_left') {
      setPlayers(ps => ps.filter(p => p.id !== event.playerId))
    }
    if (event.type === 'game_started') {
      setView('playing')
    }
    if (event.type === 'hand_started') {
      // Fetch my cards
      if (myPlayer) {
        fetch(`/api/hands/${event.handId}/my-cards?playerId=${myPlayer.id}`)
          .then(r => r.json()).then(({ cards }) => setMyCards(cards))
      }
    }
    if (event.type === 'turn_started') {
      setCurrentSeat(event.seatIndex)
    }
    if (event.type === 'chips_updated') {
      setPlayers(ps => ps.map(p => {
        const upd = event.players.find(u => u.id === p.id)
        return upd ? { ...p, chips: upd.chips } : p
      }))
    }
    if (event.type === 'game_finished') {
      setRankings(event.rankings)
      setView('finished')
    }
  })

  async function handleJoin() {
    if (!name.trim()) return
    const res = await fetch(`/api/rooms/${room.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    const { player } = await res.json()
    savePlayer(player.id, name)
    setMyPlayer(player)
    setView('lobby')
  }

  async function handleStart() {
    await fetch(`/api/rooms/${room.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPlayerId }),
    })
  }

  if (view === 'name_input') {
    return (
      <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-3xl font-bold text-white">Join Table</h1>
        <input className="px-4 py-3 rounded-xl text-lg w-full max-w-xs bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white"
          placeholder="Your name" value={name} maxLength={20}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()} />
        <button onClick={handleJoin} disabled={!name.trim()}
          className="w-full max-w-xs py-3 rounded-xl bg-white text-green-900 font-bold text-lg disabled:opacity-40">
          Sit Down
        </button>
      </main>
    )
  }

  if (view === 'lobby') {
    return <LobbyView room={room} players={players} myPlayer={myPlayer} hostPlayerId={hostPlayerId} onStart={handleStart} />
  }

  if (view === 'finished') {
    return <ResultView rankings={rankings} />
  }

  return (
    <GameView
      room={room} players={players} myPlayer={myPlayer}
      hand={hand} myCards={myCards} currentSeat={currentSeat}
    />
  )
}
```

- [ ] **Step 3: LobbyView**

```tsx
// src/app/room/[code]/LobbyView.tsx
import { GameQRCode } from '@/components/GameQRCode'
import type { Room, Player } from '@/types/domain'

interface LobbyViewProps {
  room: Room
  players: Player[]
  myPlayer: Player | null
  hostPlayerId: string | null
  onStart: () => void
}

export function LobbyView({ room, players, myPlayer, hostPlayerId, onStart }: LobbyViewProps) {
  const isHost = myPlayer?.id === hostPlayerId || myPlayer?.is_host
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold text-white mt-4">Waiting for players...</h1>
      <GameQRCode joinCode={room.join_code} />

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 flex flex-col gap-3">
        <h2 className="text-white font-semibold">Players ({seated.length}/{room.settings.maxPlayers})</h2>
        {seated.map(p => (
          <div key={p.id} className="flex items-center justify-between text-white">
            <span>{p.display_name} {p.is_host && '👑'} {p.id === myPlayer?.id && '(you)'}</span>
            <span className="text-green-300 font-mono">{p.chips}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 text-white/70 text-sm">
        <div>{room.format === 'tournament' ? '🏆 Tournament' : '💰 Cash Game'}</div>
        <div>Blinds: {room.settings.smallBlind}/{room.settings.bigBlind}</div>
        <div>Starting chips: {room.settings.startingChips}</div>
        <div>Turn timer: {room.settings.turnTimerSec}s</div>
      </div>

      {isHost && seated.length >= 2 && (
        <button onClick={onStart}
          className="w-full max-w-sm py-4 rounded-xl bg-yellow-400 text-gray-900 font-bold text-xl">
          Start Game ▶
        </button>
      )}
      {isHost && seated.length < 2 && (
        <p className="text-white/60">Need at least 2 players to start</p>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/room/
git commit -m "feat: add room page, lobby view, and room client"
```

---

## Task 19: Game View + Table

**Files:**
- Create: `src/app/room/[code]/GameView.tsx`, `TableView.tsx`, `PlayerSlot.tsx`, `CommunityCards.tsx`, `MyCards.tsx`

- [ ] **Step 1: GameView container**

```tsx
// src/app/room/[code]/GameView.tsx
import type { Room, Player, Hand, PokerCard } from '@/types/domain'
import { TableView } from './TableView'
import { MyCards } from './MyCards'
import { ActionBar } from './ActionBar'
import { TurnTimer } from './TurnTimer'

interface GameViewProps {
  room: Room
  players: Player[]
  myPlayer: Player | null
  hand: Hand | null
  myCards: PokerCard[]
  currentSeat: number | null
}

export function GameView({ room, players, myPlayer, hand, myCards, currentSeat }: GameViewProps) {
  const isMyTurn = myPlayer?.seat_index === currentSeat

  async function handleAction(action: string, amount?: number) {
    if (!myPlayer) return
    await fetch(`/api/rooms/${room.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayer.id, action, amount }),
    })
  }

  return (
    <main className="min-h-screen bg-green-800 flex flex-col">
      <div className="flex-1 relative">
        <TableView
          players={players}
          myPlayerId={myPlayer?.id ?? null}
          currentSeat={currentSeat}
          communityCards={hand?.community_cards ?? []}
          pot={hand?.pot ?? 0}
        />
      </div>

      <div className="flex flex-col">
        {isMyTurn && hand && (
          <TurnTimer key={`${hand.id}-${currentSeat}`} seconds={room.settings.turnTimerSec} onTimeout={() => handleAction('fold')} />
        )}
        <MyCards cards={myCards} />
        {isMyTurn && hand && (
          <ActionBar
            currentBet={hand.current_bet}
            myCurrentBet={0}
            myChips={myPlayer?.chips ?? 0}
            bigBlind={room.settings.bigBlind}
            onAction={handleAction}
          />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: TableView**

```tsx
// src/app/room/[code]/TableView.tsx
import type { Player, PokerCard } from '@/types/domain'
import { PlayerSlot } from './PlayerSlot'
import { CommunityCards } from './CommunityCards'

interface TableViewProps {
  players: Player[]
  myPlayerId: string | null
  currentSeat: number | null
  communityCards: PokerCard[]
  pot: number
}

// Calculate oval positions for up to 9 seats
function getSeatPosition(seatIndex: number, total: number): { top: string; left: string } {
  const angle = ((seatIndex / total) * 2 * Math.PI) - Math.PI / 2
  const rx = 42, ry = 32 // % of container
  const cx = 50, cy = 50
  return {
    left: `${cx + rx * Math.cos(angle)}%`,
    top: `${cy + ry * Math.sin(angle)}%`,
  }
}

export function TableView({ players, myPlayerId, currentSeat, communityCards, pot }: TableViewProps) {
  const seated = players.filter(p => p.seat_index !== null)

  return (
    <div className="relative w-full" style={{ paddingBottom: '70%' }}>
      {/* Table felt */}
      <div className="absolute inset-4 rounded-full bg-green-700 border-4 border-yellow-800 shadow-2xl" />

      {/* Center: community cards + pot */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <CommunityCards cards={communityCards} />
        {pot > 0 && (
          <div className="bg-black/40 text-yellow-300 text-sm font-mono px-3 py-1 rounded-full">
            Pot: {pot}
          </div>
        )}
      </div>

      {/* Player slots */}
      {seated.map(player => {
        const pos = getSeatPosition(player.seat_index!, seated.length)
        return (
          <div key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}>
            <PlayerSlot
              player={player}
              isMe={player.id === myPlayerId}
              isActive={player.seat_index === currentSeat}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: PlayerSlot, CommunityCards, MyCards**

```tsx
// src/app/room/[code]/PlayerSlot.tsx
import type { Player } from '@/types/domain'
import { Card } from '@/components/Card'
import { cn } from '@/lib/utils'

export function PlayerSlot({ player, isMe, isActive }: {
  player: Player; isMe: boolean; isActive: boolean
}) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-center',
      isActive && 'ring-2 ring-yellow-400',
      isMe && 'bg-white/20',
      player.status === 'folded' && 'opacity-40',
    )}>
      {/* Face-down cards if still in hand */}
      {player.status !== 'folded' && player.status !== 'out' && (
        <div className="flex gap-0.5">
          <Card faceDown small />
          <Card faceDown small />
        </div>
      )}
      <span className="text-white text-xs font-semibold max-w-[60px] truncate">{player.display_name}</span>
      <span className="text-green-300 text-xs font-mono">{player.chips}</span>
    </div>
  )
}
```

```tsx
// src/app/room/[code]/CommunityCards.tsx
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} card={cards[i]} faceDown={!cards[i]} small />
      ))}
    </div>
  )
}
```

```tsx
// src/app/room/[code]/MyCards.tsx
import type { PokerCard } from '@/types/domain'
import { Card } from '@/components/Card'

export function MyCards({ cards }: { cards: PokerCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="flex justify-center gap-3 py-3 bg-black/20">
      {cards.map((card, i) => <Card key={i} card={card} />)}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/room/[code]/GameView.tsx src/app/room/[code]/TableView.tsx src/app/room/[code]/PlayerSlot.tsx src/app/room/[code]/CommunityCards.tsx src/app/room/[code]/MyCards.tsx
git commit -m "feat: add game view, table, and player slot components"
```

---

## Task 20: ActionBar + TurnTimer + ResultView

**Files:**
- Create: `src/app/room/[code]/ActionBar.tsx`, `TurnTimer.tsx`, `ResultView.tsx`

- [ ] **Step 1: ActionBar**

```tsx
// src/app/room/[code]/ActionBar.tsx
'use client'
import { useState } from 'react'

interface ActionBarProps {
  currentBet: number
  myCurrentBet: number
  myChips: number
  bigBlind: number
  onAction: (action: string, amount?: number) => void
}

export function ActionBar({ currentBet, myCurrentBet, myChips, bigBlind, onAction }: ActionBarProps) {
  const toCall = Math.max(0, currentBet - myCurrentBet)
  const canCheck = toCall === 0
  const minRaise = Math.max(currentBet + bigBlind, currentBet * 2)
  const [raiseAmount, setRaiseAmount] = useState(minRaise)

  return (
    <div className="flex flex-col gap-2 p-3 bg-black/30">
      {/* Raise slider */}
      <div className="flex items-center gap-2 text-white text-sm">
        <span className="w-12 text-right">Raise</span>
        <input type="range" className="flex-1" min={minRaise} max={myChips} value={raiseAmount}
          onChange={e => setRaiseAmount(Number(e.target.value))} />
        <span className="w-14 text-right font-mono">{raiseAmount}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onAction('fold')}
          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">
          Fold
        </button>
        {canCheck ? (
          <button onClick={() => onAction('check')}
            className="flex-1 py-3 rounded-xl bg-gray-600 text-white font-bold">
            Check
          </button>
        ) : (
          <button onClick={() => onAction('call')}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">
            Call {toCall}
          </button>
        )}
        <button onClick={() => onAction('raise', raiseAmount)}
          disabled={myChips <= toCall}
          className="flex-1 py-3 rounded-xl bg-yellow-500 text-gray-900 font-bold disabled:opacity-40">
          Raise
        </button>
      </div>

      {myChips > 0 && (
        <button onClick={() => onAction('all_in')}
          className="w-full py-2 rounded-xl border border-yellow-400 text-yellow-400 font-bold text-sm">
          All In ({myChips})
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TurnTimer**

```tsx
// src/app/room/[code]/TurnTimer.tsx
'use client'
import { useEffect, useState } from 'react'

export function TurnTimer({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(interval); onTimeout(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const pct = (remaining / seconds) * 100
  const color = pct > 50 ? 'bg-green-400' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="w-full h-1.5 bg-white/10">
      <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
```

- [ ] **Step 3: ResultView**

```tsx
// src/app/room/[code]/ResultView.tsx
import { useRouter } from 'next/navigation'

interface ResultViewProps {
  rankings: { playerId: string; displayName: string; chips: number; rank: number }[]
}

export function ResultView({ rankings }: ResultViewProps) {
  const router = useRouter()
  const medals = ['🥇', '🥈', '🥉']

  return (
    <main className="min-h-screen bg-green-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold text-white">Game Over</h1>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {rankings.map(r => (
          <div key={r.playerId} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 text-white">
            <span className="text-2xl">{medals[r.rank - 1] ?? r.rank}</span>
            <span className="font-semibold flex-1 ml-3">{r.displayName}</span>
            <span className="font-mono text-green-300">{r.chips}</span>
          </div>
        ))}
      </div>
      <button onClick={() => router.push('/')} className="mt-4 px-8 py-3 rounded-xl bg-white text-green-900 font-bold text-lg">
        New Game
      </button>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/room/[code]/ActionBar.tsx src/app/room/[code]/TurnTimer.tsx src/app/room/[code]/ResultView.tsx
git commit -m "feat: add action bar, turn timer, and result view"
```

---

## Task 21: Integration + Dev Test

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test happy path — 2 players, 1 hand**

1. Open http://localhost:3000/create — create a Cash game (2 players max, 100 chips, 10/20 blinds, 30s timer)
2. Copy join code, open a new browser tab → http://localhost:3000, enter code, enter a second name
3. Host clicks "Start Game ▶"
4. Verify: hole cards appear for each player, community cards empty, turn timer starts for UTG
5. UTG player: click Fold — verify pot goes to other player, next hand starts

- [ ] **Step 3: Test tournament end**

1. Create tournament room (2 players, 100 chips, 10/20 blinds)
2. Start game — one player goes all-in immediately, loses
3. Verify: ResultView shows rankings

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Texas Hold'em implementation"
git push
```

---

## Self-Review Notes

- **Spec coverage:** Architecture ✓, Data model ✓, State machine ✓, SSE events ✓, API endpoints ✓, Poker engine ✓, UI components ✓, Configurable rules ✓
- **Potential gap:** Tournament blind level-up timer — the spec mentions `blind_level_up` event but the plan doesn't implement a server-side timer for it. Simplification: in the current plan, blinds are fixed per the initial settings. Blind escalation can be added as a follow-up (requires a background job or per-hand check).
- **Type consistency:** `HandPlayer` used consistently throughout. `PokerCard` from `@/types/domain` used everywhere. `startNewHand` exported from start route and imported in action route — fragile; can be refactored to `src/lib/poker/handLifecycle.ts` in a follow-up if needed.

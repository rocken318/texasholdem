import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { getValidActions } from '@/lib/poker/engine'
import type { PokerCard } from '@/types/domain'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

function card(c: PokerCard): string {
  const r = c.rank === 'T' ? '10' : c.rank
  return `${r}${c.suit}`
}

function quickDecision(
  valid: ReturnType<typeof getValidActions>,
  hole: PokerCard[],
  street: string,
  currentBet: number,
  pot: number,
  chips: number,
  bb: number,
): { action: string; amount?: number } | null {
  const ranks = hole.map(c => 'A23456789TJQKA'.indexOf(c.rank === 'A' ? 'A' : c.rank))
  const highCard = Math.max(...ranks)
  const paired = hole[0].rank === hole[1].rank
  const suited = hole[0].suit === hole[1].suit
  const callAmt = valid.callAmount

  // No bet to face → check (always obvious)
  if (valid.canCheck && !valid.canCall) {
    return { action: 'check' }
  }

  // Preflop with garbage hand facing a bet → fold instantly
  if (street === 'preflop' && !paired && highCard < 10 && !suited && callAmt > bb) {
    return { action: 'fold' }
  }

  // Preflop small blind completing to BB with any hand → call
  if (street === 'preflop' && callAmt <= bb && valid.canCall) {
    return { action: 'call' }
  }

  // Facing huge bet (>40% stack) with weak hand → fold
  if (callAmt > chips * 0.4 && !paired && highCard < 11) {
    return { action: 'fold' }
  }

  // Complex situation → let AI decide
  return null
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await context.params
  const { botPlayerId } = await req.json() as { botPlayerId: string }

  const [room, hand, players] = await Promise.all([
    store.getRoomById(id),
    store.getCurrentHand(id),
    store.getPlayersByRoom(id),
  ])

  if (!room || !hand) return NextResponse.json({ action: 'fold' })

  const bot = players.find(p => p.id === botPlayerId)
  if (!bot) return NextResponse.json({ action: 'fold' })

  const handPlayers = await store.getHandPlayers(hand.id)
  const botHp = handPlayers.find(hp => hp.player_id === botPlayerId)
  if (!botHp || botHp.status !== 'active') return NextResponse.json({ action: 'fold' })

  const valid = getValidActions(botHp, {
    currentBet: hand.current_bet,
    bigBlind: room.settings.bigBlind,
    playerChips: bot.chips,
  })

  // Try quick heuristic first (instant, no API call)
  const quick = quickDecision(valid, botHp.hole_cards, hand.street, hand.current_bet, hand.pot, bot.chips, room.settings.bigBlind)
  if (quick) {
    return NextResponse.json(quick)
  }

  // Complex decision — use heuristic as default, upgrade with Gemini if available
  const r = Math.random()
  const bb = room.settings.bigBlind
  const ranks = botHp.hole_cards.map(c => 'A23456789TJQKA'.indexOf(c.rank === 'A' ? 'A' : c.rank))
  const highCard = Math.max(...ranks)
  const paired = botHp.hole_cards[0].rank === botHp.hole_cards[1].rank
  const suited = botHp.hole_cards[0].suit === botHp.hole_cards[1].suit
  const potOdds = hand.pot > 0 ? (valid.callAmount / (hand.pot + valid.callAmount)) : 0
  const maxReasonableRaise = Math.min(valid.maxRaise, bot.chips * 0.3 + hand.current_bet)

  let action: string
  let amount: number | undefined

  if (paired || (highCard >= 12 && suited)) {
    if (valid.canRaise && r < 0.5) {
      action = 'raise'
      amount = Math.min(hand.current_bet + bb * (2 + Math.floor(r * 2)), maxReasonableRaise)
      amount = Math.max(amount, valid.minRaise)
    } else if (valid.canCheck) {
      action = 'check'
    } else if (valid.canCall) {
      action = 'call'
    } else {
      action = 'fold'
    }
  } else if (highCard >= 10 || suited) {
    if (valid.canRaise && r < 0.15) {
      action = 'raise'
      amount = valid.minRaise
    } else if (valid.canCheck) {
      action = 'check'
    } else if (valid.canCall && potOdds < 0.3) {
      action = 'call'
    } else {
      action = valid.canCheck ? 'check' : 'fold'
    }
  } else {
    if (valid.canCheck) {
      action = 'check'
    } else if (valid.canCall && potOdds < 0.15 && r < 0.3) {
      action = 'call'
    } else {
      action = 'fold'
    }
  }

  // If Gemini available, let it override for complex decisions
  if (GEMINI_API_KEY) {
    const myCards = botHp.hole_cards.map(card).join(' ')
    const board = hand.community_cards.length ? hand.community_cards.map(card).join(' ') : '-'
    const others = players
      .filter(p => p.id !== botPlayerId && p.seat_index !== null)
      .map(p => {
        const hp = handPlayers.find(h => h.player_id === p.id)
        return `${p.display_name}(${hp?.status ?? '?'}) chips:${p.chips}`
      })
      .join(', ')
    const validList = [
      valid.canCheck && 'check',
      valid.canCall && `call(${valid.callAmount})`,
      valid.canRaise && `raise(min:${valid.minRaise} max:${valid.maxRaise})`,
      'fold',
      valid.canAllIn && 'all_in',
    ].filter(Boolean).join(' | ')

    const prompt =
`Texas Hold'em. You are a casual bot player. Play conservatively.
Hand: ${myCards}
Board: ${board} (${hand.street})
Pot: ${hand.pot}  CurrentBet: ${hand.current_bet}  YourChips: ${bot.chips}  BB: ${bb}
Opponents: ${others}
Valid: ${validList}

Rules:
- Prefer check or call with medium hands.
- Only raise with strong hands (top pair+, two pair+, sets, straights, flushes).
- When raising, keep it small: 2-3x the big blind above current bet.
- NEVER go all_in unless you have a very strong hand AND are short-stacked (chips < 5x BB).
- Fold weak hands when facing large bets.

Reply with exactly one line:
check / call / fold / all_in / raise <amount>`

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 15, temperature: 0.9 },
        }),
      })
      const data = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? ''

      if (raw.startsWith('fold')) action = 'fold'
      else if (raw.startsWith('check') && valid.canCheck) action = 'check'
      else if (raw.startsWith('call') && valid.canCall) action = 'call'
      else if ((raw.startsWith('all_in') || raw === 'all in') && valid.canAllIn) action = 'all_in'
      else if (raw.startsWith('raise') && valid.canRaise) {
        action = 'raise'
        const m = raw.match(/\d+/)
        amount = m ? Math.min(Math.max(parseInt(m[0]), valid.minRaise), valid.maxRaise) : valid.minRaise
      }
    } catch (e) {
      console.error('[ai-action] Gemini error:', e)
    }
  }

  return NextResponse.json({ action, amount })
  } catch (e) {
    console.error('[ai-action] unhandled error:', e)
    return NextResponse.json({ action: 'fold' })
  }
}

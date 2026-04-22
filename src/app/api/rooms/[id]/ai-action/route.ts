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
Pot: ${hand.pot}  CurrentBet: ${hand.current_bet}  YourChips: ${bot.chips}  BB: ${room.settings.bigBlind}
Opponents: ${others}
Valid: ${validList}

Rules:
- Prefer check or call with medium hands.
- Only raise with strong hands (top pair+, two pair+, sets, straights, flushes).
- When raising, keep it small: 2-3x the big blind above current bet.
- NEVER go all_in unless you have a very strong hand (two pair+ on the board) AND are short-stacked (chips < 5x BB).
- Fold weak hands when facing large bets.

Reply with exactly one line, nothing else:
check
call
fold
all_in
raise <amount>`

  // Simple heuristic fallback AI (used when Gemini unavailable or as default)
  let action: string
  let amount: number | undefined

  {
    // Evaluate hand strength roughly: pair, suited, high cards
    const ranks = botHp.hole_cards.map(c => 'A23456789TJQKA'.indexOf(c.rank === 'A' ? 'A' : c.rank))
    const highCard = Math.max(...ranks)
    const suited = botHp.hole_cards[0].suit === botHp.hole_cards[1].suit
    const paired = botHp.hole_cards[0].rank === botHp.hole_cards[1].rank
    const hasBoard = hand.community_cards.length > 0
    const potOdds = hand.pot > 0 ? (valid.callAmount / (hand.pot + valid.callAmount)) : 0

    // Randomness factor
    const r = Math.random()

    // Cap raise to reasonable % of stack to avoid instant bust scenarios
    const bb = room.settings.bigBlind
    const maxReasonableRaise = Math.min(valid.maxRaise, bot.chips * 0.3 + hand.current_bet)

    if (paired || (highCard >= 12 && suited)) {
      // Strong hand: raise sometimes, modest sizing
      if (valid.canRaise && r < 0.5) {
        action = 'raise'
        // Raise 2-3x big blind above current bet
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
      // Medium hand: sometimes raise min, usually call/check
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
      // Weak hand: mostly fold/check
      if (valid.canCheck) {
        action = 'check'
      } else if (valid.canCall && potOdds < 0.15 && r < 0.3) {
        action = 'call'
      } else {
        action = 'fold'
      }
    }
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ action, amount })
  }

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

  return NextResponse.json({ action, amount })
  } catch (e) {
    console.error('[ai-action] unhandled error:', e)
    return NextResponse.json({ action: 'fold' })
  }
}

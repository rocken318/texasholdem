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
`Texas Hold'em. You are the bot player.
Hand: ${myCards}
Board: ${board} (${hand.street})
Pot: ${hand.pot}  CurrentBet: ${hand.current_bet}  YourChips: ${bot.chips}  BB: ${room.settings.bigBlind}
Opponents: ${others}
Valid: ${validList}

Reply with exactly one line, nothing else:
check
call
fold
all_in
raise <amount>`

  let action = valid.canCheck ? 'check' : (valid.canCall ? 'call' : 'fold')
  let amount: number | undefined

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
}

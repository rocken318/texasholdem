// src/lib/poker/readyGate.ts
// In-memory gate: tracks which players have pressed "next" after a hand.
// When all required players are ready OR the timeout fires, the gate resolves.

interface Gate {
  resolve: () => void
  readyIds: Set<string>
  requiredIds: Set<string>
  timer: ReturnType<typeof setTimeout>
}

const gates = new Map<string, Gate>()
// Buffer for early ready calls that arrive before the gate opens
const earlyReady = new Map<string, Set<string>>()

export function openGate(
  roomId: string,
  playerIds: string[],
  timeoutMs: number,
): Promise<void> {
  // Close any lingering gate for this room first
  const existing = gates.get(roomId)
  if (existing) {
    clearTimeout(existing.timer)
    gates.delete(roomId)
  }

  return new Promise<void>(resolve => {
    const tryResolve = () => {
      const gate = gates.get(roomId)
      if (!gate) return
      clearTimeout(gate.timer)
      gates.delete(roomId)
      earlyReady.delete(roomId)
      resolve()
    }

    const timer = setTimeout(tryResolve, timeoutMs)

    const readyIds = new Set<string>()

    // Apply any early ready calls that arrived before the gate opened
    const buffered = earlyReady.get(roomId)
    if (buffered) {
      for (const id of buffered) readyIds.add(id)
      earlyReady.delete(roomId)
    }

    gates.set(roomId, {
      resolve: tryResolve,
      readyIds,
      requiredIds: new Set(playerIds),
      timer,
    })

    // Check if already all ready (from buffered calls)
    if (readyIds.size >= playerIds.length) {
      tryResolve()
    }
  })
}

export function markReady(roomId: string, playerId: string): void {
  const gate = gates.get(roomId)
  if (!gate) {
    // Gate not open yet — buffer the ready call
    if (!earlyReady.has(roomId)) earlyReady.set(roomId, new Set())
    earlyReady.get(roomId)!.add(playerId)
    return
  }
  gate.readyIds.add(playerId)
  if (gate.readyIds.size >= gate.requiredIds.size) {
    gate.resolve()
  }
}

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
      resolve()
    }

    const timer = setTimeout(tryResolve, timeoutMs)

    gates.set(roomId, {
      resolve: tryResolve,
      readyIds: new Set(),
      requiredIds: new Set(playerIds),
      timer,
    })
  })
}

export function markReady(roomId: string, playerId: string): void {
  const gate = gates.get(roomId)
  if (!gate) return
  gate.readyIds.add(playerId)
  if (gate.readyIds.size >= gate.requiredIds.size) {
    gate.resolve()
  }
}

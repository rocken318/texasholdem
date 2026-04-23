// Synthesized poker sound effects using Web Audio API
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noise(ac: AudioContext, duration: number, volume: number): AudioBufferSourceNode {
  const len = ac.sampleRate * duration
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * volume
  const src = ac.createBufferSource()
  src.buffer = buf
  return src
}

/** Card deal — smooth "su" slide sound */
export function playCardSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    // Soft bandpass noise sweep = card sliding on felt "スッ"
    const n = noise(ac, 0.12, 0.5)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1200, t)
    bp.frequency.exponentialRampToValueAtTime(600, t + 0.12)
    bp.Q.value = 0.8

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)

    n.connect(bp).connect(gain).connect(ac.destination)
    n.start(t)
    n.stop(t + 0.12)
  } catch {}
}

/** Chip bet / collect — sharp "kasha!" ceramic chip impact */
export function playChipSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    // Layer 1: sharp attack — highpass noise for the "ka" crack
    const n1 = noise(ac, 0.04, 0.8)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3000
    const g1 = ac.createGain()
    g1.gain.setValueAtTime(0.45, t)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    n1.connect(hp).connect(g1).connect(ac.destination)
    n1.start(t)
    n1.stop(t + 0.04)

    // Layer 2: "sha" tail — bandpass noise for the ceramic rattle
    const n2 = noise(ac, 0.1, 0.5)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(5000, t + 0.02)
    bp.frequency.exponentialRampToValueAtTime(2000, t + 0.1)
    bp.Q.value = 1.5
    const g2 = ac.createGain()
    g2.gain.setValueAtTime(0.3, t + 0.02)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    n2.connect(bp).connect(g2).connect(ac.destination)
    n2.start(t + 0.02)
    n2.stop(t + 0.1)

    // Layer 3: second chip landing — slightly delayed smaller impact
    const n3 = noise(ac, 0.03, 0.4)
    const hp2 = ac.createBiquadFilter()
    hp2.type = 'highpass'
    hp2.frequency.value = 4000
    const g3 = ac.createGain()
    g3.gain.setValueAtTime(0.2, t + 0.05)
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    n3.connect(hp2).connect(g3).connect(ac.destination)
    n3.start(t + 0.05)
    n3.stop(t + 0.08)
  } catch {}
}

/** Fold — soft whoosh */
export function playFoldSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const n = noise(ac, 0.2, 0.3)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(800, t)
    bp.frequency.exponentialRampToValueAtTime(300, t + 0.2)
    bp.Q.value = 1.5

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)

    n.connect(bp).connect(gain).connect(ac.destination)
    n.start(t)
    n.stop(t + 0.2)
  } catch {}
}

/** Check — soft tap */
export function playCheckSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, t)
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)

    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.08)
  } catch {}
}

/** All-in — dramatic rising tone */
export function playAllInSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15)

    const osc2 = ac.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(400, t + 0.05)
    osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.2)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)

    osc.connect(gain).connect(ac.destination)
    osc2.connect(gain)
    osc.start(t)
    osc.stop(t + 0.2)
    osc2.start(t + 0.05)
    osc2.stop(t + 0.3)
  } catch {}
}

/** Win — happy fanfare */
export function playWinSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const gain = ac.createGain()
      const start = t + i * 0.1
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch {}
}

/** Your turn notification — gentle ding */
export function playTurnSound() {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 880

    const osc2 = ac.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 1320

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

    osc.connect(gain).connect(ac.destination)
    osc2.connect(gain)
    osc.start(t)
    osc.stop(t + 0.4)
    osc2.start(t + 0.08)
    osc2.stop(t + 0.4)
  } catch {}
}

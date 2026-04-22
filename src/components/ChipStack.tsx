// src/components/ChipStack.tsx

interface ChipStackProps {
  amount: number
  small?: boolean
  className?: string
}

type ChipConfig = {
  body: string
  bodyEnd: string
}

function getChipConfig(amount: number): ChipConfig {
  if (amount >= 1000) return { body: '#7a5800', bodyEnd: '#c8960a' }   // gold
  if (amount >= 500)  return { body: '#3a0870', bodyEnd: '#6d22d0' }   // purple
  if (amount >= 100)  return { body: '#1a1a1a', bodyEnd: '#3a3a3a' }   // black/dark gray
  if (amount >= 25)   return { body: '#0a500a', bodyEnd: '#198019' }   // green
  if (amount >= 5)    return { body: '#7a0808', bodyEnd: '#c01515' }   // red
  return               { body: '#606060',  bodyEnd: '#aaaaaa' }          // silver/white
}

function getChipCount(amount: number): number {
  if (amount <= 0)    return 0
  if (amount < 5)     return 1
  if (amount < 25)    return 2
  if (amount < 100)   return 3
  if (amount < 500)   return 4
  return 5
}

function getLabel(amount: number): string {
  if (amount >= 10000) return `${Math.round(amount / 1000)}K`
  if (amount >= 1000)  return `${amount / 1000}K`
  if (amount >= 500)   return '500'
  if (amount >= 100)   return '100'
  if (amount >= 25)    return '25'
  if (amount >= 5)     return '5'
  return '1'
}

function SingleChip({ config, size, label }: { config: ChipConfig; size: number; label: string }) {
  const r = size / 2
  const spotR = Math.max(1.8, size * 0.075)
  const spotOffset = r * 0.88
  const innerR = r * 0.72
  const faceR = r * 0.52
  const uid = `chip-${config.body.replace('#', '')}-${size}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id={`body-${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor={config.bodyEnd} />
          <stop offset="100%" stopColor={config.body} />
        </radialGradient>
        <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ffd700" />
          <stop offset="28%"  stopColor="#fffacd" />
          <stop offset="58%"  stopColor="#c8a400" />
          <stop offset="100%" stopColor="#8b6820" />
        </linearGradient>
        <radialGradient id={`face-${uid}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={config.bodyEnd} />
          <stop offset="100%" stopColor={config.body} />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx={r} cy={r + 3} rx={r * 0.9} ry={r * 0.28}
        fill="rgba(0,0,0,0.65)" style={{ filter: 'blur(3px)' }} />

      {/* Body */}
      <circle cx={r} cy={r} r={r - 0.5} fill={`url(#body-${uid})`} />

      {/* Gold rim */}
      <circle cx={r} cy={r} r={r - 0.5} fill="none"
        stroke={`url(#gold-${uid})`} strokeWidth={Math.max(2.5, size * 0.12)}
        style={{ filter: `drop-shadow(0 0 ${size * 0.12}px rgba(255,215,0,0.75))` }} />

      {/* Edge spots — cardinal */}
      <circle cx={r}            cy={spotR}         r={spotR} fill="#ffd700" opacity="0.9" />
      <circle cx={r}            cy={size - spotR}  r={spotR} fill="#ffd700" opacity="0.9" />
      <circle cx={spotR}        cy={r}             r={spotR} fill="#ffd700" opacity="0.9" />
      <circle cx={size - spotR} cy={r}             r={spotR} fill="#ffd700" opacity="0.9" />

      {/* Edge spots — diagonal */}
      <circle cx={r - spotOffset * 0.707} cy={r - spotOffset * 0.707} r={spotR * 0.8} fill="#ffd700" opacity="0.7" />
      <circle cx={r + spotOffset * 0.707} cy={r - spotOffset * 0.707} r={spotR * 0.8} fill="#ffd700" opacity="0.7" />
      <circle cx={r - spotOffset * 0.707} cy={r + spotOffset * 0.707} r={spotR * 0.8} fill="#ffd700" opacity="0.7" />
      <circle cx={r + spotOffset * 0.707} cy={r + spotOffset * 0.707} r={spotR * 0.8} fill="#ffd700" opacity="0.7" />

      {/* Inner gold ring (dashed) */}
      <circle cx={r} cy={r} r={innerR} fill="none"
        stroke="#ffd700" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 3" />

      {/* Face */}
      <circle cx={r} cy={r} r={faceR} fill={`url(#face-${uid})`} />

      {/* Shine highlight */}
      <ellipse
        cx={r * 0.72} cy={r * 0.68}
        rx={faceR * 0.65} ry={faceR * 0.38}
        fill="rgba(255,255,255,0.1)"
        transform={`rotate(-22,${r * 0.72},${r * 0.68})`}
      />

      {/* Label */}
      <text
        x={r} y={r + size * 0.12}
        textAnchor="middle"
        fill="#ffd700"
        fontSize={size * 0.22}
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.3"
      >
        {label}
      </text>
    </svg>
  )
}

export function ChipStack({ amount, small = false, className = '' }: ChipStackProps) {
  if (amount <= 0) return null

  const chipCount = getChipCount(amount)
  const config = getChipConfig(amount)
  const label = getLabel(amount)
  const size = small ? 26 : 32
  const sliceH = small ? 5 : 6
  const slices = chipCount - 1
  const totalH = size + slices * sliceH

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size + 4, height: totalH }}>
        {/* Stack edge slices */}
        {Array.from({ length: slices }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: i * sliceH,
              left: 0,
              width: size + 4,
              height: sliceH + 3,
              borderRadius: '50% / 45%',
              background: `linear-gradient(180deg, ${config.bodyEnd} 0%, ${config.body} 100%)`,
              boxShadow: i === 0 ? '0 2px 4px rgba(0,0,0,0.6)' : undefined,
            }}
          />
        ))}
        {/* Top chip */}
        <div style={{ position: 'absolute', bottom: slices * sliceH, left: 2 }}>
          <SingleChip config={config} size={size} label={label} />
        </div>
      </div>
      {/* Amount label */}
      <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 3, padding: '0 2px', marginTop: 1 }}>
        <span
          style={{
            fontSize: small ? 9 : 11,
            color: '#ffd700',
            fontWeight: 900,
            fontFamily: 'monospace',
            textShadow: '0 0 6px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {amount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

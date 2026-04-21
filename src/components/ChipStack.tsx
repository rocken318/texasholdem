// src/components/ChipStack.tsx

interface ChipStackProps {
  amount: number
  small?: boolean
  className?: string
}

type ChipColor = {
  base: string
  shadow: string
  edge: string
}

function getChipColor(amount: number): ChipColor {
  if (amount >= 1000) return { base: '#8B5CF6', shadow: '#5B21B6', edge: '#7C3AED' } // purple
  if (amount >= 500) return { base: '#1F2937', shadow: '#000000', edge: '#374151' }  // black
  if (amount >= 100) return { base: '#16A34A', shadow: '#0B6E2F', edge: '#15803D' }  // green
  if (amount >= 25) return { base: '#3B82F6', shadow: '#1D4ED8', edge: '#2563EB' }   // blue
  if (amount >= 5) return { base: '#EF4444', shadow: '#991B1B', edge: '#DC2626' }    // red
  return { base: '#E5E7EB', shadow: '#9CA3AF', edge: '#D1D5DB' }                     // white
}

function getChipCount(amount: number): number {
  if (amount <= 0) return 0
  if (amount < 5) return 1
  if (amount < 25) return 2
  if (amount < 100) return 3
  if (amount < 500) return 4
  return 5
}

export function ChipStack({ amount, small = false, className = '' }: ChipStackProps) {
  if (amount <= 0) return null

  const chipCount = getChipCount(amount)
  const color = getChipColor(amount)
  const size = small ? 16 : 20
  const sliceHeight = small ? 3 : 4
  const topHeight = small ? 14 : 18

  // Build stack: bottom slices + top cap
  const slices = chipCount - 1 // number of visible edge slices below the top
  const totalHeight = topHeight + slices * sliceHeight

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Chip stack */}
      <div
        className="relative"
        style={{
          width: size + 4,
          height: totalHeight,
        }}
      >
        {/* Edge slices (bottom to top) */}
        {Array.from({ length: slices }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: i * sliceHeight,
              left: 0,
              width: size + 4,
              height: sliceHeight + 2,
              borderRadius: '50% / 40%',
              background: `linear-gradient(180deg, ${color.edge} 0%, ${color.shadow} 100%)`,
              boxShadow: i === 0 ? `0 2px 3px rgba(0,0,0,0.5)` : undefined,
            }}
          />
        ))}

        {/* Top chip (full circle with dashed ring) */}
        <div
          style={{
            position: 'absolute',
            bottom: slices * sliceHeight,
            left: (size + 4 - size) / 2,
            width: size,
            height: topHeight,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${color.base} 0%, ${color.shadow} 100%)`,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.3)`,
          }}
        >
          {/* White dashed inner ring */}
          <div
            style={{
              position: 'absolute',
              top: small ? 2 : 3,
              left: small ? 2 : 3,
              right: small ? 2 : 3,
              bottom: small ? 2 : 3,
              borderRadius: '50%',
              border: `${small ? 1 : 1.5}px dashed rgba(255,255,255,0.55)`,
            }}
          />
        </div>
      </div>

      {/* Amount label */}
      <span
        className="font-mono font-bold whitespace-nowrap mt-0.5"
        style={{
          fontSize: small ? 8 : 10,
          color: '#FFD700',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          lineHeight: 1,
        }}
      >
        {amount.toLocaleString()}
      </span>
    </div>
  )
}

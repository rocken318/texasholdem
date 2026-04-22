# Luxury UI — Neon Vegas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the poker table UI into a luxury Neon Vegas aesthetic — casino photo background with black overlay, SVG wood-grain table rail, neon-purple felt and glow accents throughout.

**Architecture:** Background image lives in `public/bg/casino.png` and is applied as a full-screen layer in `GameView.tsx`. The table rail becomes an inline SVG using `feTurbulence` for real wood-grain texture. All gold/teal/amber accent colors are replaced with neon-purple (`#bf80ff` / `#7c3aed`) across `TableView`, `PlayerSlot`, `ActionBar`, `MyCards`, and `globals.css`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, inline SVG filters (`feTurbulence`, `feColorMatrix`, `feComposite`)

---

## File Map

| File | Change |
|------|--------|
| `public/bg/casino.png` | **Create** — copy from `files/back/04_flux-2_casino_interior.png` |
| `src/app/room/[code]/GameView.tsx` | **Modify** — add background image + black overlay layer |
| `src/app/room/[code]/TableView.tsx` | **Modify** — SVG wood-grain rail, neon-purple felt/ring |
| `src/app/room/[code]/PlayerSlot.tsx` | **Modify** — neon-purple avatar, glow, active ring |
| `src/app/room/[code]/MyCards.tsx` | **Modify** — purple neon ring on hole cards |
| `src/app/globals.css` | **Modify** — slider thumb/track in purple |

---

## Task 1: Background image

**Files:**
- Create: `public/bg/casino.png`

- [ ] **Step 1: Copy the image**

```bash
mkdir -p public/bg
cp files/back/04_flux-2_casino_interior.png public/bg/casino.png
```

- [ ] **Step 2: Verify**

```bash
ls -lh public/bg/casino.png
```

Expected: file exists, size > 0.

- [ ] **Step 3: Commit**

```bash
git add public/bg/casino.png
git commit -m "feat: add casino background image"
```

---

## Task 2: Apply background in GameView

**Files:**
- Modify: `src/app/room/[code]/GameView.tsx`

The outermost `<main>` currently has `bg-green-800`. Replace with a full-screen photo background + `rgba(0,0,0,0.6)` overlay.

- [ ] **Step 1: Update `GameView.tsx`**

Replace the opening `<main>` tag (line 80):

```tsx
// BEFORE
<main className="h-[100dvh] bg-green-800 flex flex-col overflow-hidden">

// AFTER
<main
  className="h-[100dvh] flex flex-col overflow-hidden relative"
  style={{
    backgroundImage: "url('/bg/casino.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center 30%',
  }}
>
  {/* Dark overlay */}
  <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />
```

Also wrap the existing children in a `relative z-10` container so they sit above the overlay. Replace the closing `</main>` pattern — all content after the overlay div should be wrapped:

```tsx
  {/* Dark overlay */}
  <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />

  {/* Content above overlay */}
  <div className="relative z-10 flex flex-col h-full overflow-hidden">
    {/* Hand result overlay */}
    {handResult && ( ... existing JSX ... )}

    {/* Action toast */}
    {toastData && ( ... existing JSX ... )}

    <div className="flex-1 min-h-0 flex items-center overflow-hidden">
      <TableView ... />
    </div>

    <div className="flex-shrink-0 flex flex-col">
      {isMyTurn && hand && <TurnTimer ... />}
      <MyCards ... />
      {isMyTurn && hand && myPlayer && <ActionBar ... />}
    </div>
  </div>
</main>
```

- [ ] **Step 2: Run dev server and visually verify the background appears with dark overlay**

```bash
npm run dev
```

Open the game view in browser. Background photo should be visible with dark overlay.

- [ ] **Step 3: Commit**

```bash
git add src/app/room/[code]/GameView.tsx
git commit -m "feat: casino photo background with dark overlay"
```

---

## Task 3: Wood-grain table rail + neon felt

**Files:**
- Modify: `src/app/room/[code]/TableView.tsx`

Replace the current gradient-based rail divs with an inline SVG that uses `feTurbulence` to generate a real mahogany wood-grain texture. Replace green felt with deep dark-purple neon felt. Replace gold trim ring with neon-purple glow ring.

- [ ] **Step 1: Replace the rail, ring, and felt layers in `TableView.tsx`**

The current layers (lines 46–98) are: outer rail div, rail highlight div, gold trim ring div, main felt div, felt texture overlay div, center glow div.

Replace all of them with this structure inside the `relative w-full paddingBottom:70%` wrapper:

```tsx
{/* ── Wood-grain rail (SVG feTurbulence) ── */}
<svg
  className="absolute inset-2"
  style={{ borderRadius: '50%', overflow: 'hidden' }}
  width="100%" height="100%"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <filter id="woodgrain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      {/* Base turbulence for grain direction */}
      <feTurbulence
        type="turbulence"
        baseFrequency="0.012 0.45"
        numOctaves="5"
        seed="8"
        result="grain"
      />
      {/* Shift to dark mahogany palette */}
      <feColorMatrix
        in="grain"
        type="matrix"
        values="0.55 0.25 0.05 0 0.10
                0.28 0.12 0.02 0 0.04
                0.08 0.03 0.01 0 0.01
                0    0    0    1 0"
        result="mahogany"
      />
      {/* Darken edges to create depth */}
      <feComposite in="mahogany" in2="mahogany" operator="arithmetic" k1="0" k2="1.1" k3="0" k4="-0.08" />
    </filter>

    {/* Neon purple glow ring as SVG filter */}
    <filter id="neonring" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="0.75 0 0 0 0
                0.31 0 0 0 0
                1    0 0 0 0
                0    0 0 8 -2"
        result="glow"
      />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* Outer shadow drop */}
  <ellipse cx="50%" cy="50%" rx="49%" ry="49%"
    fill="rgba(0,0,0,0.85)"
    style={{ filter: 'blur(8px)' }}
  />

  {/* Wood grain rail fill */}
  <ellipse cx="50%" cy="50%" rx="48%" ry="48%"
    fill="url(#woodgrain-rect)"
    style={{ filter: 'url(#woodgrain)' }}
  />
  {/* Overlay rectangle to fill wood color (filter drives the texture) */}
  <rect width="100%" height="100%" fill="#3d1f0a" style={{ filter: 'url(#woodgrain)', clipPath: 'ellipse(48% 48% at 50% 50%)' }} />

  {/* Bevel highlight top */}
  <ellipse cx="50%" cy="44%" rx="45%" ry="42%"
    fill="none"
    stroke="rgba(255,255,255,0.06)"
    strokeWidth="1.5"
  />

  {/* Neon purple glow ring */}
  <ellipse cx="50%" cy="50%" rx="41%" ry="41%"
    fill="none"
    stroke="rgba(180,80,255,0.75)"
    strokeWidth="1.5"
    style={{ filter: 'drop-shadow(0 0 6px rgba(180,80,255,0.8)) drop-shadow(0 0 14px rgba(180,80,255,0.4))' }}
  />

  {/* Felt surface */}
  <ellipse cx="50%" cy="50%" rx="39%" ry="39%"
    fill="url(#feltGrad)"
  />

  <defs>
    <radialGradient id="feltGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%"   stopColor="#1a0040" />
      <stop offset="45%"  stopColor="#0f0028" />
      <stop offset="100%" stopColor="#08001a" />
    </radialGradient>
  </defs>

  {/* Felt center glow */}
  <ellipse cx="50%" cy="45%" rx="25%" ry="22%"
    fill="rgba(120,40,200,0.10)"
    style={{ filter: 'blur(6px)' }}
  />
</svg>
```

> Note: SVG `<defs>` can only be declared once per SVG element. Move both `<defs>` blocks into a single `<defs>` at the top of the SVG. The second `<defs>` for `feltGrad` should be merged into the first.

Complete corrected SVG (single `<defs>` block):

```tsx
<svg
  className="absolute inset-2"
  style={{ borderRadius: '50%', overflow: 'hidden' }}
  width="100%" height="100%"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <filter id="woodgrain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.012 0.45" numOctaves="5" seed="8" result="grain" />
      <feColorMatrix in="grain" type="matrix"
        values="0.55 0.25 0.05 0 0.10
                0.28 0.12 0.02 0 0.04
                0.08 0.03 0.01 0 0.01
                0    0    0    1 0"
      />
    </filter>
    <radialGradient id="feltGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%"   stopColor="#1a0040" />
      <stop offset="45%"  stopColor="#0f0028" />
      <stop offset="100%" stopColor="#08001a" />
    </radialGradient>
  </defs>

  {/* Drop shadow */}
  <ellipse cx="50%" cy="50%" rx="49%" ry="49%"
    fill="rgba(0,0,0,0.8)" style={{ filter: 'blur(10px)' }} />

  {/* Wood grain rail */}
  <ellipse cx="50%" cy="50%" rx="48%" ry="48%"
    fill="#3d1f0a" style={{ filter: 'url(#woodgrain)' }} />

  {/* Top bevel highlight */}
  <ellipse cx="50%" cy="44%" rx="45%" ry="42%"
    fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />

  {/* Neon purple glow ring */}
  <ellipse cx="50%" cy="50%" rx="41%" ry="41%"
    fill="none"
    stroke="rgba(180,80,255,0.8)"
    strokeWidth="1.5"
    style={{ filter: 'drop-shadow(0 0 5px rgba(180,80,255,0.9)) drop-shadow(0 0 12px rgba(180,80,255,0.5))' }}
  />

  {/* Felt */}
  <ellipse cx="50%" cy="50%" rx="39%" ry="39%"
    fill="url(#feltGrad)" />

  {/* Felt center glow */}
  <ellipse cx="50%" cy="45%" rx="24%" ry="20%"
    fill="rgba(120,40,200,0.12)"
    style={{ filter: 'blur(8px)' }} />
</svg>
```

- [ ] **Step 2: Remove the old rail/felt divs**

Delete lines 46–98 of `TableView.tsx` (the six separate `<div>` layers for rail, bevel, ring, felt, texture, glow).

- [ ] **Step 3: Update felt/glow colors on the center content overlay**

The center area div (currently `inset-6 rounded-[50%]` for the felt) should now use `inset-[21%]` (matching the SVG felt ellipse at 39% radius) or simply remain as `inset-0` with flex centering. Keep the existing `absolute inset-0 flex flex-col items-center justify-center gap-10` center div — it already uses z-index positioning and will render above the SVG.

- [ ] **Step 4: Update POT badge colors from gold to neon purple**

In `TableView.tsx` lines 107–118, update the POT badge:

```tsx
// BEFORE
border: '1px solid rgba(212,175,55,0.3)',
// "POT" label:  style={{ color: '#D4AF37' }}
// amount:       style={{ color: '#5ce65c' }}

// AFTER
border: '1px solid rgba(180,80,255,0.35)',
// "POT" label:  style={{ color: '#bf80ff' }}
// amount:       style={{ color: '#bf80ff' }}
```

- [ ] **Step 5: Visually verify** — run `npm run dev`, open game view. Table should show dark mahogany wood grain rail with purple neon ring and deep purple felt.

- [ ] **Step 6: Commit**

```bash
git add src/app/room/[code]/TableView.tsx
git commit -m "feat: SVG wood-grain table rail + neon purple felt"
```

---

## Task 4: Neon-purple PlayerSlot

**Files:**
- Modify: `src/app/room/[code]/PlayerSlot.tsx`

Replace gold (#D4AF37) accent color throughout with neon purple (#bf80ff / rgba(180,80,255,x)).

- [ ] **Step 1: Update `PlayerSlot.tsx` — player HUD background and border**

```tsx
// BEFORE (isMe branch)
background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(30,30,30,0.85) 40%, rgba(20,20,20,0.92) 100%)'
border: '1px solid rgba(212,175,55,0.4)'

// AFTER (isMe branch)
background: 'linear-gradient(180deg, rgba(140,50,255,0.18) 0%, rgba(20,10,40,0.88) 40%, rgba(12,5,28,0.95) 100%)'
border: '1px solid rgba(180,80,255,0.45)'
```

- [ ] **Step 2: Update active glow box-shadow**

```tsx
// BEFORE
boxShadow: isActive
  ? '0 0 12px rgba(212,175,55,0.6), 0 0 24px rgba(212,175,55,0.3)'
  : '0 2px 8px rgba(0,0,0,0.5)',

// AFTER
boxShadow: isActive
  ? '0 0 14px rgba(180,80,255,0.75), 0 0 28px rgba(180,80,255,0.35)'
  : '0 2px 8px rgba(0,0,0,0.6)',
```

- [ ] **Step 3: Update the pulsing active ring div**

```tsx
// BEFORE
border: '2px solid #D4AF37',
boxShadow: '0 0 8px rgba(212,175,55,0.5)',

// AFTER
border: '2px solid #bf80ff',
boxShadow: '0 0 8px rgba(180,80,255,0.6)',
```

- [ ] **Step 4: Update the countdown bar**

```tsx
// BEFORE
background: 'linear-gradient(90deg, #D4AF37, #F5D060)',

// AFTER
background: 'linear-gradient(90deg, #7c3aed, #bf80ff)',
```

- [ ] **Step 5: Update avatar ring**

```tsx
// BEFORE
className={cn('w-8 h-8 rounded-full ...', isActive && 'ring-2 ring-[#D4AF37] ring-offset-1 ...')}

// AFTER
className={cn('w-8 h-8 rounded-full ...', isActive && 'ring-2 ring-[#bf80ff] ring-offset-1 ...')}
```

- [ ] **Step 6: Update isMe avatar gradient**

```tsx
// BEFORE
background: isMe
  ? 'linear-gradient(135deg, #D4AF37 0%, #8B7320 100%)'
  : 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
color: isMe ? '#1a1a1a' : '#e2e8f0',

// AFTER
background: isMe
  ? 'linear-gradient(135deg, #bf80ff 0%, #7c3aed 100%)'
  : 'linear-gradient(135deg, #3a2060 0%, #1e0f40 100%)',
color: '#fff',
```

- [ ] **Step 7: Update player name color for isMe**

```tsx
// BEFORE
isMe ? 'text-[#F5D060]' : 'text-white/90',

// AFTER
isMe ? 'text-[#d4a0ff]' : 'text-white/85',
```

- [ ] **Step 8: Update BET badge and All-In badge**

BET badge:
```tsx
// BEFORE
background: 'linear-gradient(180deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.1) 100%)',
border: '1px solid rgba(212,175,55,0.3)',
// BET label color: '#D4AF37'
// amount color: '#FFD700'

// AFTER
background: 'linear-gradient(180deg, rgba(180,80,255,0.25) 0%, rgba(180,80,255,0.1) 100%)',
border: '1px solid rgba(180,80,255,0.35)',
// BET label color: '#bf80ff'
// amount color: '#d4a0ff'
```

All-In badge:
```tsx
// BEFORE
background: 'linear-gradient(90deg, #D4AF37, #F5D060)',
color: '#1a1a1a',

// AFTER
background: 'linear-gradient(90deg, #7c3aed, #bf80ff)',
color: '#fff',
```

- [ ] **Step 9: Commit**

```bash
git add src/app/room/[code]/PlayerSlot.tsx
git commit -m "feat: neon purple player slots"
```

---

## Task 5: Neon purple on MyCards and ActionBar

**Files:**
- Modify: `src/app/room/[code]/MyCards.tsx`
- Modify: `src/app/room/[code]/ActionBar.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `MyCards.tsx` — hole card ring color**

```tsx
// BEFORE
className="ring-2 ring-amber-400/60 shadow-2xl"

// AFTER
className="ring-2 ring-[#bf80ff]/70 shadow-2xl"
```

Also update the drop shadow filter to have a purple tint:
```tsx
// BEFORE
style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}

// AFTER
style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(140,50,255,0.3))' }}
```

- [ ] **Step 2: Update `ActionBar.tsx` — preset buttons and raise amount box**

Preset buttons (currently `text-amber-200/90 active:bg-amber-500/30 active:border-amber-400/40`):
```tsx
// AFTER
className="flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wide
  bg-white/8 text-purple-200/90 border border-white/10
  active:bg-purple-500/30 active:border-purple-400/40
  transition-colors duration-100"
```

Raise amount display (currently `border-amber-400/30 text-amber-300`):
```tsx
// AFTER: border-[rgba(180,80,255,0.35)] text-[#d4a0ff]
className="min-w-[4.5rem] py-1.5 px-2 rounded-lg text-center
  bg-black/50 border border-[rgba(180,80,255,0.35)] font-mono text-sm font-bold text-[#d4a0ff] tabular-nums"
```

- [ ] **Step 3: Update `globals.css` — slider thumb/track to purple**

```css
/* BEFORE */
.action-slider::-webkit-slider-thumb {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border: 2px solid #fde68a;
  box-shadow: 0 0 8px rgba(251, 191, 35, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4);
}
.action-slider::-moz-range-thumb {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border: 2px solid #fde68a;
  box-shadow: 0 0 8px rgba(251, 191, 35, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4);
}
.slider-track-fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

/* AFTER */
.action-slider::-webkit-slider-thumb {
  background: linear-gradient(135deg, #bf80ff, #7c3aed);
  border: 2px solid #d4a0ff;
  box-shadow: 0 0 8px rgba(180, 80, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4);
}
.action-slider::-moz-range-thumb {
  background: linear-gradient(135deg, #bf80ff, #7c3aed);
  border: 2px solid #d4a0ff;
  box-shadow: 0 0 8px rgba(180, 80, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4);
}
.slider-track-fill {
  background: linear-gradient(90deg, #7c3aed, #bf80ff);
}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 28 passed.

- [ ] **Step 6: Commit**

```bash
git add src/app/room/[code]/MyCards.tsx src/app/room/[code]/ActionBar.tsx src/app/globals.css
git commit -m "feat: neon purple accents on cards, action bar, and slider"
```

---

## Task 6: Final visual polish

**Files:**
- Modify: `src/app/room/[code]/TableView.tsx` — chip badge colors
- Modify: `src/components/ChipStack.tsx` — check if chip colors need updating

- [ ] **Step 1: Read `ChipStack.tsx` to understand chip color logic**

```bash
cat src/components/ChipStack.tsx
```

- [ ] **Step 2: Update chip colors if they use gold/green that clashes**

If `ChipStack.tsx` uses hard-coded colors that look off against the purple theme, update them to use purple-tinted chip faces while keeping the chip "rim" colors realistic.

- [ ] **Step 3: Update TurnTimer bar to purple**

In `src/app/room/[code]/TurnTimer.tsx` line 19:
```tsx
// BEFORE
const color = pct > 50 ? 'bg-green-400' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500'

// AFTER
const color = pct > 50 ? 'bg-purple-400' : pct > 25 ? 'bg-fuchsia-400' : 'bg-red-500'
```

- [ ] **Step 4: Final lint + test**

```bash
npm run lint && npm test
```

Expected: 0 errors, 28 passed.

- [ ] **Step 5: Final commit**

```bash
git add -p
git commit -m "feat: luxury Neon Vegas UI complete — wood-grain table, neon purple theme, casino background"
```

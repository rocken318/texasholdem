# Luxury UI v2 — Black Label Casino Design Spec

**Date:** 2026-04-22  
**Status:** Approved

## Goal

Transform every visual layer of the poker game into a world-class luxury casino experience. No compromises: realistic SVG table, cinematic card animations, premium chip rendering, and always-visible action controls.

---

## 1. Table (TableView.tsx)

### Structure
The outermost wrapper gets a CSS 3D perspective tilt so the table reads as a real surface:

```css
perspective: 900px;
transform: rotateX(18deg) scaleX(0.94);
transform-origin: 50% 85%;
```

The SVG inside fills the tilted plane and renders all table layers.

### SVG Layers (inside-out)
1. **Drop shadow ellipse** — blurred black behind the entire rail
2. **Mahogany wood rail** — `feTurbulence` with `baseFrequency="0.008 0.55" numOctaves="7"`. Darker, denser grain than current (`seed=42`). Color matrix targets deep mahogany (#2d1005 → #5a2010).
3. **Bevel highlight** — thin white stroke ellipse offset upward (top lighting)
4. **Leather padding band** — slightly smaller ellipse, dark brown radial gradient, simulates wrapped leather
5. **Stitching ring** — dashed gold stroke (`stroke-dasharray="4 7"`), low opacity (~0.22)
6. **Neon metal trim ring** — `linearGradient` from `#d4a0ff` → `#7c3aed` → `#3d1a70` + `drop-shadow` glow (purple)
7. **Felt surface** — `fractalNoise` texture filter overlay on deep purple radial gradient (`#1e0050` → `#060015`)
8. **Felt reflection** — semi-transparent white radial gradient, top-center, simulates overhead light
9. **Felt center glow** — blurred purple ellipse for ambient depth

### Center Content
Community cards and pot badge sit in an `absolute inset-0` flex center div above the SVG, unchanged in structure.

---

## 2. Chips (ChipStack.tsx)

**Black Label × Gold** style for all chip denominations.

### Per-chip SVG structure
- **Body**: Near-black radial gradient (e.g. `#0a0020` for purple/1K, `#0f0000` for red/5, `#000510` for blue/25)
- **Outer rim**: 4-stop gold `linearGradient` (`#ffd700 → #fffacd → #c8a400 → #8b6820`) with drop-shadow glow
- **Edge spots**: 8 white/gold circles at cardinal + diagonal positions (r=2.5 cardinal, r=2 diagonal), `opacity: 0.85/0.7`
- **Inner ring**: Slightly smaller circle with same dark gradient + thin gold stroke (dashed, low opacity)
- **Face**: Darkest gradient for the center disk
- **Shine highlight**: Rotated white ellipse top-left quadrant, `opacity: 0.08` — gives 3D sheen
- **Label text**: Gold (`#ffd700`), bold, monospace
- **Stack slices**: Edge ellipses in progressively lighter dark shades for depth

### Color table
| Denom | Body | Rim | Text |
|-------|------|-----|------|
| ≥1000 | `#0a0020` (purple-black) | gold | `#ffd700` |
| ≥500  | `#0f0000` (near-black)   | gold | `#ffd700` |
| ≥100  | `#000a00` (dark-black)   | gold | `#ffd700` |
| ≥25   | `#000510` (navy-black)   | gold | `#ffd700` |
| ≥5    | `#0f0000` (red-black)    | gold | `#ffd700` |
| <5    | `#1a1a1a` (charcoal)     | silver-gray | `#e0e0e0` |

---

## 3. Card Animations

All animations are CSS keyframe-based, applied via className strings. No JS animation libraries.

### 3a. Deal fly-in (MyCards.tsx + CommunityCards.tsx)
- Triggered on mount (when `cards` array gains items)
- Each card animates from `translate(-150px, -80px) rotate(-25deg) scale(0.2) opacity(0)` to final position
- Card 1 delay: 0ms, Card 2 delay: 120ms
- Duration: 380ms, easing: `cubic-bezier(0.22, 1, 0.36, 1)` (spring-like)
- Community cards: each card uses index-based delay (`i * 80ms`)

### 3b. Hover lift (MyCards.tsx)
- Static state: cards sit at `rotate(-6deg)` / `rotate(6deg)`, no movement
- `:hover` or `.hovered` state: `translateY(-16px) rotate(-4deg) scale(1.04)` + enhanced drop-shadow
- Purple glow shadow intensifies: `drop-shadow(0 0 18px rgba(140,50,255,0.6))`
- Transition: `transform 220ms ease-out, filter 220ms ease-out`

### 3c. My-turn glow pulse (MyCards.tsx)
- When `isMyTurn === true`: add `@keyframes cardPulse` — alternates ring glow between `rgba(180,80,255,0.5)` and `rgba(180,80,255,0.15)`
- Duration: 1.8s infinite
- Applied to the card wrapper div's `box-shadow`

### 3d. Community card 3D flip reveal (CommunityCards.tsx)
- When a new card is revealed (previously `faceDown`, now has `card` data): animate `rotateY(0 → 90 → 0)`
- At 90° (mid-flip), swap face-down back for face-up card
- Duration: 420ms, easing: `ease-in-out`
- Implemented via CSS animation + a brief `backface-visibility: hidden` trick

---

## 4. Chip Arc Animation

### 4a. Bet arc (TableView.tsx)
- When `tableBets[playerId]` increases, chips fly from player slot position to pot position
- Pure CSS: position chips at player slot, animate to pot center via `@keyframes chipArc`
- Arc via `cubic-bezier` on Y axis and linear on X, creating natural arc
- Duration: 600ms, after which the static `ChipStack` at pot position takes over
- Implementation: short-lived absolutely-positioned chip SVG rendered during animation, then removed

### 4b. Win chip rain (HandResultOverlay.tsx)
- On win result display: 6–8 chip divs with randomized left positions animate `translateY(-80px → +120px)` with rotation
- Each chip uses a different delay (0ms to 800ms)
- Duration: 1.4s, fades out at the end
- Gold number particle floats up from winner slot simultaneously

---

## 5. Turn Indicator

### 5a. Active player slot (PlayerSlot.tsx)
- **Current approach**: pulsing ring border only
- **New**: Add a glowing arrow/chevron above the active player's slot (`↓` pointing down at them), gold color, animated bob
- Arrow: `position: absolute; top: -20px; left: 50%` — small SVG chevron with gold glow
- Also: active player's name text gets a gold color `#ffd700` instead of white

### 5b. "Your turn" indicator (GameView.tsx / MyCards.tsx)
- When `isMyTurn`: a banner appears above the action bar — `「あなたのターン」` or `YOUR TURN`
- Subtle slide-up entrance, gold text, pulsing glow
- **Not** a modal or blocker — just a slim badge `position: sticky; bottom: above ActionBar`

---

## 6. ActionBar Always Visible

### Change
Remove the conditional `{isMyTurn && hand && myPlayer && <ActionBar ... />}` guard.  
Always render `<ActionBar>` when `hand` is not null and `myPlayer` exists.

### Disabled state
Add `disabled` prop logic: when `!isMyTurn`, all buttons have `opacity: 0.35`, `pointer-events: none`, `cursor: not-allowed`.  
Slider and presets also disabled.  
A subtle `「他のプレイヤーのターン」` label replaces the pending indicator area when disabled.

### Layout benefit
ActionBar height is constant → no layout jump when turn switches between players.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/room/[code]/TableView.tsx` | 3D perspective wrapper + enhanced SVG layers |
| `src/app/room/[code]/GameView.tsx` | Always render ActionBar; add YOUR TURN badge |
| `src/app/room/[code]/PlayerSlot.tsx` | Gold arrow indicator for active player; gold name color |
| `src/app/room/[code]/MyCards.tsx` | Deal animation; hover lift; my-turn glow pulse |
| `src/app/room/[code]/CommunityCards.tsx` | 3D flip reveal on card appearance; deal delay per index |
| `src/app/room/[code]/ActionBar.tsx` | Always-render with disabled state when not player's turn |
| `src/components/ChipStack.tsx` | Black Label × Gold SVG chip redesign |
| `src/app/globals.css` | New keyframes: `dealIn`, `cardPulse`, `chipArc`, `chipRain`, `flipReveal`, `arrowBob` |

---

## Out of Scope
- Sound effects
- Server-side changes
- Multiplayer sync changes
- Mobile-specific layout changes

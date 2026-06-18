# motion/

Pure math functions that compute CSS transforms from a Motion spec + frame.
No React. No hooks. No side effects.

## What this directory is for

Motion functions are the calculation layer between a `Motion` spec object and
actual CSS values. Scenes call these functions — they don't reimplement the
math themselves. This means any scene gets pan/zoom/slide for free.

## Files

| File | Function | What it computes |
|------|----------|-----------------|
| `pan.ts` | `computePan` | translateX/Y in px from overflow ratio |
| `zoom.ts` | `computeZoom` | scale + transformOrigin |
| `slide.ts` | `computeSlide`, `computeSlideEased` | translateX/Y from progress or frame |
| `ken-burns.ts` | `computeKenBurns` | pan + zoom combined |

## Difference from effects

| | Motion | Effect |
|--|--------|--------|
| Scope | Whole scene / whole image | One element |
| Registered? | No — imported directly | Yes — via effect-registry |
| Applied to | Scene-level image/container | SceneElement content wrapper |
| Output | CSS transform values (numbers) | `EffectOutput` (style + nodes) |
| Examples | pan image down, zoom in | bloom glow, pop-in scale, tap-ring |

**Motion moves the camera or the scene.  
Effect augments an element.**

## How to add a new motion type

1. Add the type to `Motion` union in `../types.ts`
2. Create `motion/my-motion.ts` with a pure `compute*` function
3. Export from `motion/index.ts`
4. Call it from the relevant scene component

```ts
// motion/spin.ts
import { interpolate } from 'remotion';
import { Motion } from '../types';

type SpinMotion = Extract<Motion, { type: 'spin' }>;

export type SpinResult = { rotate: number };

export function computeSpin(
  frame: number,
  durationInFrames: number,
  motion: SpinMotion,
): SpinResult {
  const rotations = motion.rotations ?? 1;
  const rotate = interpolate(frame, [0, durationInFrames - 1], [0, rotations * 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { rotate };
}
```

## Rules

- **Pure functions only** — no hooks, no DOM, no imports from React
- All inputs explicit — no globals, no module state
- Values in stage pixels or unitless (scale, opacity) — never CSS strings with units
- `startFrame` param for any motion that should delay (e.g. after slide-in settles)

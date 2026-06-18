# platform/motion — Agent Guide

Camera movement system. Pure math functions + a registry for extensibility.

## What's here

| File | Purpose |
|------|---------|
| `pan.ts` | `computePan`, `overflowPx` |
| `zoom.ts` | `computeZoom` |
| `slide.ts` | `computeSlide`, `computeSlideEased`, `easeOutCubic` |
| `compose.ts` | `composeMotions`, `motionToTransform`, `EMPTY_OUTPUT` |
| `register.ts` | Registers built-in `pan` and `zoom` into the motion registry |
| `index.ts` | Re-exports everything |

## How compose works

`composeMotions(motions, frame, durationInFrames, imageSize)` → `MotionOutput`

1. Iterates the motion array
2. For each motion, calls `resolveMotion(m.type)` from the registry
3. Accumulates contributions: translateX/Y additive, scale multiplicative, transformOrigin last-zoom-wins
4. Unknown types are silently skipped

`motionToTransform(output)` → CSS transform string for the `<img>`.

## Adding a new motion type

```ts
// new file: platform/motion/tilt.ts  (or projects/<p>/motion/tilt.ts)
import { registerMotion } from '../core/motion-registry';

registerMotion('core:tilt', (frame, durationInFrames, motion, _imageSize) => {
  const m = motion as { maxDeg?: number };
  const t = frame / durationInFrames;
  return { rotate: t * (m.maxDeg ?? 5) };
});
```

Then:
1. Import in `platform/motion/register.ts` (or `projects/<p>/registry.ts`)
2. Add to `Motion` type union in `platform/types.ts` (or project types):
   ```ts
   | { type: 'core:tilt'; maxDeg?: number; startAt?: number; endAt?: number }
   ```
3. Use in spec: `motion: { type: 'core:tilt', maxDeg: 8 }`

## overflowPx

```ts
overflowPx(naturalW, naturalH) → pixels image overflows 1920px stage at width=1080
```

Single source of truth for pan distance. Used by `pan.ts` and available for custom motions that need the same geometry.

## slide vs motion

`computeSlide` is for scene-level enter animations only — not in the motion array. It runs on a separate code path in `ScreenshotScene` and `SlideshowScene`. The motion array is for sustained camera movement during the scene body.

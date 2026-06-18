# Motion API Reference

Source of truth: `src/platform/types.ts`, `src/platform/motion/`, `src/platform/core/motion-registry.ts`.

---

## Motion types

```ts
type Motion =
  | { type: 'pan';   direction: 'down' | 'up' | 'left' | 'right';
      from?: number; to: number;
      startAt?: number; endAt?: number; }
  | { type: 'zoom';  from: number; to: number;
      origin?: 'center' | 'top' | 'bottom';
      startAt?: number; endAt?: number; }
  | { type: 'slide'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'fade';  from?: number; to?: number }
  | { type: 'cut' }
```

---

## Pan

Translates the image by pixel amount derived from overflow.

```ts
{ type: 'pan', direction: 'down', to: 0.85 }
```

`to` / `from` are **fractions of overflow pixels** — image-size-independent.
- `overflow = naturalH * (1080 / naturalW) - 1920`
- `to: 0` = no movement. `to: 1.0` = full overflow. `to: 0.7–0.9` is typical.
- `from` defaults to `0`.

Direction controls which way the image moves:
- `'down'` → image scrolls downward (reveals bottom of image)
- `'up'`   → image scrolls upward (reveals top)
- `'left'` / `'right'` → horizontal scroll

Requires `height: auto` on the `<img>` — `ScreenshotScene` handles this automatically when it detects a pan motion.

---

## Zoom

Scales the image from `from` to `to` over the scene duration.

```ts
{ type: 'zoom', from: 1.0, to: 1.2, origin: 'center' }
```

`from` / `to` are CSS scale multipliers. Practical range: `1.0–1.4`.
`origin` sets `transform-origin`. Defaults to `'center'`.

Ken Burns = zoom + pan in the same array:
```ts
motion: [
  { type: 'zoom', from: 1.0, to: 1.12 },
  { type: 'pan',  direction: 'up', to: 0.3 },
]
```

---

## Sequencing with `startAt` / `endAt`

Both are **fractions of scene duration** (0–1). Omit both = full scene.

```ts
// Zoom first half, pan second half
motion: [
  { type: 'zoom', from: 1.0, to: 1.1, startAt: 0, endAt: 0.5 },
  { type: 'pan',  direction: 'down', to: 0.6, startAt: 0.5, endAt: 1.0 },
]

// Overlapping — zoom whole scene, pan starts at 30%
motion: [
  { type: 'zoom', from: 1.0, to: 1.15 },
  { type: 'pan',  direction: 'up', to: 0.4, startAt: 0.3 },
]
```

---

## Compose model

`composeMotions(motions, frame, durationInFrames, imageSize)` → `MotionOutput`

```ts
type MotionOutput = {
  translateX:      number;   // additive across all motions
  translateY:      number;   // additive
  scale:           number;   // multiplicative (starts at 1.0)
  rotate:          number;   // additive (deg)
  transformOrigin: string;   // last zoom's origin wins
}
```

`motionToTransform(output)` → CSS transform string passed to the `<img>`.

---

## Adding a custom motion type

Create `platform/motion/<name>.ts` (generic) or `projects/<p>/motion/<name>.ts` (project-specific):

```ts
// 1. Register the handler
import { registerMotion } from '../core/motion-registry';

registerMotion('myproject:rotate-in', (frame, durationInFrames, motion, _imageSize) => {
  const m = motion as { speed?: number };
  const deg = (frame / durationInFrames) * (m.speed ?? 360);
  return { rotate: deg };
});

// 2. Import in registry.ts so it runs at startup
// 3. Add to your project's Motion type union in types.ts:
//    | { type: 'myproject:rotate-in'; speed?: number }
```

The registry skips unknown motion types — safe to add incrementally.

---

## Slide / Fade / Cut

Used as `enter` on screenshot/slideshow, or as transition markers.

`slide` — ease-out cubic over 18 frames (ENTER_SETTLE_FRAMES). No spring bounce.
`fade` — handled by VideoPlayer's FadeOverlay, not by motion compose.
`cut` — no animation. Instant.

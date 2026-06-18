# Effect API Reference

Source of truth: `src/platform/types.ts`, `src/platform/core/effect-registry.ts`, `src/platform/effects/`.

Effects are **per-element** visual augmentations. They run on `SceneElement` instances inside screenshot scenes.

---

## Effect types

```ts
type Effect =
  | { type: 'core:pop-in';
      overshoot?: number;              // scale at t=0,       default 2.2
      spring?: { damping?: number; stiffness?: number }; }  // default 14 / 260

  | { type: 'core:bloom';
      color: string;                   // glow color (required)
      delay?: number;                  // seconds before start, default 0.2
      duration?: number;               // seconds to expand+fade, default 0.8
      maxScale?: number;               // peak size multiplier, default 3.8
      maxBlur?: number;                // px blur at peak,      default 80
      peakAt?: number; }               // 0–1 progress at peak opacity, default 0.15

  | { type: 'core:tap-ring';
      color?: string;                  // default '#9d5cff'
      count?: number;                  // rings,               default 5
      stagger?: number;                // seconds between rings, default 0.4
      ringDuration?: number;           // seconds per ring,    default 0.5
      maxScale?: number;               // ring size at end,    default 2.6
      thickness?: number; }            // border-width px,     default 3

  | { type: 'core:typewriter';
      unit?: 'char' | 'word';          // default 'char'
      speed?: number;                  // units per second,    default 12
      cursor?: boolean;                // default false
      cursorColor?: string; }          // default '#9d5cff'
```

---

## EffectOutput

What every effect returns. Fields are optional — return only what the effect changes.

```ts
type EffectOutput = {
  contentStyle?: React.CSSProperties;  // applied to the element wrapper div
  underlays?: React.ReactNode[];       // rendered BEHIND the element (bloom glow)
  overlays?: React.ReactNode[];        // rendered IN FRONT of the element (rings)
}
```

Multiple effects on one element are merged: `contentStyle` keys are `Object.assign`-ed, `underlays` and `overlays` are concatenated.

---

## EffectFn signature

```ts
type EffectFn<P = unknown> = (
  localFrame: number,         // frames since element appeared (0 = birth frame, negative = not yet visible)
  fps: number,                // from useVideoConfig()
  params: P,                  // the effect spec object from the scene
  size: { w: number; h: number },  // element w/h in stage px
) => EffectOutput;
```

`localFrame` is `frame - Math.round(el.at * fps)`. Negative = element not yet visible. Most effects return `{}` when `localFrame < 0`.

---

## Adding a custom effect

```ts
// platform/effects/my-effect.ts  (or projects/<p>/effects/my-effect.ts)
import { registerEffect, EffectOutput } from '../core/effect-registry';

registerEffect('myproject:shake', (localFrame, fps, params: any): EffectOutput => {
  const intensity = params.intensity ?? 10;
  const x = Math.sin(localFrame * 0.8) * intensity * Math.max(0, 1 - localFrame / fps);
  return {
    contentStyle: { transform: `translateX(${x}px)` },
  };
});
```

Then:
1. Import the file in your `effects/index.ts` (or `registry.ts`).
2. Add the type to your project's `Effect` union in `types.ts`:
   ```ts
   | { type: 'myproject:shake'; intensity?: number }
   ```
3. Use in spec: `effects: [{ type: 'myproject:shake', intensity: 8 }]`

Unknown effect types are skipped silently — safe to add incrementally.

---

## Composition rules

- `pop-in` controls `contentStyle.transform` + `opacity`. Don't pair with `typewriter` (both set contentStyle).
- `bloom` adds `underlays`. `tap-ring` adds `overlays`. Safe to combine with anything.
- `typewriter` uses `clipPath` on `contentStyle`. Combine with `pop-in` carefully — `pop-in` resets `transform`, which can interact with `clipPath` depending on browser compositing.
- Element `overflow: visible` — rings and bloom bleed outside the element bounds intentionally.

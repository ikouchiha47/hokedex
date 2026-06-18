# platform/effects — Agent Guide

Per-element visual effects. Each file registers one effect into the effect registry.

## What's here

| File | Effect | What it does |
|------|--------|-------------|
| `pop-in.ts` | `core:pop-in` | Spring scale from overshoot → 1.0 on element birth |
| `bloom.ts` | `core:bloom` | Glow blob expands + fades behind element |
| `tap-ring.ts` | `core:tap-ring` | Expanding ring(s) emanate from element center |
| `typewriter.ts` | `core:typewriter` | Clip-path reveals element left-to-right |
| `index.ts` | — | Import all four; import this once at entry point |

## EffectFn contract

```ts
type EffectFn<P = unknown> = (
  localFrame: number,           // frames since el.at — negative = not visible yet
  fps: number,
  params: P,                    // effect spec from scene, cast from unknown
  size: { w: number; h: number },
) => EffectOutput;

type EffectOutput = {
  contentStyle?: React.CSSProperties;  // on element wrapper
  underlays?: React.ReactNode[];       // behind element
  overlays?: React.ReactNode[];        // in front of element
};
```

## Adding a new effect

```ts
// platform/effects/shake.ts
import { registerEffect, EffectOutput } from '../core/effect-registry';

registerEffect('core:shake', (localFrame, fps, params: any): EffectOutput => {
  if (localFrame < 0) return {};
  const intensity = params.intensity ?? 10;
  const decay     = Math.max(0, 1 - localFrame / fps);
  const x         = Math.sin(localFrame * 1.2) * intensity * decay;
  return { contentStyle: { transform: `translateX(${x}px)` } };
});
```

1. Import in `index.ts`
2. Add to `Effect` union in `platform/types.ts`:
   ```ts
   | { type: 'core:shake'; intensity?: number }
   ```
3. All visual params must be in `params` — no hardcoded magic numbers in the effect body.

## Rules

- Return `{}` when `localFrame < 0` (element not visible yet). Never render when invisible.
- All defaults live in the type definition (`types.ts`) as JSDoc comments. Effect body reads `params.x ?? default`.
- `contentStyle` keys from multiple effects are merged with `Object.assign` — later effects overwrite earlier ones on the same key. Design effects to use distinct CSS properties.
- `underlays` and `overlays` are arrays — return multiple nodes as needed (e.g., `tap-ring` returns N ring divs).

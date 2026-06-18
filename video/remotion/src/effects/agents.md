# effects/

Element-level visual effects. Each file registers one effect via `registerEffect`.

## What this directory is for

Effects modify how a `SceneElement` renders — they can add glow layers, animate scale/opacity, reveal content over time, or draw rings around an element. They are **element-scoped**: they know the element's `w`/`h` and how many frames have passed since the effect started (`localFrame`), nothing else.

## Data flow

```
spec.ts SceneElement.effects[]
  → SceneElementRenderer reads el.effects
  → for each effect: resolveEffect(effect.type)(localFrame, fps, params, size)
  → returns EffectOutput { contentStyle?, underlays?, overlays? }
  → SceneElementRenderer merges all outputs and renders:
      underlays (behind element) → element content → overlays (in front)
```

## How to add a new effect

1. Create `effects/my-effect.ts`
2. Import `registerEffect` and your param type from `../types`
3. Call `registerEffect('ns:my-effect', fn)` where `fn: EffectFn`
4. Add the param type to the `Effect` union in `../types.ts`
5. Import your file in `effects/index.ts`

```ts
// effects/my-effect.ts
import { registerEffect, EffectOutput } from '../core/effect-registry';
import { Effect } from '../types';

type Params = Extract<Effect, { type: 'proj:my-effect' }>;

registerEffect('proj:my-effect', (localFrame, fps, params: Params, size): EffectOutput => {
  // localFrame: frames since this effect started (negative = not yet active)
  // fps: from useVideoConfig
  // params: the full spec object — every param the user set
  // size: { w, h } of the element in stage px
  return {
    contentStyle: { opacity: localFrame < 0 ? 0 : 1 },
    underlays: [],
    overlays: [],
  };
});
```

## Rules

- **Every visual parameter must come from `params`** — no magic numbers inside the function body. Defaults go in the `Effect` type definition as documented fallbacks.
- `localFrame < 0` means the effect hasn't started yet — return early or return hidden state.
- Effects must be **pure functions of frame** — no timers, no DOM reads, no side effects.
- Name effects `ns:name` — `core:` for platform effects, project namespace for custom.
- For effects that render around/outside the element (rings, halos), return nodes in `overlays`. The container uses `overflow: visible`.

# platform/core — Agent Guide

This directory contains the five registries and the font loader. Nothing here has visual output. All files are pure infrastructure.

## What's here

| File | Purpose |
|------|---------|
| `element-registry.ts` | `registerElement` / `resolveElement` |
| `effect-registry.ts` | `registerEffect` / `resolveEffect` — `EffectFn`, `EffectOutput` types |
| `scene-registry.ts` | `registerScene` / `resolveScene` |
| `motion-registry.ts` | `registerMotion` / `resolveMotion` — `MotionFn` type |
| `scene-overlay-registry.ts` | `registerSceneOverlay` / `resolveSceneOverlay` — `SceneOverlayFn` type |
| `preset-registry.ts` | `registerPreset` / `resolvePreset` / `listPresets` |
| `element.ts` | `ElementRenderer` interface |
| `fonts.ts` | `loadFonts`, `useFonts` hook |
| `transitions.ts` | `directedGradient`, `overlapFrames`, `computeSceneStarts` |

## Registry pattern (same for all six)

```ts
const registry = new Map<string, Fn>();

export function register(name: string, fn: Fn): void {
  if (registry.has(name)) throw new Error(`duplicate: ${name}`);
  registry.set(name, fn);
}

export function resolve(name: string): Fn {
  const f = registry.get(name);
  if (!f) throw new Error(`unknown: ${name}`);
  return f;
}
```

- Duplicate registration throws at startup — catches copy-paste mistakes early.
- Unknown resolution throws at render time — clear error, not silent wrong output.
- Names are namespaced strings: `'core:bloom'`, `'hokedex:ko-slam'`, `'myproject:thing'`.

## Adding a new registry

Only needed if you're adding a new kind of extensible thing (not a new effect or motion — those use existing registries). Copy the pattern above into a new file, export `register` + `resolve`, import in the appropriate `index.ts`.

## fonts.ts

`useFonts(fonts)` — React hook. Call once in `VideoPlayer`. Uses `delayRender`/`continueRender` to hold rendering until fonts load. Font failures are non-fatal (warn + continue with CSS fallback). Each font has an 8s timeout.

## transitions.ts

Pure math — no React, no DOM. Safe to call anywhere. `directedGradient` generates a CSS gradient string oriented to match an enter direction.

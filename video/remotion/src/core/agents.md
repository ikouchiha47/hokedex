# core/

Platform registries and shared utilities. Nothing project-specific lives here.

## What this directory is for

The registries are the extension points of the platform. Every named thing
(element, effect, scene type) is looked up at runtime through a registry.
This means projects can add their own without touching platform source.

## Files

| File | Purpose |
|------|---------|
| `element.ts` | `ElementRenderer` interface |
| `element-registry.ts` | `registerElement` / `resolveElement` |
| `effect-registry.ts` | `registerEffect` / `resolveEffect` + `EffectFn` type |
| `scene-registry.ts` | `registerScene` / `resolveScene` |
| `transitions.ts` | `directedGradient`, `overlapFrames`, `computeSceneStarts`, `totalDuration` |

## How to add a new registry

1. Create `core/my-registry.ts` with a `Map`, `register*`, and `resolve*` function
2. Follow the pattern: throw on duplicate registration, throw on unknown lookup
3. Export the `Fn` type so implementors know the contract
4. Document it here

## Rules

- No React imports in registry files — registries are pure Maps
- No defaults that hide missing registrations — always throw on unknown
- No circular imports — registries import from `types.ts` only

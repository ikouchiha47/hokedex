# platform/scenes — Agent Guide

Generic scene renderers. Each file is one scene type registered in `platform/registry.ts`.

## What's here

| File | Scene type | Registered as |
|------|-----------|--------------|
| `TextScene.tsx` | `text` | `'text'` |
| `ScreenshotScene.tsx` | `screenshot` | not auto-registered — projects register their own version |
| `SlideshowScene.tsx` | `slideshow` | `'slideshow'` |
| `SceneElement.tsx` | — | Helper, not a scene. Renders one `SceneElement` with effects. |

## Why ScreenshotScene is not auto-registered

Projects need to extend screenshot with project-specific props (e.g., hokedex adds `koFinish`). The platform provides the base implementation for import, but registration is the project's responsibility.

The hokedex version (`projects/hokedex/scenes/ScreenshotScene.tsx`) wraps the platform scene and adds `KOSlam`. It registers itself as `'screenshot'` in `projects/hokedex/registry.ts`.

## SceneElement

`<SceneElementRenderer el={el} />` renders one overlay element on a screenshot scene:
1. Computes `localFrame = frame - Math.round(el.at * fps)`
2. Calls each `el.effects[i]` handler from the effect registry
3. Merges all `EffectOutput` — underlays → element div → overlays

## Adding a new generic scene type

1. Create `platform/scenes/NewScene.tsx` — React.FC with props matching the SceneSpec variant
2. Register in `platform/registry.ts`:
   ```ts
   import { NewScene } from './scenes/NewScene';
   registerScene('new-type', NewScene);
   ```
3. Add the variant to `SceneSpec` in `platform/types.ts`
4. Update `references/scene-types.md`

## Adding a project-specific scene type

Same as above, but in `projects/<p>/scenes/` and `projects/<p>/registry.ts`. Add the variant to the project's `types.ts` union, not the platform union.

## Rules

- Stage is always 1080×1920. All layout in absolute pixels, no %.
- Animations are pure functions of `useCurrentFrame()`. No setTimeout, no external state.
- Scene components receive props spread from the SceneSpec — keep prop names consistent with the type definition.
- `background` on the outer div is intentional — it shows through during slide-in animations. Use `videoConfig.bgColor` not hardcoded `#0a0a0a`.

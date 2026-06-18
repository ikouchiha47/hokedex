# add-effect

Add a new per-element visual effect to the Remotion video engine.

**Before doing anything, read:**
- `video/remotion/references/effect-api.md` — EffectFn contract, EffectOutput, localFrame semantics
- `video/remotion/src/platform/effects/agents.md` — Directory guide, rules, existing effects
- An existing effect for reference: `video/remotion/src/platform/effects/bloom.ts`

**Steps:**

1. Create `video/remotion/src/platform/effects/<name>.ts`:
   ```ts
   import { registerEffect } from '../core/effect-registry';
   import type { EffectOutput } from '../core/effect-registry';

   // <Effect name>
   // params:
   //   <param>: <type>, default <value> — <description>
   registerEffect('core:<name>', (localFrame, fps, params: any): EffectOutput => {
     if (localFrame < 0) return {};
     // ... compute and return { contentStyle?, underlays?, overlays? }
   });
   ```

2. Import in `video/remotion/src/platform/effects/index.ts`

3. Add to the `Effect` union in `video/remotion/src/platform/types.ts`:
   ```ts
   | { type: 'core:<name>'; <param>?: <type> }
   ```

4. Update `video/remotion/references/effect-api.md` — add to the effects table

**Rules:**
- Always return `{}` when `localFrame < 0` (element not yet visible)
- No hardcoded magic numbers — all values come from `params` with `?? default`
- `contentStyle` merges with existing element styles; pick CSS properties that don't conflict with other effects
- `underlays`/`overlays` are arrays — push multiple nodes if needed (see `tap-ring.ts`)
- For project-specific effects: use `projects/<p>/effects/` and register with a project namespace, e.g. `'<project>:<name>'`

**After adding:** add `effects: [{ type: 'core:<name>' }]` to a `SceneElement` in a spec and preview to confirm.

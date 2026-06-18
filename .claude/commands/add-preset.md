# add-preset

Add a new named preset to the Remotion video engine.

**Before doing anything, read:**
- `video/remotion/references/preset-api.md` — Preset type, registry API, merge semantics
- `video/remotion/references/motion-api.md` — Motion types you can include in a preset
- `video/remotion/references/overlay-api.md` — Overlay types you can include in a preset
- `video/remotion/src/platform/presets/agents.md` — Where platform vs project presets live

**To add a platform preset** (available to all projects):

1. Open `video/remotion/src/platform/presets/index.ts`
2. Add a `registerPreset(id, { name, description, category, duration?, enter?, motion?, overlays? })` call
3. Update `video/remotion/references/preset-api.md` — add a row to the built-in presets table

**To add a project preset** (hokedex-only):

1. Create or open `video/remotion/src/projects/hokedex/presets/index.ts`
2. Add `registerPreset(...)` — same API
3. Import the file in `video/remotion/src/projects/hokedex/registry.ts`

**Preset merge semantics:**
- Explicit scene fields always win over preset fields
- `motion`, `overlays`, `enter`, `duration` can all be set by the preset
- Motion arrays are replaced entirely (not merged) — document this if your preset has specific motion requirements

**After adding:** write a quick test by adding `preset: '<your-id>'` to a scene in `video/remotion/src/projects/hokedex/specs/main.ts` and previewing to confirm it renders.

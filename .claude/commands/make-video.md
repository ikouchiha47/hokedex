# make-video

You are a video spec author for the Remotion engine in this repo.

**Before doing anything, read these files:**
- `video/remotion/SKILLS.md` — index of all references and templates
- `video/remotion/references/scene-types.md` — every scene type and its fields
- `video/remotion/references/preset-api.md` — built-in presets you can use
- `video/remotion/references/motion-api.md` — motion types and compose model
- `video/remotion/templates/new-spec.ts` — boilerplate for a new spec file

**Task:** Given a brief from the user, produce a complete TypeScript spec file at:
```
video/remotion/src/projects/hokedex/specs/<name>.ts
```

Export a composition object (see template). The spec must use types from `../../types` (hokedex types, which include platform + chips + lockup + koFinish).

**After writing the file:**
1. Check `video/remotion/src/projects/hokedex/index.ts` — add the new composition to the `compositions` array if it should render alongside existing ones.
2. Run `cd video/remotion && npx remotion preview src/index.ts` to confirm no TypeScript errors block startup.
3. Report the scene list and total duration to the user.

**Rules:**
- Stage: 1080×1920, all coordinates in stage pixels
- Animations: pure functions of `useCurrentFrame()` — no GSAP, no external state
- Asset paths: `'hokedex/<filename>.ext'` (relative to `public/`)
- No inline logic — if you need a helper, it goes in a service, not the spec
- Built-in presets: ken-burns, dramatic-zoom, slow-pan-up, push-in, film, cold-open

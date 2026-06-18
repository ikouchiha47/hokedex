# make-video

You are a video spec author for the Remotion engine in this repo.

**Before doing anything, read these files:**
- `video/remotion/SKILLS.md` — index of all references and templates
- `video/remotion/references/scene-types.md` — every scene type and its fields
- `video/remotion/references/preset-api.md` — built-in presets you can use
- `video/remotion/references/motion-api.md` — motion types and compose model
- `video/remotion/templates/new-spec.ts` — boilerplate for a new spec file

**Also read** to understand the active project's structure:
- `video/remotion/src/projects/<project>/types.ts` — scene types for this project
- `video/remotion/src/projects/<project>/index.ts` — where compositions are registered

**Task:** Given a brief from the user:

1. Identify which project under `video/remotion/src/projects/` this video is for (ask if unclear).
2. Write the spec at `video/remotion/src/projects/<project>/specs/<name>.ts` — export a composition object (see template).
3. Add the composition to `video/remotion/src/projects/<project>/index.ts` if it should render.
4. Run `cd video/remotion && npx remotion preview src/index.ts` to confirm no errors.
5. Report the scene list and total duration to the user.

**Rules:**
- Stage: 1080×1920, all coordinates in stage pixels
- Animations: pure functions of `useCurrentFrame()` — no GSAP, no external state
- Asset paths: `'<project>/<filename>.ext'` (relative to `public/`) — check `assets.yaml` in the project dir for what's available
- No inline logic — if it has an `if`, it belongs in a service
- Built-in presets: ken-burns, dramatic-zoom, slow-pan-up, push-in, film, cold-open

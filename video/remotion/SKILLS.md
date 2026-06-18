# Video Engine — Skills

## How to make a video (start here)

Follow these stages in order. Each stage feeds the next.

### Stage 1 — Collect assets
Bring all images (URLs or local paths) into the project's public directory before touching any spec.

Read `.claude/commands/collect-assets.md` for the full instructions. In short:
```bash
node video/scripts/collect-assets.js \
  --dest     video/remotion/public/<project> \
  --manifest video/remotion/src/projects/<project>/assets.yaml \
  --name <key> --src <url-or-local-path>
```
After this step, all images are local. `assets.yaml` records what was collected.

### Stage 2 — Understand
Read `assets.yaml` and the user's brief. Describe what each asset shows and what scene type it suggests. Produce a bullet-point treatment — not a spec yet. Get the user to confirm the direction before writing any code.

### Stage 3 — Propose → Feedback → Refine
Present a human-readable scene breakdown:
```
Scene 1 (text, 1.5s): hook line + accent line
Scene 2 (screenshot, 3s): <key>.png, preset: ken-burns, pill badge at 1.2s
Scene 3 (lockup, 2.5s): closing hook + app name
```
User responds with edits. Revise and repeat until they say go.

### Stage 4 — Build
Write the spec file at `video/remotion/src/projects/<project>/specs/<name>.ts`.
- Use `video/remotion/templates/new-spec.ts` as the starting point
- Read `video/remotion/references/scene-types.md` for every field
- Add the composition to `src/projects/<project>/index.ts`
- Run `cd video/remotion && npx remotion preview src/index.ts` to confirm it loads

---

## Slash commands

| Command | Purpose |
|---------|---------|
| `/collect-assets` | Stage 1 — download/copy assets into public/, write assets.yaml |
| `/make-video` | Shortcut — stages 2–4 in one go when assets are already local |
| `/add-preset` | Register a new named camera/atmosphere preset |
| `/add-effect` | Implement a new per-element visual effect |

---

## Reference docs (`video/remotion/references/`)

| File | What it covers |
|------|---------------|
| `scene-types.md` | Every SceneSpec variant with all fields |
| `motion-api.md` | Motion types, compose system, motion registry |
| `effect-api.md` | Effect types, EffectFn signature, registry |
| `preset-api.md` | Preset type, built-in presets, how to add one |
| `element-api.md` | Element types, ElementRenderer interface, registry |
| `overlay-api.md` | SceneOverlay types, overlay registry, built-in list |

## Templates (`video/remotion/templates/`)

| File | Use for |
|------|---------|
| `new-spec.ts` | New video spec for an existing project |
| `new-project.ts` | Bootstrapping a brand new project folder |

## Per-directory extension guides

Each `src/platform/*/agents.md` describes what that directory does and how to add one more thing to it. Read before touching that directory.

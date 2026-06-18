# Video Engine — Skills

## How to make a video (start here)

---

### Stage 1 — Collect

Bring all images in before touching any spec. Assets must be local before the video is built.

Ask the user:
- What images do they have? (URLs, local files, screenshots, anything)
- What to call each one (becomes the filename and manifest key)

Run:
```bash
node video/scripts/collect-assets.js \
  --dest     video/remotion/public/<project> \
  --manifest video/remotion/src/projects/<project>/assets.yaml \
  --name <key> --src <url-or-path> \
  [--name <key2> --src <path2> ...]
```

Confirm what landed. Show the manifest. Do not proceed until all assets are confirmed local.

---

### Stage 2 — Understand

Read `assets.yaml`. Look at each asset. Then ask the user:

1. **What is this video for?** (app launch, ad, demo, social post — what platform, what goal)
2. **Who is watching?** (existing users, cold audience, investors — what do they already know)
3. **What should they feel at the end?** (convinced, curious, entertained, informed)
4. **Is there a hook line?** (the first thing they read — if they don't have one, help them write it)
5. **Is there a closing line?** (what the video ends on)

Do not propose a scene breakdown until you have answers to all five. The answers determine the scene order, pacing, and tone — without them you're guessing.

---

### Stage 3 — Propose

Write a scene-by-scene breakdown as a table. No TypeScript. Human readable.

| # | Type | Duration | Content | Notes |
|---|------|----------|---------|-------|
| 1 | text | 1.5s | "hook line" / "second line" (accent) | cold open, cuts fast |
| 2 | screenshot | 3s | profile asset, ken-burns preset, Red Flag pill at 1.2s | establish the app |
| 3 | chips | 4s | 4 type chips radiate out, stamp at 3s | pattern recognition moment |
| 4 | lockup | 2.5s | closing hook / app name / tagline | end card |

Below the table, state:
- Total duration
- Intended pacing (fast cut / slow drift / mixed)
- Any assumptions you made (e.g. "assumed 30fps")

Then stop. Wait for feedback. Do not write code.

---

### Stage 4 — Refine (loop)

Take the user's feedback. Revise the table. Show the full updated breakdown each time — not just the changed rows.

Keep iterating until the user says go. "Looks good", "yes", "ship it", or equivalent. Silence is not approval.

---

### Stage 5 — Build

Only after explicit approval.

1. Read `video/remotion/references/scene-types.md` — every field for every scene type
2. Read `video/remotion/templates/new-spec.ts` — boilerplate
3. Write `video/remotion/src/projects/<project>/specs/<name>.ts`
4. Add the composition to `src/projects/<project>/index.ts`
5. Tell the user to open Remotion Studio if not already running:
   ```bash
   cd video/remotion && npx remotion preview src/index.ts
   ```
6. Tell them to check the preview at http://localhost:3000 and come back with feedback

---

## Slash commands

| Command | Purpose |
|---------|---------|
| `/collect-assets` | Stage 1 — download/copy assets, write assets.yaml |
| `/make-video` | Stages 2–5 in one go when assets are already local |
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

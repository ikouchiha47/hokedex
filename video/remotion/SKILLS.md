# Video Engine — Skills

Slash commands available in this repo. Invoke from Claude Code with `/make-video`, `/add-preset`, `/add-effect`.

| Skill | Invoke | Purpose |
|-------|--------|---------|
| make-video | `/make-video` | Generate a complete video spec from a brief |
| add-preset | `/add-preset` | Register a new named camera/atmosphere preset |
| add-effect | `/add-effect` | Implement a new per-element visual effect |

## Reference docs

All in `video/remotion/references/`:

| File | What it covers |
|------|---------------|
| `scene-types.md` | Every SceneSpec variant with all fields |
| `motion-api.md` | Motion types, compose system, motion registry |
| `effect-api.md` | Effect types, EffectFn signature, registry |
| `preset-api.md` | Preset type, built-in presets, how to add one |
| `element-api.md` | Element types, ElementRenderer interface, registry |
| `overlay-api.md` | SceneOverlay types, overlay registry, built-in list |

## Templates

In `video/remotion/templates/`:

| File | Use for |
|------|---------|
| `new-spec.ts` | New video spec for an existing project |
| `new-project.ts` | Bootstrapping a brand new project folder |

## Per-directory extension guides

Each `src/platform/*/agents.md` describes what that directory is for and exactly how to add one more thing to it. Read before touching that directory.

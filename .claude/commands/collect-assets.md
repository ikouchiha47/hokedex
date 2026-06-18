# collect-assets

Bring assets (images, screenshots) from URLs or local paths into a project's public directory. All assets must be local before the video is built.

**Script:** `video/scripts/collect-assets.js` — generic, no project assumptions.

---

## Usage

```bash
node video/scripts/collect-assets.js \
  --dest     video/remotion/public/<project> \
  --manifest video/remotion/src/projects/<project>/assets.yaml \
  --name <key> --src <url-or-path> \
  [--name <key2> --src <url2-or-path2> ...]
```

- `--dest` — directory where files land (created if missing)
- `--manifest` — YAML file tracking what was collected (created/merged if missing)
- `--name` — manifest key and output filename stem (`profile` → `profile.png`)
- `--src` — a URL (`https://...`) or an absolute/relative local path

---

## Your job as the agent

1. Ask the user which project this is for and what assets they want to collect.
2. Ask for a name and source for each asset. Names become both the manifest key and the filename stem.
3. Build and run the command above with the correct `--dest` and `--manifest` for the project.
4. After the run, read the manifest and report what was collected and what failed.

---

## Manifest format (assets.yaml)

```yaml
assets:
  profile:
    file: ../../public/<project>/profile.png
    type: local
  hero:
    file: ../../public/<project>/hero.jpg
    source: https://example.com/banner.jpg
    type: url
```

- Local entries omit `source` — personal machine paths don't belong in version control.
- URL entries record `source` since the URL is already public.
- Re-running with the same `--name` overwrites that entry.

---

## Using assets in a spec

After collecting, reference the file path from the spec. Since `public/` is the Remotion static root, strip the `public/` prefix:

```ts
{ type: 'screenshot', src: '<project>/profile.png', ... }
```

Or read `assets.yaml` to see the recorded `file` value and derive the path from there.

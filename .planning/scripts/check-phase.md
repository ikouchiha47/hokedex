# Phase Feature Checker

An agent skill to verify that a phase's planned features are actually implemented in the codebase.

## Usage

Invoke this as an agent prompt. Pass the phase directory as the argument, e.g.:
```
.planning/phases/03-camera-capture-path
```

## Instructions for the Agent

You have Read, Grep, Bash, and Write tools.

### Step 1 — Discover plans

List all `*-PLAN.md` files in the given phase directory. Sort them numerically.

### Step 2 — Extract features in batches of 2 plans

For each batch of 2 PLAN files:

1. Read each PLAN file.
2. Extract every item from `must_haves.truths` and `must_haves.artifacts`.
3. For each artifact, check:
   - Does the file at `path` exist? (Bash: `ls <path>`)
   - If `contains` is specified, does the file contain that string? (Grep)
4. For each truth statement, search the codebase to verify it holds:
   - Parse the key claim from the sentence (e.g. "Migration 012 creates X" → grep for `CREATE TABLE X` in migration files)
   - "Query functions exist for X" → grep for export of that function
   - "Screen renders Y" → grep for Y in the screen file
   - "Permission Z is requested" → grep for Z in FEATURE_PERMISSIONS or relevant hook
5. For each `key_links` entry, verify the `from` file imports or references the `to` file using the `pattern`.

### Step 3 — Write results

After checking each batch of 2 plans, write a short result block:

```
## Plan XX-01 + XX-02

### Artifacts
- [PASS] src/some/file.ts — exists, contains expected string
- [FAIL] src/missing/file.ts — FILE NOT FOUND
- [FAIL] src/wrong/file.ts — exists but missing "expected string"

### Truths
- [PASS] Migration 012 creates moment_faces table
- [FAIL] GalleryBottomSheet — src/components/GalleryBottomSheet.tsx not found
- [PASS] useFeaturePermissions requests camera on CameraScreen focus

### Key Links
- [PASS] TabNavigator.tsx → CameraScreen.tsx via component={CameraScreen}
- [FAIL] CameraScreen.tsx → GalleryBottomSheet.tsx — no import found
```

### Step 4 — Summary

After all batches, write a final `## Summary` section:
- Count PASS / FAIL
- List all FAILs in one place with the file or claim that failed
- Write the result to `.planning/phases/<phase-dir>/FEATURE-CHECK.md`

## Notes

- Check the actual codebase files — do not assume from plan text alone.
- If a file exists but you are unsure if a truth holds, grep for the key noun/function from the truth statement.
- Be concise per item — one line per check.
- Do not fix anything. Report only.

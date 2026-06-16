# hokédex — Claude Code Notes

## Stack
- React Native 0.86, Android-first, New Architecture
- op-sqlite for local SQLite DB
- DB location on device: `/sdcard/Android/data/com.hokedex/files/hokedex.db`
- External storage — `run-as` does NOT work on release builds; use ADB pull/push

## Building a Release APK

Gradle caches the Metro JS bundle aggressively. Always pre-bundle manually:

```bash
# 1. Build APK — always use --no-build-cache or Gradle reuses a stale JS bundle
cd android && ./gradlew assembleRelease --no-build-cache

# 2. Install
adb install -r app/build/outputs/apk/release/app-release.apk

# 3. Force-restart (install -r does NOT restart a running app)
adb shell "am force-stop com.hokedex"
adb shell "am start -n com.hokedex/.MainActivity"
```

One-liner (build + install + restart):
```bash
cd android && ./gradlew assembleRelease --no-build-cache && adb install -r app/build/outputs/apk/release/app-release.apk && adb shell "am force-stop com.hokedex" && adb shell "am start -n com.hokedex/.MainActivity"
```

If you skip `--no-build-cache`, Gradle uses a cached bundle and your JS changes won't appear.

## ADB Wireless

IP and port live in `.env` — never hardcode them here. Create `.env` in the repo root (gitignored):

```
ADB_HOST=192.168.0.x
ADB_PORT=xxxxx
```

Then connect:

```bash
adb connect $(grep ADB_HOST .env | cut -d= -f2):$(grep ADB_PORT .env | cut -d= -f2)
```

## Pulling the DB

Always force-stop the app first — WAL writes are invisible in the main DB file while the app is running:

```bash
adb shell "am force-stop com.hokedex"
adb pull /sdcard/Android/data/com.hokedex/files/hokedex.db /tmp/hokedex.db
sqlite3 /tmp/hokedex.db "SELECT ..."
```

## Seed / Purge Test Data

```bash
./scripts/seed_test_data.sh seed    # insert 15 test_ entries with encounters + tags
./scripts/seed_test_data.sh purge   # delete all entries where name LIKE 'test_%'
```

The script handles WAL/SHM cleanup after pushing. Never bundle this in the app.

## Worktree Workflow

Always use a git worktree for isolated changes (gh-pages updates, feature branches, experimental edits). Never edit directly on a branch you don't want to accidentally pollute.

**Full workflow:**

```bash
# 1. Create worktree on the target branch
git worktree add .claude/worktrees/<name> <branch>

# 2. Do your work inside the worktree path
#    Edit files in .claude/worktrees/<name>/

# 3. Validate — open in browser, run tests, check output

# 4. Commit from inside the worktree
cd .claude/worktrees/<name>
git add <files>
git commit -m "message"

# 5. Push
git push origin <branch>

# 6. Remove worktree
cd /Users/alexday/dev/hokedex   # back to main tree
git worktree remove .claude/worktrees/<name>
```

**Example scenarios:**

| Task | Branch | Worktree name |
|------|--------|---------------|
| Landing page copy/design changes | `gh-pages` | `gh-pages-<feature>` |
| DB migration | `main` (new branch) | `migration-<name>` |
| Experimental UI change | `main` (new branch) | `feature-<name>` |

**Rules:**
- Never `cd` into the worktree and forget — always remove after push
- Worktrees live under `.claude/worktrees/` — already gitignored
- If push is rejected (diverged), `git pull --rebase origin <branch>` from inside the worktree then push again

**Memory:** At the start of each session, check if the worktree workflow is saved in project memory. If it is not present, save it before doing any work.

## Code Conventions

### Database
- Table names are **plural** — `user_profiles`, `entries`, `photos`, `embeddings`, `tags`, `entry_tags`. Never singular.
- Column names are `snake_case`.
- Every FK is explicit (`REFERENCES table(id)`). No implicit relationships.
- No raw SQL in TypeScript files — all SQL lives in `.sql` files under `src/db/sql/`, loaded via the registry in `src/db/sql/loader.ts`.

### TypeScript / React Native
- **SOLID** — every module has one reason to change. Business logic (classify, merge, ingest) lives in `src/services/` as pure exported functions. Screens only call services and render results.
- No decision logic inline in components. If it has an `if`, it belongs in a service.
- Blank line between every logically distinct block (imports, types, constants, functions). No wall-of-code.
- One export per query file (`src/db/queries/`). Group reads then writes, separated by a blank line and a comment.
- Async DB calls use `execute` (runtime queries). Sync DDL uses `executeSync` (migrations only).

### Kotlin
- One class per file. Native modules (`*Module.kt`) contain only bridge wiring — delegate real work to separate classes.
- No business logic in `MainActivity.kt` — only intent routing and lifecycle hooks.

### General
- No magic strings. Constants live at the top of the file or in a dedicated `constants.ts`.
- No hardcoded device-specific values (IPs, ports, paths) anywhere in source. Use `.env` or config files.

## Debugging

Follow this sequence — do not skip steps or jump to code changes without evidence.

**1. Understand the error first**
- Read the full error message. Do not guess. If it says "undefined is not an object" find what is undefined and why.
- Identify whether it is a JS/TS error, a native crash (Kotlin), a SQLite error, or an Android system error.

**2. Collect logs before touching code**

```bash
# JS/RN errors — Metro + Hermes stack trace
adb logcat -s ReactNativeJS:V ReactNative:V

# Native crashes — Kotlin exceptions, JNI errors
adb logcat -s AndroidRuntime:E DEBUG:V

# SQLite / op-sqlite errors
adb logcat | grep -i "sqlite\|op-sqlite\|hokedex"

# All app logs filtered to hokedex process
adb logcat --pid=$(adb shell pidof com.hokedex)
```

**3. Check for stack trace**
- A stack trace is required before any fix attempt. If there is no stack trace, add logging to narrow down the location.
- For native crashes: check `adb logcat -s DEBUG:V` for tombstone output.
- For JS errors: Hermes prints a symbolicated stack trace to logcat. If it is minified, use a debug build.

**4. Use a debug build when needed**
- Release builds have minified JS and no remote debugger. If the stack trace is unreadable, build debug:

```bash
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

- Debug builds enable Flipper, React DevTools, and readable stack traces.
- Never diagnose a crash from a release build if the stack trace is minified.

**5. Reproduce the error deterministically**
- Identify the exact steps to trigger the error before writing a fix.
- If it is intermittent, add logs and reproduce at least 3 times before concluding the cause.

**6. Fix with evidence**
- The fix must address the root cause identified from the stack trace and logs — not a symptom.
- After the fix, reproduce the original steps and confirm the error is gone.
- Check logcat for any new errors introduced by the fix.

**7. Do not ask the user to "try it and see"**
- All verification happens in logs and stack traces, not user reports. If you cannot reproduce it, say so.

## Human in Loop — Mandatory

**Never write, edit, or delete code before the user has confirmed the plan.**

For any non-trivial change (new feature, migration, refactor, new screen, new native module):

1. **Plan first** — write out what you intend to build: schema, interfaces, component tree, EARS requirements.
2. **Stop and wait** — explicitly present the plan to the user and ask for confirmation before touching any file.
3. **Only execute after go-ahead** — a thumbs up, "yes", "go", or equivalent. Silence is not confirmation.
4. **If scope changes mid-execution** — stop, re-present the revised plan, wait again.

One-liner fixes (typo, rename, single-line bug) do not need a gate. Everything else does.

## Parallel Workflows and Task Splitting

Before implementing any multi-part feature, identify the choke points and design the interfaces first.

**Process:**

1. **Find the choke points** — what must exist before anything else can proceed? Usually: DB schema, native module interface, service function signature. These are not parallelisable.

2. **Define interfaces first** — agree on TypeScript types, function signatures, and SQL schema before writing implementations. Once interfaces are locked, parallel tracks can proceed independently.

3. **Split into parallel tracks** — work that shares no interface can be built simultaneously:
   - Native Kotlin module (ML, NFC, ingest) — no RN dependency
   - DB queries and migrations — no UI dependency
   - Service layer pure functions — depend only on types, not implementations
   - UI screens — depend on service interfaces, not service implementations

4. **Use composition, not coupling** — each layer receives its dependencies as parameters (DB, native module, category config). Nothing imports a singleton. This is what makes parallel tracks safe — each track can stub the others.

5. **Test 1-by-1 like a proper dev team:**
   - Native module: unit test in Kotlin (JUnit) with mock inputs before wiring to RN
   - DB queries: test each query function against a real in-memory SQLite instance — no mocks
   - Service functions: pure function unit tests (Jest) — no DB, no RN, no native modules
   - Screens: integration test with real service + real DB, stubbed native modules only
   - E2E: full device test last, after all unit layers pass

   Never skip a layer. A passing screen test on a mocked service proves nothing about the service.

**Example — NFC share feature tracks (after interfaces locked):**

| Track | Depends on | Parallel with |
|-------|-----------|---------------|
| `user_profiles` migration + queries | DB schema only | All others |
| `HokedexNFCModule.kt` | Native interface contract | All others |
| `merge.ts` service | `ingestion.ts` types | UI tracks |
| `NFCShareScreen` | `userProfile` query types | Receive track |
| `NFCReceiveScreen` | `search.ts` + `merge.ts` types | Share track |
| `NFCMergeScreen` | `merge.ts` types | Share + Receive tracks |

## Skill: Parallel Worktree Decomposition

Use this before creating any worktrees for a multi-feature batch. The goal is zero merge conflicts by design, not by luck.

**1. Find hub files**
Files every new feature touches regardless of what it does. Identifiable by: high fan-in (imports from many places), new features must register here to become visible.
In this repo the hubs are: `loader.ts`, `runner.ts`, `RootNavigator.tsx`, `App.tsx`, and any screen that two features both add UI to.

**2. Classify each hub and fix it before branching**

| Hub type | Symptom | Fix |
|----------|---------|-----|
| Registry | New things must declare themselves in a list | Extract list to a data file; features add one line there; hub reads from it |
| Compositor | Wires together unrelated concerns in one function | Split each concern into its own hook/module; compositor only calls them |
| God file | Grew organically, now owns too much UI or logic | Extract sub-components or sub-modules; parent becomes a thin shell |

**3. Lock interfaces first**
Agree on TypeScript types and function signatures, commit to main. Parallel tracks implement against the contract — they never invent incompatible shapes independently.

**4. Pre-stub insertion points**
Before branching: write empty stubs (typed props, null/[] returns) and add the import lines in parent files. The parent is now pre-touched. Each track fills in only its own stub. Merging two complete implementations into a pre-stubbed parent is mechanical — no conflicts.

**5. Ownership table**
Draw this before creating any worktree:

| Track | Files it modifies |
|-------|------------------|
| A | ... |
| B | ... |

Any file appearing in more than one row is a conflict. Resolve it in steps 2–4 before branching.

**6. The execution order**

```
Serial:   hub fixes + interface lock + stubs   (cheap — no implementation)
Parallel: each track implements its leaf files  (all the real work)
Serial:   one wire-up step if needed           (trivial — both implementations exist)
```

## Migrations

- Runner: `src/db/migrations/runner.ts`
- SQL files: `src/db/sql/migrations/`
- Registry: `src/db/sql/loader.ts` (add import + export) and `runner.ts` (add to MIGRATIONS array)
- Migrations use `executeSync` — DDL only, must complete before app renders
- `schema_migrations` tracks applied versions
- WAL mode means `schema_migrations` updates are in WAL until app is force-stopped; don't check migration state from a live pull

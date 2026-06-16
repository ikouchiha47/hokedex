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

# 3. Install
adb install -r app/build/outputs/apk/release/app-release.apk

# 4. Force-restart (install -r does NOT restart a running app)
adb shell "am force-stop com.hokedex"
adb shell "am start -n com.hokedex/.MainActivity"
```

If you skip step 1, Gradle uses a cached bundle and your JS changes won't appear.

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

## Migrations

- Runner: `src/db/migrations/runner.ts`
- SQL files: `src/db/sql/migrations/`
- Registry: `src/db/sql/loader.ts` (add import + export) and `runner.ts` (add to MIGRATIONS array)
- Migrations use `executeSync` — DDL only, must complete before app renders
- `schema_migrations` tracks applied versions
- WAL mode means `schema_migrations` updates are in WAL until app is force-stopped; don't check migration state from a live pull

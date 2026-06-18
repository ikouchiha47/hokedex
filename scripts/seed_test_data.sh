#!/usr/bin/env bash
# seed_test_data.sh — inject / purge test entries in the on-device hokedex DB
# Usage:
#   ./scripts/seed_test_data.sh seed    # insert 15 test_ entries + encounters
#   ./scripts/seed_test_data.sh purge   # delete everything prefixed test_
#
# Requires: adb in PATH, sqlite3 on host, device connected, app installed.
# NOT bundled in the app — dev/test tool only.

set -euo pipefail

PACKAGE="com.hokedex"
CMD="${1:-seed}"
DEVICE_DB="/sdcard/Android/data/$PACKAGE/files/hokedex.db"
LOCAL_DB="/tmp/hokedex_seed_$$.db"

# ── pull DB from device ───────────────────────────────────────────────────────

echo "🚀 Launching app to ensure migrations run..."
adb shell "am start -n $PACKAGE/.MainActivity" > /dev/null

echo "⏳ Waiting for migrations (letting app run for 8s first)..."
sleep 8
adb shell "am force-stop $PACKAGE" 2>/dev/null || true
sleep 1

for i in $(seq 1 5); do
  adb pull "$DEVICE_DB" "$LOCAL_DB" 2>/dev/null || true
  adb pull "${DEVICE_DB}-wal" "${LOCAL_DB}-wal" 2>/dev/null || true
  adb pull "${DEVICE_DB}-shm" "${LOCAL_DB}-shm" 2>/dev/null || true
  if sqlite3 "$LOCAL_DB" "SELECT 1 FROM encounters LIMIT 1;" 2>/dev/null; then
    echo "   Migrations applied."
    break
  fi
  if [ $i -eq 5 ]; then
    echo "❌ Timed out waiting for migrations. Launch the app manually and wait ~10s, then retry."
    rm -f "$LOCAL_DB" "${LOCAL_DB}-wal" "${LOCAL_DB}-shm"; exit 1
  fi
  echo "   Not ready yet, retrying ($i/5)..."
  adb shell "am start -n $PACKAGE/.MainActivity" > /dev/null 2>/dev/null || true
  sleep 6
  adb shell "am force-stop $PACKAGE" 2>/dev/null || true
  sleep 1
done

echo "📥 DB already pulled during migration check."
# Checkpoint WAL into main file so all tables are visible to sqlite3
sqlite3 "$LOCAL_DB" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

sql() { sqlite3 "$LOCAL_DB" "$1"; }

# ── push DB back ─────────────────────────────────────────────────────────────

push_db() {
  echo "📤 Pushing DB back to device..."
  adb shell "am force-stop $PACKAGE" 2>/dev/null || true
  adb push "$LOCAL_DB" "$DEVICE_DB"
  # Clear WAL/SHM so stale journal doesn't overwrite the pushed DB on next open
  adb shell "rm -f ${DEVICE_DB}-wal ${DEVICE_DB}-shm" 2>/dev/null || true
  rm -f "$LOCAL_DB"
  echo "   Done. Reopen the app to see changes."
}

# ── purge ─────────────────────────────────────────────────────────────────────

purge() {
  echo "🗑️  Purging seed data (entries with id LIKE 'seed_entry_%')..."
  sql "DELETE FROM encounters WHERE entry_id LIKE 'seed_entry_%';"
  sql "DELETE FROM entry_tags WHERE entry_id LIKE 'seed_entry_%';"
  sql "DELETE FROM photos WHERE entry_id LIKE 'seed_entry_%';"
  sql "DELETE FROM entries WHERE id LIKE 'seed_entry_%';"
  echo "✅ Purged."
  push_db
}

# ── seed ──────────────────────────────────────────────────────────────────────

seed() {
  echo "🌱 Seeding test data..."

  # Fetch the people category id (name col is display name; id is the slug)
  CAT_ID=$(sql "SELECT id FROM categories LIMIT 1;" | tr -d '\r')
  if [ -z "$CAT_ID" ]; then
    echo "❌ No category found. Launch the app once to run migrations."
    rm -f "$LOCAL_DB"
    exit 1
  fi

  # Tag names to distribute
  TAGS=("red flag" "ghost type" "situationship" "recurring" "mid")

  # 15 seed entries
  NAMES=(
    "Alice" "Bob" "Carol" "Dave" "Eve"
    "Frank" "Grace" "Heidi" "Ivan" "Judy"
    "Karl" "Leo" "Mallory" "Niaj" "Olivia"
  )

  NOW=$(python3 -c "import time; print(int(time.time() * 1000))")   # ms

  for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    ENTRY_ID="seed_entry_$(printf '%02d' $i)_$$"
    CREATED=$((NOW - (14 - i) * 86400000))   # spread over last 14 days

    sql "INSERT OR IGNORE INTO entries (id, category_id, name, created_at, updated_at)
         VALUES ('$ENTRY_ID', '$CAT_ID', '$NAME', $CREATED, $CREATED);"

    # Assign character tag (round-robin from TAGS list) using flat entry_tags schema
    TAG_NAME="${TAGS[$((i % ${#TAGS[@]}))]}"
    TAG_ROW_ID="seed_etag_${i}_$$"
    sql "INSERT OR IGNORE INTO entry_tags (id, entry_id, key, value)
         VALUES ('$TAG_ROW_ID', '$ENTRY_ID', 'character', '$TAG_NAME');"

    # 1–5 encounters spread over last 90 days
    ENCOUNTER_COUNT=$(( (i % 5) + 1 ))
    for j in $(seq 1 $ENCOUNTER_COUNT); do
      ENC_ID="seed_enc_${i}_${j}_$$"
      ENC_AT=$((NOW - (90 - i * 5 - j) * 86400000))
      sql "INSERT OR IGNORE INTO encounters (id, entry_id, note, occurred_at)
           VALUES ('$ENC_ID', '$ENTRY_ID', NULL, $ENC_AT);"
    done

    echo "   ✓ $NAME — $ENCOUNTER_COUNT encounter(s), tag: $TAG_NAME"
  done

  echo ""
  echo "✅ Seeded ${#NAMES[@]} entries."
  echo "   To purge:  ./scripts/seed_test_data.sh purge"
  push_db
}

# ── dispatch ─────────────────────────────────────────────────────────────────

case "$CMD" in
  seed)  seed  ;;
  purge) purge ;;
  *)
    echo "Usage: $0 [seed|purge]"
    exit 1
    ;;
esac

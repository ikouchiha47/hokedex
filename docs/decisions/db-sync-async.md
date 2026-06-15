# DB Layer: Sync vs Async Query Strategy

## Decision

`op-sqlite` exposes two execution APIs:
- `executeSync(sql, params?)` — JSI direct call, synchronous from JS perspective
- `execute(sql, params?)` — returns `Promise<QueryResult>`, async

We use **`executeSync` for all startup-path operations** and **`execute` (async) for runtime data-path operations**.

## Startup path (sync)

`initDatabase` and `runMigrations` run once at boot, before any UI renders. Using async here would require every consumer to await and guard against "not ready" races. The JSI bridge in op-sqlite makes sync calls fast (no serialization round-trip through the bridge) — PRAGMA and DDL statements are safe to run synchronously.

Applies to:
- PRAGMA setup (WAL, foreign_keys, cache_size, etc.)
- Schema migration DDL
- `schema_migrations` table reads/writes

## Runtime path (async)

Search queries, ingestion writes, and any operation triggered by user action run async and must not block the JS thread. Phase 4 (ingestion) and Phase 5 (search) will use `execute` with work off-loaded to the Kotlin native module thread where possible.

Applies to:
- Vector similarity search (Phase 5)
- Photo + embedding transactional writes (Phase 4)
- Any query inside a screen or service

## Why this matters for testing

Startup-path code (sync) can be tested with `better-sqlite3` (real SQLite, runs in Node). Runtime-path code (async) is tested with integration tests on-device or with the same adapter.

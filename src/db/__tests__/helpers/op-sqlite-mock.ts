// Jest-only stub for @op-engineering/op-sqlite.
// The runner and query modules import `type DB` from this module.
// Tests pass a TestDB (better-sqlite3 adapter) directly — this stub just
// satisfies the module resolver so TypeScript and Jest don't error on import.
export const open = jest.fn();

export type QueryResult = { rows?: Record<string, unknown>[] };

// Re-export DB as a type alias so `import { type DB }` in source files resolves.
export type DB = import('../helpers/sqlite-adapter').TestDB;

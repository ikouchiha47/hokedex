import BetterSQLite from 'better-sqlite3';

/**
 * Subset of the op-sqlite DB interface that our DB layer actually uses.
 * Defined locally so this file has no dependency on @op-engineering/op-sqlite.
 */
export interface TestDB {
  executeSync(sql: string, params?: unknown[]): { rows?: Record<string, unknown>[] };
  execute(sql: string, params?: unknown[]): Promise<{ rows?: Record<string, unknown>[] }>;
  close(): void;
}

/**
 * Wraps better-sqlite3 to implement the executeSync/execute/close subset
 * that our DB layer uses. Lets us run real SQL in Jest without a device.
 *
 * Only implements what our DB layer actually calls — not the full op-sqlite interface.
 */
export function createTestDB(path: string = ':memory:'): TestDB {
  const sqlite = new BetterSQLite(path);

  const executeSync = (sql: string, params?: unknown[]): { rows?: Record<string, unknown>[] } => {
    const trimmed = sql.trim();

    if (!trimmed) return { rows: [] };

    // Statements that return rows: SELECT and read-only PRAGMAs (no `=`)
    const isRead =
      /^SELECT\b/i.test(trimmed) ||
      /^PRAGMA\s+\w+\s*$/i.test(trimmed);

    const stmt = sqlite.prepare(trimmed);

    if (isRead) {
      const rows = (params && params.length > 0
        ? stmt.all(...params)
        : stmt.all()) as Record<string, unknown>[];
      return { rows };
    }

    // DDL, DML, write PRAGMA — run() returns metadata, not rows
    if (params && params.length > 0) {
      stmt.run(...params);
    } else {
      stmt.run();
    }
    return { rows: [] };
  };

  return {
    executeSync,
    execute: async (sql: string, params?: unknown[]) => executeSync(sql, params),
    close: () => sqlite.close(),
  };
}

/**
 * SQL bundle registry.
 *
 * Every .sql file that the app needs must be imported here.
 * Metro inlines them as strings at bundle time — no fs, no __dirname.
 *
 * Other modules call parseNamedQueries(SQL.<key>) to get a map of
 * UPPER_SNAKE_CASE query name → SQL string ready for executeSync.
 */

import migration000 from './migrations/000_migrations_table.sql';
import migration001 from './migrations/001_initial_schema.sql';
import migration002 from './migrations/002_encounters.sql';
import migration003 from './migrations/003_structured_tags.sql';
import migration004 from './migrations/004_entry_notes.sql';
import migration005 from './migrations/005_flat_entry_tags.sql';
import migration006 from './migrations/006_photo_original_path.sql';
import queriesMigrations from './queries/migrations.sql';
import queriesCategories from './queries/categories.sql';
import queriesEntries from './queries/entries.sql';
import queriesPhotos from './queries/photos.sql';
import queriesEmbeddings from './queries/embeddings.sql';
import queriesEntryTags from './queries/entry_tags.sql';
import queriesEncounters from './queries/encounters.sql';
import queriesEntryNotes from './queries/entry_notes.sql';

export const SQL = {
  migration000,
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  queriesMigrations,
  queriesCategories,
  queriesEntries,
  queriesPhotos,
  queriesEmbeddings,
  queriesEntryTags,
  queriesEncounters,
  queriesEntryNotes,
} as const;

/**
 * Parse a sql file that uses sqlc-style named query annotations:
 *
 *   -- name: GetCategory :one
 *   SELECT ...;
 *
 * Returns a map of UPPER_SNAKE_CASE name → trimmed SQL string (no trailing ;).
 * The result type tag (:one, :many, :exec) is advisory — it is not enforced here.
 */
export function parseNamedQueries(sql: string): Record<string, string> {
  const queries: Record<string, string> = {};
  const blocks = sql.split(/^-- name:/m).slice(1);

  for (const block of blocks) {
    const newline = block.indexOf('\n');
    if (newline === -1) continue;

    const header = block.slice(0, newline).trim();   // e.g. "GetCategory :one"
    const body   = block.slice(newline + 1).trim()
                        .replace(/;$/, '');           // strip trailing semicolon

    const name = header.split(/\s+/)[0];             // "GetCategory"
    const key  = toUpperSnake(name);                 // "GET_CATEGORY"
    queries[key] = body;
  }

  return queries;
}

// "GetCategory" → "GET_CATEGORY"
function toUpperSnake(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
}

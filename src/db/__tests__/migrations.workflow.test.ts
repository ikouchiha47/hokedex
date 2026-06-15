import { runMigrations } from '../migrations/runner';
import { insertEntry, deleteEntry } from '../queries/entries';
import { createTestDB, type TestDB } from './helpers/sqlite-adapter';

// embeddings and photos have no query module yet (Phase 4 will add them).
// Those two tables are exercised with inline SQL only in the cascade test below.

describe('Migration runner — workflow', () => {
  let db: TestDB;

  beforeEach(() => {
    db = createTestDB(); // fresh in-memory DB per test
  });

  afterEach(() => {
    db.close();
  });

  it('creates schema_migrations table before applying any migration', () => {
    runMigrations(db as never);
    const result = db.executeSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    );
    expect(result.rows).toHaveLength(1);
  });

  it('applies migration 001: all expected tables exist', () => {
    runMigrations(db as never);
    const expected = [
      'categories', 'embeddings', 'entries', 'entry_tags',
      'photos', 'tags', 'workspaces',
    ];
    const result = db.executeSync(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const names = result.rows!.map((r) => r.name as string);
    for (const table of expected) {
      expect(names).toContain(table);
    }
  });

  it('applies migration 001: required indexes exist', () => {
    runMigrations(db as never);
    const result = db.executeSync(
      "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
    );
    const names = result.rows!.map((r) => r.name as string);
    expect(names).toContain('idx_embeddings_search');
    expect(names).toContain('idx_embeddings_join');
    expect(names).toContain('idx_entries_category');
  });

  it('seeds the People category row with correct values', () => {
    runMigrations(db as never);
    const result = db.executeSync('SELECT * FROM categories WHERE id = ?', ['people']);
    expect(result.rows).toHaveLength(1);
    const cat = result.rows![0];
    expect(cat.name).toBe('People');
    expect(cat.embedding_dimensions).toBe(512);
    expect(cat.similarity_threshold_likely).toBeCloseTo(0.95);
    expect(cat.similarity_threshold_possible).toBeCloseTo(0.85);
  });

  it('records migration version in schema_migrations', () => {
    runMigrations(db as never);
    const result = db.executeSync('SELECT version FROM schema_migrations ORDER BY version');
    expect(result.rows).toHaveLength(1);
    expect(result.rows![0].version).toBe(1);
  });

  it('is idempotent — running twice does not error or duplicate rows', () => {
    runMigrations(db as never);
    expect(() => runMigrations(db as never)).not.toThrow();

    const migrations = db.executeSync('SELECT version FROM schema_migrations');
    expect(migrations.rows).toHaveLength(1);

    const seed = db.executeSync('SELECT id FROM categories WHERE id = ?', ['people']);
    expect(seed.rows).toHaveLength(1); // INSERT OR IGNORE — no duplicate
  });

  it('enforces foreign key: entry must reference a valid category', () => {
    runMigrations(db as never);
    db.executeSync('PRAGMA foreign_keys = ON');
    const now = Date.now();
    expect(() => {
      // insertEntry is used here because it exercises the real query module path.
      // The nonexistent category_id is the point of the test — FK must reject it.
      insertEntry(db as never, {
        id: 'e1',
        category_id: 'nonexistent_category',
        name: 'Test',
        notes: null,
        is_public: 0,
        created_at: now,
        updated_at: now,
      });
    }).toThrow();
  });

  it('cascades delete: removing entry deletes its photos and embeddings', () => {
    runMigrations(db as never);
    db.executeSync('PRAGMA foreign_keys = ON');
    const now = Date.now();

    // insertEntry from the production query module
    insertEntry(db as never, {
      id: 'e1',
      category_id: 'people',
      name: 'Alice',
      notes: null,
      is_public: 0,
      created_at: now,
      updated_at: now,
    });

    // embeddings and photos have no production query module yet (Phase 4).
    // Inline SQL is intentional here — replace with insertEmbedding / insertPhoto
    // once src/db/queries/embeddings.ts and photos.ts are added.
    db.executeSync(
      `INSERT INTO embeddings (id, entry_id, photo_id, category_id, vector, created_at)
       VALUES ('emb1', 'e1', 'ph1', 'people', X'00', ?)`,
      [now],
    );
    db.executeSync(
      `INSERT INTO photos (id, entry_id, local_path, original_sha256, original_phash, is_profile_photo, created_at)
       VALUES ('ph1', 'e1', 'images/2025/abc_alice_photo.jpg', 'abc123', 0, 0, ?)`,
      [now],
    );

    // deleteEntry from the production query module
    deleteEntry(db as never, 'e1');

    const photos = db.executeSync(`SELECT id FROM photos WHERE entry_id = 'e1'`);
    const embeddings = db.executeSync(`SELECT id FROM embeddings WHERE entry_id = 'e1'`);
    expect(photos.rows).toHaveLength(0);
    expect(embeddings.rows).toHaveLength(0);
  });
});

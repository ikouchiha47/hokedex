import { runMigrations } from '../migrations/runner';
import { createTestDB, type TestDB } from './helpers/sqlite-adapter';

describe('Migration runner — workflow', () => {
  let db: TestDB;

  beforeEach(() => {
    db = createTestDB();
  });

  afterEach(() => {
    db.close();
  });

  it('creates schema_migrations table before applying any migration', () => {
    runMigrations(db as never);
    const result = db.executeSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it('applies all migrations: core tables exist', () => {
    runMigrations(db as never);
    const expected = [
      'categories', 'entries', 'entry_tags', 'embeddings',
      'moments', 'moment_faces', 'moment_groups', 'moment_group_members',
      'processing_queue', 'app_settings', 'schema_migrations',
    ];
    const result = db.executeSync(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = result.rows!.map(r => r.name as string);
    for (const table of expected) {
      expect(names).toContain(table);
    }
  });

  it('records all migration versions in schema_migrations', () => {
    runMigrations(db as never);
    const result = db.executeSync('SELECT version FROM schema_migrations ORDER BY version');
    const versions = result.rows!.map(r => r.version as number);
    expect(versions[0]).toBe(1);
    expect(versions[versions.length - 1]).toBe(12);
    expect(versions).toHaveLength(12);
  });

  it('seeds the people category row', () => {
    runMigrations(db as never);
    const result = db.executeSync('SELECT * FROM categories WHERE id = ?', ['people']);
    expect(result.rows).toHaveLength(1);
    const cat = result.rows![0];
    expect(cat.name).toBe('People');
    expect(cat.embedding_dimensions).toBe(512);
  });

  it('is idempotent — running twice does not error or duplicate rows', () => {
    runMigrations(db as never);
    expect(() => runMigrations(db as never)).not.toThrow();

    const migrations = db.executeSync('SELECT version FROM schema_migrations');
    expect(migrations.rows).toHaveLength(12);

    const seed = db.executeSync("SELECT id FROM categories WHERE id = 'people'");
    expect(seed.rows).toHaveLength(1);
  });
});

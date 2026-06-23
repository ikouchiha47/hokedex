CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('weather_enabled', 'true', ?);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('weather_location_precision', 'coarse', ?);

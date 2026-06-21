-- Migration 008: add is_self flag to entries
ALTER TABLE entries ADD COLUMN is_self INTEGER NOT NULL DEFAULT 0;

-- Couple accounts: PIN brute-force protection and per-account decks.
-- The API also creates these tables on first use (CREATE TABLE IF NOT EXISTS),
-- so applying this migration is safe before or after a deploy.

CREATE TABLE IF NOT EXISTS couple_login_attempts (
  couple_name TEXT PRIMARY KEY COLLATE NOCASE,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

-- Each couple account's own deck: cards it added and shared cards it removed.
CREATE TABLE IF NOT EXISTS couple_catalogs (
  couple_id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

-- Private images for account-added cards (R2 key couple-assets/<couple_id>/<sha256>).
CREATE TABLE IF NOT EXISTS couple_assets (
  couple_id TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (couple_id, sha256)
);

CREATE TABLE IF NOT EXISTS couple_accounts (
  id TEXT PRIMARY KEY,
  couple_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash TEXT NOT NULL,
  unlocked_cards TEXT NOT NULL DEFAULT '[]',
  total_cards_opened INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  settings_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_couple_name
  ON couple_accounts(couple_name);

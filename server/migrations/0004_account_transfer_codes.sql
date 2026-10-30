-- A transfer code is independent from the account credential and may only choose one new key.
CREATE TABLE IF NOT EXISTS account_transfer_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_secret_hash TEXT
);

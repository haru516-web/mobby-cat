PRAGMA foreign_keys = ON;

-- An anonymous account: the app holds its id and a random secret; only the secret's SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- What the player has bought and not yet spent. お迎え券 (tickets) and またたび (matatabi); the ledger below is the record of every change.
CREATE TABLE IF NOT EXISTS wallet (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tickets INTEGER NOT NULL DEFAULT 0 CHECK (tickets >= 0),
  matatabi INTEGER NOT NULL DEFAULT 0 CHECK (matatabi >= 0)
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('tickets', 'matatabi')),
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, currency, reason, ref)
);

CREATE TRIGGER IF NOT EXISTS wallet_apply_ledger
AFTER INSERT ON wallet_ledger
BEGIN
  UPDATE wallet SET
    tickets = tickets + CASE WHEN NEW.currency = 'tickets' THEN NEW.delta ELSE 0 END,
    matatabi = matatabi + CASE WHEN NEW.currency = 'matatabi' THEN NEW.delta ELSE 0 END
  WHERE user_id = NEW.user_id;
END;

CREATE TABLE IF NOT EXISTS purchases (
  apple_transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  original_transaction_id TEXT,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  -- 'Production' for a real purchase, 'Sandbox' for TestFlight and App Review; kept so test grants can be told apart.
  environment TEXT NOT NULL DEFAULT 'Production',
  -- When the purchase was made (Apple's purchaseDate) and the yen Apple charged; the monthly cap counts these.
  -- Added 2026-10-29 (migrations/0002_purchase_price.sql for an existing database). NULL in older rows.
  purchased_at TEXT,
  price_yen INTEGER
);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases(user_id, granted_at);

-- One billing period of a subscription (またたびパス). The period that covers "now" is the active plan.
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  tickets_granted_period INTEGER NOT NULL DEFAULT 0 CHECK (tickets_granted_period >= 0),
  PRIMARY KEY (user_id, plan, period_start)
);

-- Refunds are remembered even when the purchase was never seen, so a purchase that arrives after its refund credits nothing.
CREATE TABLE IF NOT EXISTS revoked_transactions (
  transaction_id TEXT PRIMARY KEY,
  revoked_at TEXT NOT NULL
);

-- A refund takes back what is still unspent of that purchase. `shortfall` is the part that was already spent (nothing is
-- charged for it; it is only counted, so that repeated refunds can stop further purchases).
CREATE TABLE IF NOT EXISTS refund_events (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('tickets', 'matatabi')),
  amount INTEGER NOT NULL,
  taken INTEGER NOT NULL,
  shortfall INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS refund_events_user ON refund_events(user_id, created_at);

-- Self-declared age group, which sets the monthly purchase cap.
CREATE TABLE IF NOT EXISTS user_limits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL CHECK (age_group IN ('under16', '16to19', 'adult')),
  set_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apple_links (
  apple_sub TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  -- Apple's refresh token from the sign-in, kept only to revoke it when the account is deleted.
  refresh_token TEXT
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  -- When the counter may be dropped (epoch ms).
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);

-- Who holds a subscription now, when it moved away from the account in its appAccountToken.
CREATE TABLE IF NOT EXISTS plan_owners (
  original_transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The transaction the move was made with: its billing period's 券 are not credited again.
  moved_transaction_id TEXT NOT NULL,
  moved_at TEXT NOT NULL
);

-- A transfer code is independent from the account credential and may only choose one new key.
CREATE TABLE IF NOT EXISTS account_transfer_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_secret_hash TEXT
);

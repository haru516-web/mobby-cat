-- 2026-10-30: the pass can move to a new device's account. Who holds a subscription now, whatever its appAccountToken says.
-- Run once on the existing database, before deploying: npx wrangler d1 execute nyakomobby --remote --file=./migrations/0005_plan_owners.sql
CREATE TABLE IF NOT EXISTS plan_owners (
  original_transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The transaction the move was made with: its billing period's 券 are not credited again.
  moved_transaction_id TEXT NOT NULL,
  moved_at TEXT NOT NULL
);
-- The column of the purchase-proof recovery, which no longer exists.
ALTER TABLE users DROP COLUMN purchase_recovery_date;

-- 2026-11-12: またたび and またたびパス were removed; only お迎え券 is sold now.
-- Run once on the existing database, before deploying: npx wrangler d1 execute nyakomobby --remote --file=./migrations/0006_remove_matatabi.sql
DROP TRIGGER IF EXISTS wallet_apply_ledger;
ALTER TABLE wallet DROP COLUMN matatabi;
CREATE TRIGGER IF NOT EXISTS wallet_apply_ledger
AFTER INSERT ON wallet_ledger
BEGIN
  UPDATE wallet SET
    tickets = tickets + CASE WHEN NEW.currency = 'tickets' THEN NEW.delta ELSE 0 END
  WHERE user_id = NEW.user_id;
END;
DROP TABLE IF EXISTS plan_owners;
DROP TABLE IF EXISTS entitlements;

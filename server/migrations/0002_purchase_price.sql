-- 2026-10-29: the monthly spending cap counts what Apple charged, in the month the purchase was made (audit B-12).
-- Run once on the existing database: npx wrangler d1 execute nyakomobby --remote --file=./migrations/0002_purchase_price.sql
ALTER TABLE purchases ADD COLUMN purchased_at TEXT;
ALTER TABLE purchases ADD COLUMN price_yen INTEGER;

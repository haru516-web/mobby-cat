-- Prevent reuse of the same or older purchase proof after key recovery.
ALTER TABLE users ADD COLUMN purchase_recovery_date INTEGER;

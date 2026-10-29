import type { AgeGroup, AppleLinkResult, CloudSave, Currency, D1Database, ProductDefinition, PurgeOutcome, Store, VerifiedTransaction, Wallet } from "./types.ts";

const nowIso = (): string => new Date().toISOString();
/** The hourly clean-up removes expired counters in slices of this many rows, at most this many slices a run. */
const PURGE_BATCH_ROWS = 500;
const PURGE_BATCHES = 20;
const ledgerId = (): string => crypto.randomUUID();
/** The wallet column of each currency. Only these two names are ever put into SQL text. */
const COLUMN: Record<Currency, string> = { tickets: "tickets", matatabi: "matatabi" };

export class D1Store implements Store {
  private readonly db: D1Database;
  constructor(db: D1Database) { this.db = db; }

  async registerUser(userId: string, secretHash: string): Promise<void> {
    await this.db.batch([
      this.db.prepare("INSERT INTO users (id, secret_hash, created_at) VALUES (?, ?, ?)").bind(userId, secretHash, nowIso()),
      this.db.prepare("INSERT INTO wallet (user_id) VALUES (?)").bind(userId)
    ]);
  }

  async credentialHash(userId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT secret_hash FROM users WHERE id = ?").bind(userId).first<{ secret_hash: string }>();
    return row?.secret_hash ?? null;
  }

  async userExists(userId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM users WHERE id = ?").bind(userId).first());
  }

  async rotateSecret(userId: string, secretHash: string): Promise<void> {
    await this.db.prepare("UPDATE users SET secret_hash = ? WHERE id = ?").bind(secretHash, userId).run();
  }

  async deleteUser(userId: string): Promise<void> {
    // Every table that refers to a user deletes its rows along with the user (ON DELETE CASCADE).
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  }

  async cloudSave(userId: string): Promise<CloudSave | null> {
    const row = await this.db.prepare("SELECT data, version, updated_at FROM cloud_saves WHERE user_id = ?").bind(userId).first<{ data: string; version: number; updated_at: string }>();
    return row ? { data: row.data, version: row.version, updatedAt: row.updated_at } : null;
  }

  async putCloudSave(userId: string, data: string, baseVersion: number): Promise<number | null> {
    const now = nowIso();
    const result = baseVersion === 0
      ? await this.db.prepare("INSERT INTO cloud_saves (user_id, data, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT (user_id) DO NOTHING").bind(userId, data, now).run()
      : await this.db.prepare("UPDATE cloud_saves SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?").bind(data, now, userId, baseVersion).run();
    return (result.meta?.changes ?? 0) > 0 ? baseVersion + 1 : null;
  }

  async linkApple(userId: string, appleSub: string): Promise<AppleLinkResult> {
    const bySub = await this.db.prepare("SELECT user_id FROM apple_links WHERE apple_sub = ?").bind(appleSub).first<{ user_id: string }>();
    if (bySub) return bySub.user_id === userId ? "already_linked" : "apple_in_use";
    if (await this.db.prepare("SELECT 1 AS found FROM apple_links WHERE user_id = ?").bind(userId).first()) return "account_has_other_apple";
    await this.db.prepare("INSERT INTO apple_links (apple_sub, user_id, linked_at) VALUES (?, ?, ?)").bind(appleSub, userId, nowIso()).run();
    return "linked";
  }

  async appleSubOf(userId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT apple_sub FROM apple_links WHERE user_id = ?").bind(userId).first<{ apple_sub: string }>();
    return row?.apple_sub ?? null;
  }

  async appleRefreshToken(userId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT refresh_token FROM apple_links WHERE user_id = ?").bind(userId).first<{ refresh_token: string | null }>();
    return row?.refresh_token ?? null;
  }

  async setAppleRefreshToken(userId: string, token: string): Promise<void> {
    await this.db.prepare("UPDATE apple_links SET refresh_token = ? WHERE user_id = ?").bind(token, userId).run();
  }

  async userByApple(appleSub: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT user_id FROM apple_links WHERE apple_sub = ?").bind(appleSub).first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  async appleLinked(userId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM apple_links WHERE user_id = ?").bind(userId).first());
  }

  async ageGroup(userId: string): Promise<AgeGroup | null> {
    const row = await this.db.prepare("SELECT age_group FROM user_limits WHERE user_id = ?").bind(userId).first<{ age_group: AgeGroup }>();
    return row?.age_group ?? null;
  }

  async setAgeGroup(userId: string, group: AgeGroup): Promise<void> {
    await this.db.prepare("INSERT INTO user_limits (user_id, age_group, set_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET age_group = excluded.age_group, set_at = excluded.set_at")
      .bind(userId, group, nowIso()).run();
  }

  async purchasedProducts(userId: string, from: string, to: string): Promise<{ productId: string; priceYen: number | null }[]> {
    // Counted in the month the purchase was made (a late verification still counts there), by what Apple charged.
    const rows = await this.db.prepare("SELECT product_id, price_yen FROM purchases WHERE user_id = ? AND revoked_at IS NULL AND COALESCE(purchased_at, granted_at) >= ? AND COALESCE(purchased_at, granted_at) < ?")
      .bind(userId, from, to).all<{ product_id: string; price_yen: number | null }>();
    return (rows.results ?? []).map((row) => ({ productId: row.product_id, priceYen: row.price_yen ?? null }));
  }

  async hitRateLimit(key: string, window: number, windowMs: number): Promise<number> {
    // One statement and nothing else: the counter says when it expires, and the hourly clean-up removes it by that time.
    const row = await this.db.prepare("INSERT INTO rate_limits (key, window, count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count")
      .bind(key, window, (window + 2) * windowMs).first<{ count: number }>();
    return row?.count ?? 1;
  }

  async wallet(userId: string): Promise<Wallet> {
    const row = await this.db.prepare("SELECT tickets, matatabi FROM wallet WHERE user_id = ?").bind(userId).first<{ tickets: number; matatabi: number }>();
    return { tickets: row?.tickets ?? 0, matatabi: row?.matatabi ?? 0 };
  }

  async consume(userId: string, currency: Currency, amount: number, ref: string): Promise<"ok" | "duplicate" | "short"> {
    const column = COLUMN[currency];
    // The same request id again means the first call got through and only its answer was lost: it is not spent twice, and it is not "short".
    if (await this.db.prepare("SELECT 1 AS found FROM wallet_ledger WHERE user_id = ? AND currency = ? AND reason = 'consume' AND ref = ?").bind(userId, currency, ref).first()) return "duplicate";
    const result = await this.db.prepare(`INSERT INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
      SELECT ?, ?, ?, ?, 'consume', ?, ? WHERE COALESCE((SELECT ${column} FROM wallet WHERE user_id = ?), 0) >= ?
      ON CONFLICT(user_id, currency, reason, ref) DO NOTHING`)
      .bind(ledgerId(), userId, currency, -amount, ref, nowIso(), userId, amount).run();
    return (result.meta?.changes ?? 0) > 0 ? "ok" : "short";
  }

  async recordPurchase(userId: string, transaction: VerifiedTransaction, product: ProductDefinition): Promise<boolean> {
    const now = nowIso();
    const statements = [
      // Nothing is granted for a transaction whose refund is already on record: the statements below follow `changes()`.
      this.db.prepare(`INSERT OR IGNORE INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at, environment, purchased_at, price_yen)
        SELECT ?, ?, ?, ?, ?, NULL, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM revoked_transactions WHERE transaction_id = ?)`)
        .bind(transaction.transactionId, userId, transaction.productId, transaction.originalTransactionId ?? null, now, transaction.environment ?? "Production",
          new Date(transaction.purchaseDate).toISOString(), transaction.currency === "JPY" && transaction.price !== undefined ? Math.round(transaction.price / 1000) : null,
          transaction.transactionId)
    ];
    // A one-time product holds one currency, so the single `changes()` above is the one that matters.
    const credit = (currency: Currency, amount: number | undefined): void => {
      if ((amount ?? 0) <= 0) return;
      statements.push(this.db.prepare(`INSERT OR IGNORE INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
        SELECT ?, ?, ?, ?, 'purchase', ?, ? WHERE changes() = 1`)
        .bind(`purchase:${transaction.transactionId}`, userId, currency, amount, transaction.transactionId, now));
    };
    credit("tickets", product.tickets);
    credit("matatabi", product.matatabi);
    const results = await this.db.batch(statements);
    return (results[0]?.meta?.changes ?? 0) > 0;
  }

  async recordPlanPeriod(userId: string, plan: string, periodStart: string, periodEnd: string, tickets: number, transactionId: string): Promise<void> {
    // The refund check is part of each statement, so a refund that lands between the caller's check and this write still wins.
    const notRefunded = "WHERE NOT EXISTS (SELECT 1 FROM revoked_transactions WHERE transaction_id = ?)";
    const statements = [
      this.db.prepare(`INSERT OR IGNORE INTO entitlements (user_id, plan, period_start, period_end, tickets_granted_period) SELECT ?, ?, ?, ?, ? ${notRefunded}`)
        .bind(userId, plan, periodStart, periodEnd, tickets, transactionId),
      ...(tickets > 0 ? [this.db.prepare(`INSERT OR IGNORE INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) SELECT ?, ?, 'tickets', ?, 'plan_monthly', ?, ? ${notRefunded}`)
        .bind(`plan:${transactionId}`, userId, tickets, transactionId, nowIso(), transactionId)] : [])
    ];
    await this.db.batch(statements);
  }

  async activePlan(userId: string, at: string): Promise<{ plan: string; until: string } | null> {
    const row = await this.db.prepare("SELECT plan, period_end FROM entitlements WHERE user_id = ? AND period_start <= ? AND period_end > ? ORDER BY period_end DESC LIMIT 1")
      .bind(userId, at, at).first<{ plan: string; period_end: string }>();
    return row ? { plan: row.plan, until: row.period_end } : null;
  }

  async revokePurchase(transactionId: string, product: ProductDefinition = {}, plan?: { name: string; periodStart: string }): Promise<void> {
    const now = nowIso();
    const statements = [
      // Remembered even when the purchase has not been seen yet, so a purchase that arrives later is not credited.
      this.db.prepare("INSERT OR IGNORE INTO revoked_transactions (transaction_id, revoked_at) VALUES (?, ?)").bind(transactionId, now),
      this.db.prepare("UPDATE purchases SET revoked_at = ? WHERE apple_transaction_id = ? AND revoked_at IS NULL").bind(now, transactionId)
    ];
    // Only what is still unspent is taken back, up to what this purchase put in the wallet. What was already spent is not
    // charged to anyone (no debt); a shortfall is only recorded so that repeated refunds can restrict buying.
    const takeBack = (currency: Currency, amount: number): void => {
      const column = COLUMN[currency];
      statements.push(this.db.prepare(`INSERT OR IGNORE INTO refund_events (transaction_id, user_id, currency, amount, taken, shortfall, created_at)
        SELECT p.apple_transaction_id, p.user_id, ?, ?, MIN(?, w.${column}), ? - MIN(?, w.${column}), ?
        FROM purchases p JOIN wallet w ON w.user_id = p.user_id WHERE p.apple_transaction_id = ?`)
        .bind(currency, amount, amount, amount, amount, now, transactionId));
    };
    if ((product.tickets ?? 0) > 0) takeBack("tickets", product.tickets as number);
    else if ((product.matatabi ?? 0) > 0) takeBack("matatabi", product.matatabi as number);
    else if (plan) {
      // A refunded plan period ends now, and its monthly 券 are taken back if they are still unspent.
      statements.push(this.db.prepare("UPDATE entitlements SET period_end = ? WHERE plan = ? AND period_start = ? AND period_end > ? AND user_id = (SELECT user_id FROM purchases WHERE apple_transaction_id = ?)")
        .bind(now, plan.name, plan.periodStart, now, transactionId));
      statements.push(this.db.prepare(`INSERT OR IGNORE INTO refund_events (transaction_id, user_id, currency, amount, taken, shortfall, created_at)
        SELECT p.apple_transaction_id, p.user_id, 'tickets', l.delta, MIN(l.delta, w.tickets), l.delta - MIN(l.delta, w.tickets), ?
        FROM purchases p JOIN wallet w ON w.user_id = p.user_id
        JOIN wallet_ledger l ON l.id = 'plan:' || p.apple_transaction_id AND l.delta > 0
        WHERE p.apple_transaction_id = ?`)
        .bind(now, transactionId));
    }
    statements.push(this.db.prepare(`INSERT OR IGNORE INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
      SELECT 'refund:' || transaction_id, user_id, currency, -taken, 'refund', transaction_id, ? FROM refund_events WHERE transaction_id = ? AND taken > 0`)
      .bind(now, transactionId));
    await this.db.batch(statements);
  }

  async isRevoked(transactionId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM revoked_transactions WHERE transaction_id = ?").bind(transactionId).first());
  }

  async refundShortfalls(userId: string, since: string): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM refund_events WHERE user_id = ? AND shortfall > 0 AND created_at >= ?")
      .bind(userId, since).first<{ n: number }>();
    return row?.n ?? 0;
  }

  async purgeExpired(now: Date): Promise<PurgeOutcome> {
    // Counters that have expired go by the indexed expiry, a slice at a time (a run never takes long, whatever has piled up).
    let removed = 0;
    let reachedLimit = false;
    for (let batch = 0; batch < PURGE_BATCHES; batch += 1) {
      const result = await this.db.prepare("DELETE FROM rate_limits WHERE rowid IN (SELECT rowid FROM rate_limits WHERE expires_at < ? LIMIT ?)")
        .bind(now.getTime(), PURGE_BATCH_ROWS).run();
      const count = result.meta?.changes ?? 0;
      removed += count;
      if (count < PURGE_BATCH_ROWS) break;
      if (batch === PURGE_BATCHES - 1) reachedLimit = true;
    }
    const expired = await this.db.prepare("SELECT COUNT(*) AS n, MIN(expires_at) AS oldest FROM rate_limits WHERE expires_at < ?")
      .bind(now.getTime()).first<{ n: number; oldest: number | null }>();
    const total = await this.db.prepare("SELECT COUNT(*) AS n FROM rate_limits").first<{ n: number }>();
    const expiredLeft = expired?.n ?? 0;
    return {
      rateLimitsRemoved: removed,
      rateLimitsRemaining: (total?.n ?? 0) - expiredLeft,
      expiredLeft,
      oldestExpiredAgeMs: expiredLeft > 0 && expired?.oldest != null ? Math.max(0, now.getTime() - expired.oldest) : 0,
      reachedLimit
    };
  }
}

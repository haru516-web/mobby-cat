import { appleRevocationConfigured, equalSecretHash, exchangeAppleAuthorizationCodeFull, hashSecret, randomToken, revokeAppleToken, verifyAppleIdentityToken, verifySignedPayload, verifySignedTransaction } from "./crypto.ts";
import { D1Store } from "./store.ts";
import { documentPageHtml, privacyPageHtml } from "./privacyPolicy.ts";
import { SUPPORT_MARKDOWN, SUPPORT_TITLE } from "./supportPage.ts";
import { LEGAL_MARKDOWN, LEGAL_NOTICE_TITLE } from "./legalNotice.ts";
import type { AgeGroup, Currency, Env, ExecutionContext, ProductDefinition, Store, VerifiedTransaction } from "./types.ts";

/** Monthly spending caps in yen by self-declared age group, following the Japanese online-game industry guideline. null means no cap. */
const MONTHLY_CAP_YEN: Record<AgeGroup, number | null> = { under16: 5000, "16to19": 10000, adult: null };
const AGE_RANK: Record<AgeGroup, number> = { under16: 0, "16to19": 1, adult: 2 };
const isAgeGroup = (value: unknown): value is AgeGroup => value === "under16" || value === "16to19" || value === "adult";
const isCurrency = (value: unknown): value is Currency => value === "tickets" || value === "matatabi";

/** The current calendar month in Tokyo, as UTC instants [from, to). */
function tokyoMonthRange(now: Date): { from: string; to: string } {
  const hour = 3_600_000;
  const shifted = new Date(now.getTime() + 9 * hour);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  return { from: new Date(Date.UTC(year, month, 1) - 9 * hour).toISOString(), to: new Date(Date.UTC(year, month + 1, 1) - 9 * hour).toISOString() };
}

/** The largest record kept for one account. A real record is a few kilobytes. */
const MAX_SAVE_CHARS = 400_000;

/** Anonymous sign-ups allowed from one source address. */
const REGISTER_PER_MINUTE = 5;
const REGISTER_PER_DAY = 30;

// Two refunds that came after what they bought was spent, within half a year, stop further purchases.
const REFUND_RESTRICT_COUNT = 2;
const REFUND_RESTRICT_WINDOW_MS = 180 * 86_400_000;

const PAGE_HEADERS = { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" };

/** Whether purchases from this StoreKit environment are credited. TestFlight and App Review buy in the Sandbox. */
function environmentAccepted(env: Env, transaction: VerifiedTransaction): boolean {
  const accepted = (env.PURCHASE_ENVIRONMENTS ?? "Production").split(",").map((name) => name.trim()).filter(Boolean);
  return accepted.includes(transaction.environment ?? "Production");
}

/** After a sign-in, trade its authorization code for Apple's refresh token and keep it, so it can be revoked on deletion. */
async function keepAppleRefreshToken(env: Env, store: Store, userId: string, authorizationCode: unknown, now: Date, expectedSubject: string): Promise<void> {
  if (!appleRevocationConfigured(env) || typeof authorizationCode !== "string" || authorizationCode.length < 8 || authorizationCode.length > 2000) return;
  try {
    const exchanged = await exchangeAppleAuthorizationCodeFull(authorizationCode, env, now.getTime());
    // Only a token that is shown to belong to the Apple ID being signed in is kept (an unknown or other ID's is not).
    if (exchanged && exchanged.subject === expectedSubject) await store.setAppleRefreshToken(userId, exchanged.refreshToken);
  } catch { /* the sign-in itself succeeded; the token is only needed at deletion */ }
}

/** At most `max` calls of one kind from one player in the window; the 429 is the same everywhere. */
async function limit(store: Store, kind: string, userId: string, windowMs: number, max: number, now: Date): Promise<void> {
  const count = await store.hitRateLimit(`${kind}:${userId}`, Math.floor(now.getTime() / windowMs), windowMs);
  if (count > max) throw new HttpError(429, "rate_limited");
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

/**
 * The largest request body each kind of call may send, in bytes. An ordinary call is a few hundred bytes; a signed
 * transaction or notification is at most 200,000 characters of base64 plus its wrapper; a save is at most 400,000
 * characters of text, which in UTF-8 and with the escaping of quotes can be several times that many bytes.
 */
const BODY_BYTES = { ordinary: 16_384, signed: 262_144, save: 1_500_000 } as const;

/** The body as bytes, refusing (413) one that is larger than `maxBytes` before it is held or parsed, whatever the header says. */
async function readBodyBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => undefined); throw new HttpError(413, "payload_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function body(request: Request, maxBytes: number = BODY_BYTES.ordinary): Promise<Record<string, unknown>> {
  // Too large is 413 and is not turned into "invalid JSON" below.
  const bytes = await readBodyBytes(request, maxBytes);
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("body must be an object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

function configuredProducts(env: Env): Record<string, ProductDefinition> {
  let products: Record<string, ProductDefinition> = {};
  if (env.PRODUCT_CATALOG_JSON) {
    try { products = JSON.parse(env.PRODUCT_CATALOG_JSON) as Record<string, ProductDefinition>; } catch { throw new HttpError(500, "invalid_server_configuration"); }
  }
  const validAmount = (amount: number | undefined): boolean => amount === undefined || (Number.isSafeInteger(amount) && amount >= 0);
  for (const [id, product] of Object.entries(products)) {
    const oneTime = (product?.tickets ?? 0) > 0 || (product?.matatabi ?? 0) > 0;
    if (!id || !product || (product.plan !== undefined && typeof product.plan !== "string") ||
        !validAmount(product.tickets) || !validAmount(product.matatabi) || !validAmount(product.monthlyTickets) || !validAmount(product.priceYen) ||
        // One currency per one-time product, and never together with a plan: a refund could not tell which part to take back.
        ((product.tickets ?? 0) > 0 && (product.matatabi ?? 0) > 0) ||
        (oneTime && (product.plan !== undefined || (product.monthlyTickets ?? 0) > 0))) {
      throw new HttpError(500, "invalid_product_configuration");
    }
  }
  return products;
}

/** The plan period a transaction opened, so a refund can end it. */
function planOf(product: ProductDefinition | undefined, transaction: VerifiedTransaction): { name: string; periodStart: string } | undefined {
  return product?.plan && transaction.expiresDate ? { name: product.plan, periodStart: new Date(transaction.purchaseDate).toISOString() } : undefined;
}

/** A plan's billing period: remembered, and its monthly 券 credited once (an expired period grants nothing). */
async function recordPlanPeriod(store: Store, userId: string, transaction: VerifiedTransaction, product: ProductDefinition, now: Date): Promise<void> {
  if (!product.plan || !transaction.expiresDate || transaction.revocationDate) return;
  // A refund can reach the server before the purchase does: its 券 are not credited afterwards.
  if (await store.isRevoked(transaction.transactionId)) return;
  const expired = transaction.expiresDate <= now.getTime();
  await store.recordPlanPeriod(userId, product.plan, new Date(transaction.purchaseDate).toISOString(), new Date(transaction.expiresDate).toISOString(), expired ? 0 : product.monthlyTickets ?? 0, transaction.transactionId);
}

function requireString(value: unknown, code: string, maxLength = 160): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) throw new HttpError(400, code);
  return value;
}

async function authenticatedUser(request: Request, store: Store): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^.]+)\.([A-Za-z0-9_-]{32,})$/.exec(authorization);
  if (!match) throw new HttpError(401, "unauthorized");
  const [, userId, secret] = match;
  const storedHash = await store.credentialHash(userId);
  if (!storedHash || !equalSecretHash(storedHash, await hashSecret(secret))) throw new HttpError(401, "unauthorized");
  return userId;
}

async function handle(request: Request, env: Env, store: Store, now = new Date()): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (method === "GET" && path === "/health") return json({ ok: true });
  if (method === "GET" && path === "/support") return new Response(documentPageHtml(SUPPORT_TITLE, SUPPORT_MARKDOWN), { headers: PAGE_HEADERS });
  if (method === "GET" && path === "/legal") return new Response(documentPageHtml(LEGAL_NOTICE_TITLE, LEGAL_MARKDOWN), { headers: PAGE_HEADERS });
  if (method === "GET" && path === "/privacy") return new Response(privacyPageHtml(), { headers: PAGE_HEADERS });
  // The app sets its day by this clock, so moving the device clock forward does not bring the next days' cats early. Nothing is stored.
  if (method === "GET" && path === "/time") return json({ now: now.getTime() });

  // Every other call is counted per source address before anything costly (a signature check, a database read) is done.
  // The counter is Cloudflare's, kept for a minute in memory at the edge, never in the database.
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limiter = path === "/apple/notifications" ? env.NOTIFY_LIMITER : env.IP_LIMITER;
  if (limiter && !(await limiter.limit({ key: ip })).success) throw new HttpError(429, "rate_limited");

  if (method === "POST" && path === "/auth/register") {
    const perMinute = await store.hitRateLimit(`register:minute:${ip}`, Math.floor(now.getTime() / 60_000), 60_000);
    const perDay = await store.hitRateLimit(`register:day:${ip}`, Math.floor(now.getTime() / 86_400_000), 86_400_000);
    if (perMinute > REGISTER_PER_MINUTE || perDay > REGISTER_PER_DAY) throw new HttpError(429, "rate_limited");
    const id = crypto.randomUUID();
    const secret = randomToken(32);
    await store.registerUser(id, await hashSecret(secret));
    return json({ userId: id, secret }, 201);
  }

  if (method === "POST" && path === "/auth/apple") {
    const perMinute = await store.hitRateLimit(`apple:minute:${ip}`, Math.floor(now.getTime() / 60_000), 60_000);
    if (perMinute > REGISTER_PER_MINUTE) throw new HttpError(429, "rate_limited");
    const input = await body(request);
    const token = requireString(input.identityToken, "missing_identity_token", 8000);
    let appleSub: string;
    try { appleSub = (await verifyAppleIdentityToken(token, env, now.getTime())).sub; }
    catch { throw new HttpError(401, "invalid_apple_token"); }
    const userId = await store.userByApple(appleSub);
    if (!userId) throw new HttpError(404, "no_linked_account");
    await keepAppleRefreshToken(env, store, userId, input.authorizationCode, now, appleSub);
    // A new device takes the account over: the old device's secret stops working.
    const secret = randomToken(32);
    await store.rotateSecret(userId, await hashSecret(secret));
    return json({ userId, secret });
  }

  if (method === "POST" && path === "/apple/notifications") {
    const input = await body(request, BODY_BYTES.signed);
    const signedPayload = requireString(input.signedPayload, "missing_signed_payload", 200_000);
    let notification: Record<string, unknown>;
    try { notification = await verifySignedPayload(signedPayload, env); }
    catch { throw new HttpError(400, "invalid_notification_signature"); }
    const data = notification.data && typeof notification.data === "object" ? notification.data as Record<string, unknown> : {};
    if (typeof notification.notificationType !== "string") throw new HttpError(400, "invalid_notification_payload");
    if (notification.notificationType === "TEST") return new Response(null, { status: 204 });
    if (typeof data.bundleId !== "string" || data.bundleId !== env.APPLE_BUNDLE_ID) throw new HttpError(400, "unexpected_bundle_id");
    if (typeof data.signedTransactionInfo === "string") {
      let transaction: VerifiedTransaction;
      try {
        transaction = await verifySignedTransaction(data.signedTransactionInfo, env);
      } catch { throw new HttpError(400, "invalid_notification_transaction"); }
      const product = configuredProducts(env)[transaction.productId];
      if (transaction.revocationDate || notification.notificationType === "REFUND" || notification.notificationType === "REVOKE") {
        await store.revokePurchase(transaction.transactionId, product, planOf(product, transaction));
      } else if (transaction.appAccountToken && environmentAccepted(env, transaction)) {
        if (product && await store.userExists(transaction.appAccountToken)) {
          await store.recordPurchase(transaction.appAccountToken, transaction, product);
          await recordPlanPeriod(store, transaction.appAccountToken, transaction, product, now);
        }
      }
    }
    return new Response(null, { status: 204 });
  }

  const userId = await authenticatedUser(request, store);

  if (method === "GET" && path === "/profile") {
    return json({ appleLinked: await store.appleLinked(userId), ageGroup: await store.ageGroup(userId) });
  }

  if (method === "POST" && path === "/account/apple/link") {
    await limit(store, "link", userId, 3_600_000, 20, now);
    const input = await body(request);
    const token = requireString(input.identityToken, "missing_identity_token", 8000);
    let appleSub: string;
    try { appleSub = (await verifyAppleIdentityToken(token, env, now.getTime())).sub; }
    catch { throw new HttpError(401, "invalid_apple_token"); }
    const result = await store.linkApple(userId, appleSub);
    if (result === "apple_in_use" || result === "account_has_other_apple") throw new HttpError(409, result);
    await keepAppleRefreshToken(env, store, userId, input.authorizationCode, now, appleSub);
    return json({ status: result });
  }

  // Deleting the account is final: it needs the exact confirmation word, and the credentials stop working at once.
  if (method === "POST" && path === "/account/delete") {
    const input = await body(request);
    if (input.confirm !== "delete") throw new HttpError(400, "confirmation_required");
    // An account tied to an Apple ID is never erased without telling Apple that the app no longer holds that authorization.
    // If that cannot be done the account is kept, so it can be tried again: no key set up (503), no token held and no
    // fresh authorization code sent (409: the app signs in with Apple again and repeats), or Apple refusing (502).
    if (await store.appleLinked(userId)) {
      if (!appleRevocationConfigured(env)) throw new HttpError(503, "apple_revocation_unavailable");
      let refreshToken = await store.appleRefreshToken(userId);
      if (!refreshToken && typeof input.authorizationCode === "string" && input.authorizationCode.length >= 8 && input.authorizationCode.length <= 2000) {
        let exchanged: { refreshToken: string; subject: string | null } | null = null;
        try { exchanged = await exchangeAppleAuthorizationCodeFull(input.authorizationCode, env, now.getTime()); } catch { exchanged = null; }
        // The authorization has to be this account's own Apple ID: another person's must not be revoked, nor this account deleted by it.
        const linked = await store.appleSubOf(userId);
        if (exchanged) {
          // Nothing is revoked or deleted unless the authorization is shown to be this account's own Apple ID.
          if (!exchanged.subject || !linked) throw new HttpError(409, "apple_identity_unverified");
          if (exchanged.subject !== linked) throw new HttpError(409, "apple_account_mismatch");
        }
        refreshToken = exchanged?.refreshToken ?? null;
      }
      if (!refreshToken) throw new HttpError(409, "apple_reauth_required");
      let revoked = false;
      try { revoked = await revokeAppleToken(refreshToken, env, now.getTime()); } catch { revoked = false; }
      if (!revoked) throw new HttpError(502, "apple_revoke_failed");
    }
    await store.deleteUser(userId);
    return json({ status: "deleted" });
  }

  // The whole record, kept only for accounts tied to an Apple ID, so a new device can pick it up.
  if (method === "GET" && path === "/save") {
    await limit(store, "save-read", userId, 3_600_000, 120, now);
    if (!(await store.appleLinked(userId))) throw new HttpError(403, "apple_required");
    const save = await store.cloudSave(userId);
    if (!save) throw new HttpError(404, "no_save");
    return json(save);
  }

  if (method === "POST" && path === "/save") {
    // The app saves at most once a minute (and when it is closed); this leaves room for that and stops a flood of 400 KB writes.
    await limit(store, "save-write", userId, 3_600_000, 120, now);
    if (!(await store.appleLinked(userId))) throw new HttpError(403, "apple_required");
    const input = await body(request, BODY_BYTES.save);
    const data = input.data;
    if (typeof data !== "string" || data.length < 2) throw new HttpError(400, "invalid_save");
    if (data.length > MAX_SAVE_CHARS) throw new HttpError(413, "save_too_large");
    const baseVersion = input.baseVersion;
    if (typeof baseVersion !== "number" || !Number.isSafeInteger(baseVersion) || baseVersion < 0) throw new HttpError(400, "invalid_base_version");
    const version = await store.putCloudSave(userId, data, baseVersion);
    if (version === null) throw new HttpError(409, "save_changed_elsewhere");
    return json({ version });
  }

  if (method === "POST" && path === "/purchases/verify") {
    await limit(store, "verify", userId, 3_600_000, 60, now);
    const input = await body(request, BODY_BYTES.signed);
    const signedTransaction = requireString(input.signedTransactionInfo ?? input.jws, "missing_signed_transaction", 200_000);
    let transaction: VerifiedTransaction;
    try { transaction = await verifySignedTransaction(signedTransaction, env); }
    catch { throw new HttpError(400, "invalid_storekit_transaction"); }
    const product = configuredProducts(env)[transaction.productId];
    if (!product) throw new HttpError(400, "unknown_product");
    if (!environmentAccepted(env, transaction)) throw new HttpError(403, "environment_not_accepted");
    if (!transaction.appAccountToken) throw new HttpError(400, "missing_app_account_token");
    if (transaction.appAccountToken !== userId) throw new HttpError(403, "app_account_token_mismatch");
    if (transaction.revocationDate) {
      await store.revokePurchase(transaction.transactionId, product, planOf(product, transaction));
      return json({ status: "revoked" });
    }
    // A refund that arrived first is remembered: the older, still validly signed purchase credits nothing.
    if (await store.isRevoked(transaction.transactionId)) return json({ status: "revoked" });
    const granted = await store.recordPurchase(userId, transaction, product);
    await recordPlanPeriod(store, userId, transaction, product, now);
    return json({ status: granted ? "verified" : "already_processed" });
  }

  if (method === "GET" && path === "/wallet") return json(await store.wallet(userId));

  if (method === "POST" && path === "/wallet/consume") {
    await limit(store, "consume", userId, 3_600_000, 600, now);
    const input = await body(request);
    if (!isCurrency(input.currency)) throw new HttpError(400, "invalid_currency");
    const amount = input.amount;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000) throw new HttpError(400, "invalid_amount");
    const ref = requireString(input.requestId, "missing_request_id", 128);
    const result = await store.consume(userId, input.currency, amount, ref);
    if (result === "short") throw new HttpError(409, "insufficient_balance");
    return json({ consumed: amount, duplicate: result === "duplicate", remaining: await store.wallet(userId) });
  }

  if (method === "GET" && path === "/plan") {
    // until: when the current period ends, so the app stops the pass on time even while it cannot reach the server.
    const active = await store.activePlan(userId, now.toISOString());
    return json(active ? { plan: active.plan, until: active.until } : { plan: "none" });
  }

  if (method === "POST" && path === "/profile/age-group") {
    await limit(store, "age", userId, 3_600_000, 20, now);
    const input = await body(request);
    if (!isAgeGroup(input.ageGroup)) throw new HttpError(400, "invalid_age_group");
    const current = await store.ageGroup(userId);
    // A mistaken choice can be lowered at any time; raising it would lift the cap, so it is not allowed from the app.
    if (current && AGE_RANK[input.ageGroup] > AGE_RANK[current]) throw new HttpError(409, "age_group_cannot_be_raised");
    await store.setAgeGroup(userId, input.ageGroup);
    return json({ ageGroup: input.ageGroup });
  }

  if (method === "GET" && path === "/limits") {
    const ageGroup = await store.ageGroup(userId);
    const { from, to } = tokyoMonthRange(now);
    const products = configuredProducts(env);
    // What Apple charged (in yen) in the month the purchase was made; the catalog price only when Apple did not say (another currency, an old record).
    const spentYen = (await store.purchasedProducts(userId, from, to)).reduce((sum, row) => sum + (row.priceYen ?? products[row.productId]?.priceYen ?? 0), 0);
    // Until an age group is chosen the strictest cap applies.
    const capYen = MONTHLY_CAP_YEN[ageGroup ?? "under16"];
    const restricted = await store.refundShortfalls(userId, new Date(now.getTime() - REFUND_RESTRICT_WINDOW_MS).toISOString()) >= REFUND_RESTRICT_COUNT;
    return json({ ageGroup, capYen, spentYen, remainingYen: capYen === null ? null : Math.max(0, capYen - spentYen), restricted });
  }

  throw new HttpError(404, "not_found");
}

// Credentials travel in the Authorization header, never in cookies, so any origin (such as the web build) may call the API.
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400"
};

async function respond(request: Request, env: Env, store: Store, now: Date): Promise<Response> {
  try { return await handle(request, env, store, now); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.code }, error.status);
    console.error("Request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "internal_error" }, 500);
  }
}

export async function handleWithStore(request: Request, env: Env, store: Store, now = new Date()): Promise<Response> {
  if (request.method.toUpperCase() === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const response = await respond(request, env, store, now);
  for (const [name, value] of Object.entries(CORS_HEADERS)) response.headers.set(name, value);
  return response;
}

const worker = {
  fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    return handleWithStore(request, env, new D1Store(env.DB), new Date());
  },
  /** Runs every hour (wrangler.toml [triggers]): drops counters that have passed their time. */
  async scheduled(_event: unknown, env: Env, _context: ExecutionContext): Promise<void> {
    const outcome = await new D1Store(env.DB).purgeExpired(new Date());
    // A warning when it is behind: expired counters are left, or the run used all its slices.
    const behind = outcome.expiredLeft > 0 || outcome.reachedLimit;
    (behind ? console.warn : console.log)(JSON.stringify({ event: "purge", behind, ...outcome }));
  }
};

export default worker;

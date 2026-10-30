import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import { handleWithStore } from "../src/worker.ts";
import { D1Store } from "../src/store.ts";
import { hashSecret } from "../src/crypto.ts";
import { appleFixture, appleIdToken, baseEnv, BUNDLE_ID, selfSignedTestRoot, signedTransaction, signJws } from "./helpers.mjs";

const TICKET3 = "com.mobbycat.app.ticket.3";
const MATATABI5 = "com.mobbycat.app.matatabi.5";
const PASS = "com.mobbycat.app.matatabipass.monthly";

class SQLiteStatement {
  constructor(database, query, values = []) { this.database = database; this.query = query; this.values = values; }
  bind(...values) { return new SQLiteStatement(this.database, this.query, values); }
  async first() { return this.database.prepare(this.query).get(...this.values) ?? null; }
  async all() { return { success: true, results: this.database.prepare(this.query).all(...this.values) }; }
  async run() {
    const result = this.database.prepare(this.query).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SQLiteD1 {
  constructor(database) { this.database = database; }
  prepare(query) { return new SQLiteStatement(this.database, query); }
  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

/** A real D1Store on an in-memory SQLite database made from schema.sql, and a way to call the worker as the app does. */
function createContext(env = baseEnv) {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const credentials = new Map();
  const call = async (method, path, { body, user, envOverride, ip, now } = {}) => {
    const headers = { "content-type": "application/json" };
    if (user) headers.authorization = `Bearer ${credentials.get(user)}`;
    if (ip) headers["CF-Connecting-IP"] = ip;
    const response = await handleWithStore(new Request(`https://server.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), envOverride ?? env, store, now);
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* a page, or no body */ }
    return { status: response.status, data, text, response };
  };
  const register = async () => {
    const reply = await call("POST", "/auth/register", { body: {} });
    assert.equal(reply.status, 201);
    credentials.set(reply.data.userId, `${reply.data.userId}.${reply.data.secret}`);
    return reply.data.userId;
  };
  return { database, store, credentials, call, register };
}

const rows = (context, sql, ...values) => context.database.prepare(sql).all(...values);
const withRoot = (root, extra = {}) => ({ ...baseEnv, APPLE_ROOT_CERTIFICATES: root.pem, ...extra });

async function purchase(context, root, user, productId, transactionId, extra = {}, extraEnv = {}) {
  const jws = await signedTransaction(root, { productId, transactionId, originalTransactionId: transactionId, appAccountToken: user, ...extra });
  return context.call("POST", "/purchases/verify", { user, body: { signedTransactionInfo: jws }, envOverride: withRoot(root, extraEnv) });
}

async function notify(context, root, type, transactionPayload) {
  const signedTransactionInfo = await signJws(root, { bundleId: BUNDLE_ID, ...transactionPayload });
  const signedPayload = await signJws(root, { notificationType: type, data: { bundleId: BUNDLE_ID, signedTransactionInfo } });
  return context.call("POST", "/apple/notifications", { body: { signedPayload }, envOverride: withRoot(root) });
}

test("health, the three public pages and CORS work, and the pages belong to this app only", async () => {
  const context = createContext();
  assert.deepEqual((await context.call("GET", "/health")).data, { ok: true });
  for (const path of ["/privacy", "/support", "/legal"]) {
    const page = await context.call("GET", path);
    assert.equal(page.status, 200, path);
    assert.match(page.text, /にゃっコレ|特定商取引法/, path);
    assert.doesNotMatch(page.text, /もび道|モビドウ|mobidou|木札|ガチャ|御朱印|フレンド/i, path);
  }
  const preflight = await handleWithStore(new Request("https://server.test/wallet", { method: "OPTIONS" }), baseEnv, context.store);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.equal((await context.call("GET", "/health")).response.headers.get("access-control-allow-origin"), "*");
  assert.equal((await context.call("GET", "/nope")).status, 401);
});

test("anonymous registration stores only the secret's SHA-256 hash and gives an empty wallet", async () => {
  const context = createContext();
  const user = await context.register();
  const secret = context.credentials.get(user).split(".")[1];
  const [stored] = rows(context, "SELECT secret_hash FROM users WHERE id = ?", user);
  assert.equal(stored.secret_hash, await hashSecret(secret));
  assert.notEqual(stored.secret_hash, secret);
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 0, matatabi: 0 });
  assert.equal((await context.call("GET", "/wallet")).status, 401);
});

test("registration is limited per address: five a minute, then 429; another address is unaffected", async () => {
  const context = createContext();
  for (let i = 0; i < 5; i += 1) assert.equal((await context.call("POST", "/auth/register", { body: {}, ip: "203.0.113.5" })).status, 201);
  assert.equal((await context.call("POST", "/auth/register", { body: {}, ip: "203.0.113.5" })).status, 429);
  assert.equal((await context.call("POST", "/auth/register", { body: {}, ip: "203.0.113.6" })).status, 201);
});

test("a purchase credits its tickets once; replaying it, or a tampered or unknown one, credits nothing", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  assert.equal((await purchase(context, root, user, TICKET3, "tx-1")).data.status, "verified");
  assert.equal((await purchase(context, root, user, TICKET3, "tx-1")).data.status, "already_processed");
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 3, matatabi: 0 });

  assert.equal((await purchase(context, root, user, MATATABI5, "tx-2")).data.status, "verified");
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 3, matatabi: 5 });

  assert.equal((await purchase(context, root, user, "com.mobbycat.app.unknown", "tx-3")).status, 400);
  const jws = await signedTransaction(root, { productId: TICKET3, transactionId: "tx-4", appAccountToken: user });
  const [header, payload, signature] = jws.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), productId: MATATABI5 })).toString("base64url");
  const reply = await context.call("POST", "/purchases/verify", { user, body: { signedTransactionInfo: `${header}.${forged}.${signature}` }, envOverride: withRoot(root) });
  assert.equal(reply.status, 400);
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 3, matatabi: 5 });
});

test("a purchase must carry the signed-in account's own appAccountToken", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const alice = await context.register();
  const bob = await context.register();
  assert.equal((await purchase(context, root, alice, TICKET3, "tx-a", { appAccountToken: bob })).status, 403);
  assert.equal((await purchase(context, root, alice, TICKET3, "tx-b", { appAccountToken: undefined })).status, 400);
  assert.deepEqual((await context.call("GET", "/wallet", { user: bob })).data, { tickets: 0, matatabi: 0 });
});

test("purchases are credited by environment: Production only unless Sandbox is switched on", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  assert.equal((await purchase(context, root, user, TICKET3, "sb-1", { environment: "Sandbox" })).status, 403);
  assert.equal((await purchase(context, root, user, TICKET3, "pr-1", { environment: "Production" })).data.status, "verified");
  assert.equal((await purchase(context, root, user, TICKET3, "sb-2", { environment: "Sandbox" }, { PURCHASE_ENVIRONMENTS: "Production,Sandbox" })).data.status, "verified");
  assert.equal(rows(context, "SELECT environment FROM purchases WHERE apple_transaction_id = 'sb-2'")[0].environment, "Sandbox");
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 6, matatabi: 0 });
});

test("spending takes from the balance once per request id, and never below zero", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  await purchase(context, root, user, TICKET3, "tx-1");
  const spend = (body) => context.call("POST", "/wallet/consume", { user, body });
  assert.equal((await spend({ currency: "tickets", amount: 2, requestId: "r1" })).data.remaining.tickets, 1);
  const again = await spend({ currency: "tickets", amount: 2, requestId: "r1" });
  assert.deepEqual([again.status, again.data.duplicate, again.data.remaining.tickets], [200, true, 1], "the same request id is answered again but not spent twice");
  assert.equal((await spend({ currency: "tickets", amount: 2, requestId: "r2" })).status, 409, "more than the balance");
  assert.equal((await spend({ currency: "matatabi", amount: 1, requestId: "r3" })).status, 409, "the other currency is separate");
  assert.equal((await spend({ currency: "coins", amount: 1, requestId: "r4" })).status, 400);
  assert.equal((await spend({ currency: "tickets", amount: 0, requestId: "r5" })).status, 400);
  assert.equal((await spend({ currency: "tickets", amount: 1, requestId: "r6" })).data.remaining.tickets, 0);
  assert.deepEqual((await context.call("GET", "/wallet", { user })).data, { tickets: 0, matatabi: 0 });
});

test("the plan credits its monthly tickets once per period, /plan reports it, and an expired period grants nothing", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  assert.equal((await context.call("GET", "/plan", { user })).data.plan, "none");
  assert.equal((await purchase(context, root, user, PASS, "pass-1")).data.status, "verified");
  assert.equal((await purchase(context, root, user, PASS, "pass-1")).data.status, "already_processed");
  assert.equal((await context.call("GET", "/plan", { user })).data.plan, "matatabi_pass");
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 2);

  // The renewal is a new transaction: another period, another two tickets.
  await purchase(context, root, user, PASS, "pass-2", { purchaseDate: Date.now() + 1000 });
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 4);

  const lapsed = await context.register();
  const day = 86_400_000;
  await purchase(context, root, lapsed, PASS, "old-1", { purchaseDate: Date.now() - 40 * day, expiresDate: Date.now() - 10 * day });
  assert.equal((await context.call("GET", "/wallet", { user: lapsed })).data.tickets, 0);
  assert.equal((await context.call("GET", "/plan", { user: lapsed })).data.plan, "none");
});

test("a refund takes back only what is unspent, ends a refunded plan period, and what was spent is only counted", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  await purchase(context, root, user, TICKET3, "t1");
  await context.call("POST", "/wallet/consume", { user, body: { currency: "tickets", amount: 1, requestId: "spent" } });
  const refunded = await notify(context, root, "REFUND", { transactionId: "t1", originalTransactionId: "t1", productId: TICKET3, appAccountToken: user, purchaseDate: Date.now(), revocationDate: Date.now() });
  assert.equal(refunded.status, 204);
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 0, "the 2 unspent are gone, the 1 spent is not charged");
  assert.deepEqual(rows(context, "SELECT currency, amount, taken, shortfall FROM refund_events").map((row) => ({ ...row })), [{ currency: "tickets", amount: 3, taken: 2, shortfall: 1 }]);
  // The same refund again changes nothing.
  await notify(context, root, "REFUND", { transactionId: "t1", productId: TICKET3, appAccountToken: user, purchaseDate: Date.now(), revocationDate: Date.now() });
  assert.equal(rows(context, "SELECT * FROM wallet_ledger WHERE reason = 'refund'").length, 1);

  // Apple's refund names the same period (purchaseDate) the purchase opened.
  const period = { purchaseDate: Date.now() - 1000, expiresDate: Date.now() + 30 * 86_400_000 };
  await purchase(context, root, user, PASS, "p1", period);
  assert.equal((await context.call("GET", "/plan", { user })).data.plan, "matatabi_pass");
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 2);
  await notify(context, root, "REFUND", { transactionId: "p1", productId: PASS, appAccountToken: user, ...period, revocationDate: Date.now() });
  assert.equal((await context.call("GET", "/plan", { user })).data.plan, "none");
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 0);
});

test("a refund that arrives before its purchase leaves the later purchase uncredited", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  await notify(context, root, "REFUND", { transactionId: "early", productId: TICKET3, appAccountToken: user, purchaseDate: Date.now(), revocationDate: Date.now() });
  const late = await purchase(context, root, user, TICKET3, "early");
  assert.equal(late.data.status, "revoked");
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 0);
});

test("a purchase announced by Apple is credited to the account in its appAccountToken, and a stranger's token credits nobody", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  const now = Date.now();
  assert.equal((await notify(context, root, "ONE_TIME_CHARGE", { transactionId: "n1", productId: TICKET3, appAccountToken: user, purchaseDate: now })).status, 204);
  assert.equal((await context.call("GET", "/wallet", { user })).data.tickets, 3);
  await notify(context, root, "ONE_TIME_CHARGE", { transactionId: "n2", productId: TICKET3, appAccountToken: "no-such-user", purchaseDate: now });
  assert.equal(rows(context, "SELECT * FROM purchases WHERE apple_transaction_id = 'n2'").length, 0);
  // Wrong bundle, tampered envelope: refused.
  const wrongBundle = await signJws(root, { notificationType: "REFUND", data: { bundleId: "com.other.app" } });
  assert.equal((await context.call("POST", "/apple/notifications", { body: { signedPayload: wrongBundle }, envOverride: withRoot(root) })).status, 400);
  assert.equal((await context.call("POST", "/apple/notifications", { body: { signedPayload: "a.b.c" }, envOverride: withRoot(root) })).status, 400);
});

test("monthly purchase cap by age group: strictest until chosen, lowered but never raised, counted per Tokyo month; two refunds of spent items restrict buying", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  let limits = (await context.call("GET", "/limits", { user })).data;
  assert.deepEqual([limits.ageGroup, limits.capYen, limits.spentYen, limits.restricted], [null, 5000, 0, false]);
  await purchase(context, root, user, TICKET3, "c1");
  limits = (await context.call("GET", "/limits", { user })).data;
  assert.deepEqual([limits.spentYen, limits.remainingYen], [320, 4680]);

  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "16to19" } })).status, 200);
  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "adult" } })).status, 409);
  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "under16" } })).status, 200);
  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "ten" } })).status, 400);
  const nextMonth = new Date(Date.now() + 40 * 86_400_000);
  assert.equal((await context.call("GET", "/limits", { user, now: nextMonth })).data.spentYen, 0);

  const adult = await context.register();
  await context.call("POST", "/profile/age-group", { user: adult, body: { ageGroup: "adult" } });
  limits = (await context.call("GET", "/limits", { user: adult })).data;
  assert.deepEqual([limits.capYen, limits.remainingYen], [null, null]);

  await context.call("POST", "/wallet/consume", { user, body: { currency: "tickets", amount: 3, requestId: "use-c1" } });
  for (const id of ["r1", "r2"]) {
    await purchase(context, root, user, TICKET3, id);
    await context.call("POST", "/wallet/consume", { user, body: { currency: "tickets", amount: 3, requestId: `use-${id}` } });
    await notify(context, root, "REFUND", { transactionId: id, productId: TICKET3, appAccountToken: user, purchaseDate: Date.now(), revocationDate: Date.now() });
  }
  assert.equal((await context.call("GET", "/limits", { user })).data.restricted, true);
});

test("Apple sign-in: link once, a new device takes the account over and the old device is signed out; one Apple ID, one account", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const user = await context.register();
  assert.equal((await context.call("GET", "/profile", { user })).data.appleLinked, false);
  assert.equal((await context.call("POST", "/account/apple/link", { user, body: { identityToken: "garbage" }, envOverride: appleEnv })).status, 401);
  assert.equal((await context.call("POST", "/account/apple/link", { user, body: { identityToken: await token() }, envOverride: appleEnv })).data.status, "linked");
  assert.equal((await context.call("POST", "/account/apple/link", { user, body: { identityToken: await token() }, envOverride: appleEnv })).data.status, "already_linked");
  assert.equal((await context.call("GET", "/profile", { user })).data.appleLinked, true);

  const stranger = await context.register();
  assert.equal((await context.call("POST", "/account/apple/link", { user: stranger, body: { identityToken: await token() }, envOverride: appleEnv })).status, 409);
  assert.equal((await context.call("POST", "/account/apple/link", { user, body: { identityToken: await token({ sub: "someone-else" }) }, envOverride: appleEnv })).status, 409);

  const oldSecret = context.credentials.get(user);
  const taken = await context.call("POST", "/auth/apple", { body: { identityToken: await token() }, envOverride: appleEnv });
  assert.equal(taken.status, 200);
  assert.equal(taken.data.userId, user);
  context.credentials.set(user, `${user}.${taken.data.secret}`);
  assert.equal((await context.call("GET", "/wallet", { user })).status, 200);
  context.credentials.set(user, oldSecret);
  assert.equal((await context.call("GET", "/wallet", { user })).status, 401, "the old device's secret stopped working");
  assert.equal((await context.call("POST", "/auth/apple", { body: { identityToken: await token({ sub: "never-linked" }) }, envOverride: appleEnv })).status, 404);
});

test("the cloud record is for Apple-linked accounts only, and versioned so a stale device cannot overwrite a newer record", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const user = await context.register();
  assert.equal((await context.call("GET", "/save", { user })).status, 403);
  assert.equal((await context.call("POST", "/save", { user, body: { data: "{}", baseVersion: 0 } })).status, 403);
  await context.call("POST", "/account/apple/link", { user, body: { identityToken: await token() }, envOverride: appleEnv });
  assert.equal((await context.call("GET", "/save", { user })).status, 404);
  assert.equal((await context.call("POST", "/save", { user, body: { data: '{"cats":1}', baseVersion: 0 } })).data.version, 1);
  assert.equal((await context.call("POST", "/save", { user, body: { data: '{"cats":2}', baseVersion: 1 } })).data.version, 2);
  assert.equal((await context.call("POST", "/save", { user, body: { data: '{"cats":0}', baseVersion: 1 } })).status, 409, "an older device cannot overwrite");
  assert.equal((await context.call("POST", "/save", { user, body: { data: '{"cats":9}', baseVersion: 0 } })).status, 409, "a device with no record cannot overwrite either");
  const saved = (await context.call("GET", "/save", { user })).data;
  assert.deepEqual([saved.data, saved.version], ['{"cats":2}', 2]);
  assert.equal((await context.call("POST", "/save", { user, body: { data: "x", baseVersion: 2 } })).status, 400);
  assert.equal((await context.call("POST", "/save", { user, body: { data: "x".repeat(400_001), baseVersion: 2 } })).status, 413);
  assert.equal((await context.call("POST", "/save", { user, body: { data: '{"a":1}', baseVersion: -1 } })).status, 400);
});

test("a request body over the limit is refused with 413 before it is parsed", async () => {
  const context = createContext();
  const user = await context.register();
  const big = await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "adult", pad: "x".repeat(20_000) } });
  assert.equal(big.status, 413);
  const chunked = new Request("https://server.test/profile/age-group", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${context.credentials.get(user)}` },
    body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(`{"pad":"${"x".repeat(20_000)}"}`)); controller.close(); } }), duplex: "half"
  });
  assert.equal((await handleWithStore(chunked, baseEnv, context.store)).status, 413);
  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "adult" } })).status, 200);
});

test("deleting an account needs the confirmation word, removes everything of the account and signs it out at once", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  const other = await context.register();
  await purchase(context, root, user, TICKET3, "d1");
  await purchase(context, root, user, PASS, "d2");
  await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "adult" } });
  await purchase(context, root, other, TICKET3, "o1");
  assert.equal((await context.call("POST", "/account/delete", { user, body: {} })).status, 400);
  assert.equal((await context.call("POST", "/account/delete", { user, body: { confirm: "yes" } })).status, 400);
  assert.equal((await context.call("POST", "/account/delete", { user, body: { confirm: "delete" } })).data.status, "deleted");
  assert.equal((await context.call("GET", "/wallet", { user })).status, 401);
  for (const table of ["users", "wallet", "wallet_ledger", "purchases", "entitlements", "user_limits", "apple_links", "cloud_saves"]) {
    const column = table === "users" ? "id" : "user_id";
    assert.equal(rows(context, `SELECT 1 FROM ${table} WHERE ${column} = ?`, user).length, 0, table);
  }
  assert.deepEqual((await context.call("GET", "/wallet", { user: other })).data, { tickets: 3, matatabi: 0 }, "other accounts are untouched");
});

test("deleting an Apple-linked account tells Apple first, and keeps the account when that cannot be done", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const signInEnv = { ...appleEnv, APPLE_TEAM_ID: "TEAM123456", APPLE_SIGN_IN_KEY_ID: "KEY1234567", APPLE_SIGN_IN_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----` };
  const realFetch = globalThis.fetch;
  const asked = [];
  let revokeAnswer = false;
  let exchangeSubject = "apple-person-1";
  globalThis.fetch = async (url, init) => {
    asked.push({ url: String(url), form: Object.fromEntries(new URLSearchParams(String(init.body))) });
    if (String(url).endsWith("/auth/token")) return new Response(JSON.stringify({ refresh_token: "refresh-abc", id_token: appleIdToken(exchangeSubject) }), { status: 200 });
    return new Response("{}", { status: revokeAnswer ? 200 : 400 });
  };
  try {
    const user = await context.register();
    // No key set up at all: nothing to revoke with, so the account is kept (503).
    await context.call("POST", "/account/apple/link", { user, body: { identityToken: await token() }, envOverride: appleEnv });
    const noKey = await context.call("POST", "/account/delete", { user, body: { confirm: "delete" }, envOverride: appleEnv });
    assert.deepEqual([noKey.status, noKey.data.error], [503, "apple_revocation_unavailable"]);
    // Key set up but this account holds no token and no fresh code is sent: the app must sign in again (409).
    const noToken = await context.call("POST", "/account/delete", { user, body: { confirm: "delete" }, envOverride: signInEnv });
    assert.deepEqual([noToken.status, noToken.data.error], [409, "apple_reauth_required"]);
    // A fresh authorization code of another Apple ID is neither revoked nor allowed to delete this account.
    exchangeSubject = "someone-else";
    const mismatch = await context.call("POST", "/account/delete", { user, body: { confirm: "delete", authorizationCode: "code-of-someone-else" }, envOverride: signInEnv });
    assert.deepEqual([mismatch.status, mismatch.data.error], [409, "apple_account_mismatch"]);
    assert.equal(asked.some((entry) => entry.url.endsWith("/auth/revoke")), false);
    assert.equal(await context.store.userExists(user), true);

    // The account's own authorization: Apple refusing keeps the account, then accepting deletes it, revoking the stored token.
    exchangeSubject = "apple-person-1";
    const refused = await context.call("POST", "/account/delete", { user, body: { confirm: "delete", authorizationCode: "fresh-code-1" }, envOverride: signInEnv });
    assert.deepEqual([refused.status, refused.data.error], [502, "apple_revoke_failed"]);
    assert.equal(asked.find((entry) => entry.url.endsWith("/auth/token")).form.client_id, BUNDLE_ID);
    assert.equal(await context.store.userExists(user), true);
    revokeAnswer = true;
    assert.equal((await context.call("POST", "/account/delete", { user, body: { confirm: "delete", authorizationCode: "fresh-code-2" }, envOverride: signInEnv })).data.status, "deleted");
    assert.equal(asked.at(-1).url, "https://appleid.apple.com/auth/revoke");
    assert.equal(asked.at(-1).form.token, "refresh-abc");
    assert.equal(await context.store.userExists(user), false);

    // An account with no Apple link deletes without involving Apple at all.
    const plain = await context.register();
    const before = asked.length;
    assert.equal((await context.call("POST", "/account/delete", { user: plain, body: { confirm: "delete" }, envOverride: appleEnv })).data.status, "deleted");
    assert.equal(asked.length, before);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a product catalog that mixes tickets with a plan, or two currencies, is a configuration error", async () => {
  for (const bad of [{ x: { tickets: 1, plan: "p" } }, { x: { tickets: 1, matatabi: 1 } }, { x: { matatabi: 2, monthlyTickets: 1 } }, { x: { tickets: -1 } }]) {
    const context = createContext({ ...baseEnv, PRODUCT_CATALOG_JSON: JSON.stringify(bad) });
    const user = await context.register();
    assert.equal((await context.call("GET", "/limits", { user })).status, 500, JSON.stringify(bad));
  }
});

test("the hourly clean-up removes expired rate-limit counters and keeps live ones", async () => {
  const context = createContext();
  await context.store.hitRateLimit("old", 1, 60_000);
  await context.store.hitRateLimit("live", Math.floor(Date.now() / 60_000), 60_000);
  const outcome = await context.store.purgeExpired(new Date());
  assert.equal(outcome.rateLimitsRemoved, 1);
  assert.equal(outcome.rateLimitsRemaining, 1);
  assert.equal(outcome.expiredLeft, 0);
});

test("/time gives the server clock, and /plan says when the current period ends", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const at = new Date("2026-10-29T12:00:00.000Z");
  assert.deepEqual((await context.call("GET", "/time", { now: at })).data, { now: at.getTime() });

  const user = await context.register();
  const ends = Date.now() + 30 * 86_400_000;
  await purchase(context, root, user, PASS, "pass-until", { purchaseDate: Date.now() - 1000, expiresDate: ends });
  assert.deepEqual((await context.call("GET", "/plan", { user })).data, { plan: "matatabi_pass", until: new Date(ends).toISOString() });
});

test("the monthly cap counts what Apple charged, in the month the purchase was made", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const user = await context.register();
  // Apple's price is in thousandths of the currency: ¥250 here, not the catalog's ¥320.
  await purchase(context, root, user, TICKET3, "paid-yen", { price: 250_000, currency: "JPY" });
  // Another currency: the catalog price is used.
  await purchase(context, root, user, TICKET3, "paid-usd", { price: 1_990, currency: "USD" });
  assert.equal((await context.call("GET", "/limits", { user })).data.spentYen, 250 + 320);

  // Bought last month and only verified now: it belongs to last month.
  const lastMonth = Date.now() - 40 * 86_400_000;
  await purchase(context, root, user, TICKET3, "late", { purchaseDate: lastMonth, price: 320_000, currency: "JPY" });
  assert.equal((await context.call("GET", "/limits", { user })).data.spentYen, 250 + 320);
  assert.equal((await context.call("GET", "/limits", { user, now: new Date(lastMonth) })).data.spentYen, 320);
});

test("calls are limited per source address before any work, and per account for the costly ones", async () => {
  const context = createContext();
  let allowed = 2;
  const limiter = { limit: async () => ({ success: allowed-- > 0 }) };
  const env = { ...baseEnv, IP_LIMITER: limiter };
  const user = await context.register();
  assert.equal((await context.call("GET", "/wallet", { user, envOverride: env })).status, 200);
  assert.equal((await context.call("GET", "/wallet", { user, envOverride: env })).status, 200);
  assert.equal((await context.call("GET", "/wallet", { user, envOverride: env })).status, 429);
  // The pages and the clock are not limited.
  assert.equal((await context.call("GET", "/time", { envOverride: env })).status, 200);
  assert.equal((await context.call("GET", "/privacy", { envOverride: env })).status, 200);

  for (let i = 0; i < 20; i += 1) await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "under16" } });
  assert.equal((await context.call("POST", "/profile/age-group", { user, body: { ageGroup: "under16" } })).status, 429);
});

test("an anonymous account is taken back on a new device with Apple's signed proof of its purchase, and only then", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const env = withRoot(root);
  const alice = await context.register();
  const bob = await context.register();
  assert.equal((await purchase(context, root, alice, PASS, "tx-pass-1")).status, 200);
  const purchaseDate = Date.now() - 5000;
  const proof = (token, id, extra = {}) => signedTransaction(root, { productId: PASS, transactionId: id, originalTransactionId: "tx-pass-1", appAccountToken: token, purchaseDate, ...extra });
  const issued = await context.call("POST", "/account/transfer-code", { user: alice });
  assert.equal(issued.status, 200);
  const transferCode = issued.data.code;
  assert.notEqual(context.database.prepare("SELECT code_hash FROM account_transfer_codes WHERE user_id = ?").get(alice).code_hash, transferCode);
  const newSecret = 'n'.repeat(43);
  let recoveryCalls = 0;
  const recover = async (jws, ip = "203.0.113." + (++recoveryCalls), extra = {}) => context.call("POST", "/auth/recover-purchase", { body: { signedTransactionInfo: jws, transferCode, newSecret, ...extra }, envOverride: env, ip });
  assert.equal((await recover(await proof(alice, "tx-copy"), undefined, { transferCode: undefined })).status, 400);
  assert.equal((await recover(await proof(alice, "tx-copy"), undefined, { transferCode: alice + '.' + 'x'.repeat(43) })).status, 409);

  // the renewal (a new transaction id of the same subscription) proves the purchase; the new key works and the old one does not
  const old = context.credentials.get(alice);
  const reply = await recover(await proof(alice, "tx-pass-2"));
  assert.equal(reply.status, 200);
  assert.equal(reply.data.userId, alice);
  assert.notEqual(reply.data.secret, old.split(".").slice(1).join("."));
  context.credentials.set(alice, old);
  assert.equal((await context.call("GET", "/wallet", { user: alice })).status, 401);
  context.credentials.set(alice, `${alice}.${reply.data.secret}`);
  assert.equal((await context.call("GET", "/wallet", { user: alice })).status, 200);
  assert.equal((await context.call("GET", "/wallet", { user: alice, envOverride: env })).status, 200);

  // a proof for a purchase the account never made, someone else's token, a tampered signature, and a refunded purchase get nothing
  assert.equal((await recover(await proof(bob, "tx-pass-3"))).status, 404);
  assert.equal((await recover(await proof(alice, "tx-x", { originalTransactionId: "never-seen" }))).status, 404);
  assert.equal((await recover((await proof(alice, "tx-pass-4")).slice(0, -4) + "AAAA")).status, 400);
  assert.equal((await recover(await proof(alice, "tx-pass-5", { revocationDate: Date.now() }))).status, 403);

  // expired, repeated and older proofs cannot rotate the key again
  assert.equal((await recover(await proof(alice, "tx-old", { expiresDate: Date.now() - 1000 }))).status, 403);
  const again = await proof(alice, "tx-pass-7", { purchaseDate: purchaseDate + 1000 });
  assert.equal((await recover(again)).status, 200);
  const hash = await context.store.credentialHash(alice);
  assert.equal((await recover(again)).status, 200); // identical retry after a lost answer
  assert.equal((await recover(again, "198.51.100.8", { newSecret: "attacker".repeat(8) })).status, 409);
  assert.equal(await context.store.credentialHash(alice), hash);
  assert.equal((await recover(await proof(alice, "tx-older"), undefined, { newSecret: "different".repeat(8) })).status, 409);

  // an account linked to Apple is taken over by signing in with Apple, not by a purchase
  context.database.prepare("INSERT INTO apple_links (user_id, apple_sub, linked_at) VALUES (?, ?, ?)").run(alice, "apple-sub-1", new Date().toISOString());
  assert.equal((await recover(await proof(alice, "tx-pass-6"))).status, 409);
});


test("transfer code migration, expiry, replacement, retries and rollback protect account keys", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE users (id TEXT PRIMARY KEY, secret_hash TEXT NOT NULL, created_at TEXT NOT NULL); INSERT INTO users VALUES ('a', 'old', '2026-10-30');");
  database.exec(readFileSync(new URL("../migrations/0004_account_transfer_codes.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.issueTransferCode('a', 'code', 200, 'old');
  assert.equal(await store.redeemTransferCode('a', 'wrong', 'new', 100), false);
  assert.equal(await store.redeemTransferCode('a', 'code', 'new', 200), false);
  assert.equal(await store.credentialHash('a'), 'old');
  database.exec("CREATE TRIGGER fail_rotation BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
  await assert.rejects(store.redeemTransferCode('a', 'code', 'new', 100));
  assert.equal(database.prepare("SELECT used_secret_hash FROM account_transfer_codes").get().used_secret_hash, null);
  database.exec("DROP TRIGGER fail_rotation");
  assert.equal(await store.redeemTransferCode('a', 'code', 'new', 100), true);
  assert.equal(await store.redeemTransferCode('a', 'code', 'new', 101), true);
  assert.equal(await store.redeemTransferCode('a', 'code', 'attacker', 101), false);
  assert.equal(await store.credentialHash('a'), 'new');
  await store.rotateSecret('a', 'apple-key');
  assert.equal(await store.redeemTransferCode('a', 'code', 'new', 102), false);
  assert.equal(await store.issueTransferCode('a', 'stale', 200, 'old'), false);
  await store.issueTransferCode('a', 'first', 200, 'apple-key');
  await store.issueTransferCode('a', 'second', 200, 'apple-key');
  assert.equal(await store.redeemTransferCode('a', 'first', 'new', 100), false);
  assert.equal(await store.redeemTransferCode('a', 'second', 'last', 100), true);
  database.close();
});

test("a transfer code alone recovers an account that only bought tickets, once, and the old key stops working", async () => {
  const context = createContext();
  const root = await selfSignedTestRoot();
  const alice = await context.register();
  const bob = await context.register();
  assert.equal((await purchase(context, root, alice, TICKET3, "tx-t-1")).status, 200);
  const issued = await context.call("POST", "/account/transfer-code", { user: alice });
  const code = issued.data.code;
  const newSecret = 'm'.repeat(43);
  let calls = 0;
  const recover = (extra = {}) => context.call("POST", "/auth/recover-with-code", { body: { transferCode: code, newSecret, ...extra }, ip: "198.51.100." + (++calls) });
  assert.equal((await recover({ transferCode: undefined })).status, 400);
  assert.equal((await recover({ newSecret: 'short' })).status, 400);
  assert.equal((await recover({ transferCode: 'nodot' })).status, 409);
  assert.equal((await recover({ transferCode: alice + '.' + 'x'.repeat(43) })).status, 409);
  assert.equal((await recover({ transferCode: bob + '.' + code.split('.')[1] })).status, 409);
  const old = context.credentials.get(alice);
  const reply = await recover();
  assert.equal(reply.status, 200);
  assert.equal(reply.data.userId, alice);
  context.credentials.set(alice, old);
  assert.equal((await context.call("GET", "/wallet", { user: alice })).status, 401);
  context.credentials.set(alice, `${alice}.${reply.data.secret}`);
  assert.equal((await context.call("GET", "/wallet", { user: alice })).data.tickets, 3);
  // a lost response can retry with the same new key, but a different key cannot reuse the code
  assert.equal((await recover()).status, 200);
  assert.equal((await recover({ newSecret: 'z'.repeat(43) })).status, 409);
});

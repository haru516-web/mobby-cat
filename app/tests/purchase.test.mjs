import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { buy, paidHere, settle, spendPaid } = await import('../src/services/account/purchase.ts');
const sku = 'com.mobbycat.app.matatabipass.monthly';
function mock({ existing = true, linked = false, tickets = 0, plan = 'none', incomplete = false, mismatch = true } = {}) {
  let adopted = false, recoveries = 0, finished = 0;
  const ok = data => ({ status: 200, data });
  const api = {
    account: async () => ({ userId: 'empty', secret: 'persisted-replacement' }),
    existing: async () => existing ? { userId: 'a', secret: 'a' } : null,
    authedIfAny: async () => mismatch && !adopted ? { status: 403, data: { error: 'app_account_token_mismatch' } } : ok({}),
    authed: async path => ok(path === '/wallet' ? { tickets, matatabi: 0 } : path === '/plan' ? { plan } : { appleLinked: linked }),
    raw: async () => { recoveries++; return ok({ userId: 'b', secret: 'persisted-replacement' }); },
    adopt: async () => { adopted = true; },
  };
  const store = { unfinished: async () => ({ items: [{ sku, jws: 'signed', finish: async () => { finished++; } }], incomplete }) };
  return { api, store, recoveries: () => recoveries, finished: () => finished };
}
test('automatic settlement never adopts another account, including a fresh device', async () => {
  for (const existing of [false, true]) {
    const m = mock({ existing });
    const outcome = await settle(m.store, m.api);
    assert.equal(outcome.recovered, false); assert.equal(m.recoveries(), 0); assert.equal(m.finished(), 0);
  }
});
test('explicit restoration adopts only an empty unlinked account', async () => {
  const m = mock();
  const result = await settle(m.store, m.api, { recover: true, transferCode: 'b.code' });
  assert.equal(result.recovered, true); assert.equal(result.credited, 1); assert.equal(m.finished(), 1);
  for (const options of [{ linked: true }, { tickets: 1 }, { plan: 'matatabi_pass' }]) {
    const blocked = mock(options);
    assert.equal((await settle(blocked.store, blocked.api, { recover: true, transferCode: 'b.code' })).recovered, false);
    assert.equal(blocked.recoveries(), 0);
  }
});
test('partial StoreKit results remain incomplete after verification', async () => {
  const m = mock({ mismatch: false, incomplete: true });
  const result = await settle(m.store, m.api);
  assert.equal(result.incomplete, true); assert.equal(result.credited, 1);
});
test('StoreKit failure and network failure are separate and do not finish purchases', async () => {
  const m = mock();
  assert.deepEqual(await settle({ unfinished: async () => { throw Error('store'); } }, m.api), { kind: 'store_error' });
  m.api.authedIfAny = async () => null;
  assert.deepEqual(await settle(m.store, m.api), { kind: 'offline' });
  assert.equal(m.finished(), 0);
});
test('a used recovery proof is reported without adopting or finishing it', async () => {
  const m = mock();
  m.api.raw = async () => ({ status: 409, data: { error: 'invalid_transfer_code' } });
  const result = await settle(m.store, m.api, { recover: true, transferCode: 'b.code' });
  assert.equal(result.proofUsed, true);
  assert.equal(result.recovered, false);
  assert.equal(m.finished(), 0);
});
test('manual recovery without an independent transfer code cannot rotate keys', async () => {
  const m = mock();
  const result = await settle(m.store, m.api, { recover: true });
  assert.equal(m.recoveries(), 0);
  assert.equal(result.recovered, false);
});
test('a lost recovery response retries the securely saved replacement key', async () => {
  const m = mock(); const sent = [];
  m.api.raw = async (_path, init) => {
    sent.push(init.body);
    return sent.length === 1 ? null : { status: 200, data: { userId: 'b', secret: init.body.newSecret } };
  };
  const options = { recover: true, transferCode: 'b.independent-code' };
  assert.equal((await settle(m.store, m.api, options)).kind, 'offline');
  assert.equal((await settle(m.store, m.api, options)).recovered, true);
  assert.equal(sent[0].newSecret, 'persisted-replacement');
  assert.deepEqual(sent[0], sent[1]);
});
test('failed secure persistence prevents recovery and adoption failure remains retryable', async () => {
  const m = mock();
  m.api.account = async () => { throw Error('secure storage full'); };
  const options = { recover: true, transferCode: 'b.code' };
  assert.deepEqual(await settle(m.store, m.api, options), { kind: 'offline' });
  assert.equal(m.recoveries(), 0);
  m.api.account = async () => ({ userId: 'empty', secret: 'persisted-replacement' });
  m.api.adopt = async () => { throw Error('secure storage full'); };
  assert.deepEqual(await settle(m.store, m.api, options), { kind: 'offline' });
  assert.equal(m.finished(), 0);
});
test('a transfer code recovers an account without any App Store purchase, even when the store cannot be read', async () => {
  const m = mock({ existing: false });
  const store = { unfinished: async () => { throw new Error('store down'); } };
  const result = await settle(store, m.api, { recover: true, transferCode: 'b.code' });
  assert.equal(result.kind, 'done');
  assert.equal(result.recovered, true);
  assert.equal(result.credited, 0);
  assert.equal(m.recoveries(), 1);
  const without = await settle(store, mock({ existing: false }).api, { recover: true });
  assert.equal(without.kind, 'store_error');
});
test('a transfer code does not replace an account that already holds items', async () => {
  const m = mock({ existing: true, tickets: 2 });
  const result = await settle({ unfinished: async () => ({ items: [], incomplete: false }) }, m.api, { recover: true, transferCode: 'b.code' });
  assert.equal(result.recovered, false);
  assert.equal(m.recoveries(), 0);
});

function moveMock(reply = { status: 200, data: { status: 'moved' } }, options = {}) {
  const m = mock(options);
  const calls = [];
  const authed = m.api.authed;
  m.api.authed = async (path, init) => { calls.push(path); return path === '/purchases/move-plan' ? reply : authed(path, init); };
  return { ...m, calls };
}
test('a restore without a code moves the running pass and rotates no key', async () => {
  for (const existing of [true, false]) {
    const m = moveMock(undefined, { existing });
    const result = await settle(m.store, m.api, { recover: true });
    assert.equal(result.planMoved, true); assert.equal(result.otherAccount, 0);
    assert.equal(m.recoveries(), 0); assert.equal(m.finished(), 1);
  }
});
test('automatic settlement and a mistyped code never move the pass', async () => {
  const quiet = moveMock();
  assert.equal((await settle(quiet.store, quiet.api)).planMoved, false);
  assert.equal(quiet.calls.includes('/purchases/move-plan'), false);
  const typed = moveMock();
  typed.api.raw = async () => ({ status: 409, data: { error: 'invalid_transfer_code' } });
  const result = await settle(typed.store, typed.api, { recover: true, transferCode: 'b.wrong' });
  assert.equal(result.proofUsed, true); assert.equal(result.planMoved, false);
  assert.equal(typed.calls.includes('/purchases/move-plan'), false);
});
test('a pass held by an Apple-linked account stays there and is reported', async () => {
  const m = moveMock({ status: 409, data: { error: 'apple_linked' } });
  const result = await settle(m.store, m.api, { recover: true });
  assert.equal(result.planMoved, false); assert.equal(result.otherAccount, 1); assert.equal(m.finished(), 0);
});
test('a code on a device whose account owns something is reported, not silently ignored', async () => {
  const m = mock({ tickets: 1 });
  const result = await settle(m.store, m.api, { recover: true, transferCode: 'b.code' });
  assert.equal(result.localBlocked, true); assert.equal(m.recoveries(), 0);
});
test('buying a pass Apple already holds for another account asks for a restore', async () => {
  const product = { sku };
  const limits = { ageGroup: 'adult', capYen: null, remainingYen: null, restricted: false };
  const api = (verify) => ({ account: async () => ({ userId: 'a', secret: 's' }), authed: async path => path === '/limits' ? { status: 200, data: limits } : verify });
  const store = { purchase: async () => ({ sku, jws: 'signed', finish: async () => { throw Error('must not finish'); } }) };
  assert.equal((await buy('pass', store, api({ status: 403, data: { error: 'app_account_token_mismatch' } }))).reason, 'already_subscribed');
  const refused = { purchase: async () => { throw Error('already_subscribed'); } };
  assert.equal((await buy('pass', refused, api(null))).reason, 'already_subscribed');
  assert.ok(product);
});
test('paidHere protects only a live anonymous account that owns something', async () => {
  const api = ({ existing = true, profile = { status: 200, data: { appleLinked: false } }, tickets = 0, matatabi = 0, plan = 'none' } = {}) => ({
    existing: async () => existing ? { userId: 'a', secret: 's' } : null,
    authedIfAny: async path => path === '/profile' ? profile : path === '/wallet' ? { status: 200, data: { tickets, matatabi } } : { status: 200, data: { plan } },
  });
  assert.equal(await paidHere(api({ existing: false })), null);
  assert.equal(await paidHere(api()), null);
  assert.equal(await paidHere(api({ profile: null })), 'offline');
  assert.equal(await paidHere(api({ profile: { status: 401, data: null }, tickets: 3 })), null);
  assert.equal(await paidHere(api({ profile: { status: 200, data: { appleLinked: true } }, tickets: 3 })), null);
  assert.deepEqual(await paidHere(api({ tickets: 3 })), { tickets: 3, matatabi: 0, pass: false });
  assert.deepEqual(await paidHere(api({ plan: 'matatabi_pass' })), { tickets: 0, matatabi: 0, pass: true });
});
test('a spend refused for a lost key is told apart from a lost connection', async () => {
  assert.deepEqual(await spendPaid({ authed: async () => ({ status: 401, data: null }) }, 'tickets', 1, 'id'), { kind: 'signed_out' });
  assert.deepEqual(await spendPaid({ authed: async () => null }, 'tickets', 1, 'id'), { kind: 'offline' });
});

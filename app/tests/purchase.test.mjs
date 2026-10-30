import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { settle } = await import('../src/services/account/purchase.ts');
const sku = 'com.mobbycat.app.matatabipass.monthly';
function mock({ existing = true, linked = false, tickets = 0, plan = 'none', incomplete = false, mismatch = true } = {}) {
  let adopted = false, recoveries = 0, finished = 0;
  const ok = data => ({ status: 200, data });
  const api = {
    existing: async () => existing ? { userId: 'a', secret: 'a' } : null,
    authedIfAny: async () => mismatch && !adopted ? { status: 403, data: { error: 'app_account_token_mismatch' } } : ok({}),
    authed: async path => ok(path === '/wallet' ? { tickets, matatabi: 0 } : path === '/plan' ? { plan } : { appleLinked: linked }),
    raw: async () => { recoveries++; return ok({ userId: 'b', secret: 'b' }); },
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
  const result = await settle(m.store, m.api, { recover: true });
  assert.equal(result.recovered, true); assert.equal(result.credited, 1); assert.equal(m.finished(), 1);
  for (const options of [{ linked: true }, { tickets: 1 }, { plan: 'matatabi_pass' }]) {
    const blocked = mock(options);
    assert.equal((await settle(blocked.store, blocked.api, { recover: true })).recovered, false);
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
  m.api.raw = async () => ({ status: 409, data: { error: 'purchase_proof_used' } });
  const result = await settle(m.store, m.api, { recover: true });
  assert.equal(result.proofUsed, true);
  assert.equal(result.recovered, false);
  assert.equal(m.finished(), 0);
});

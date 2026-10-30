import test from 'node:test';
import assert from 'node:assert/strict';
import { applySpend, runSpend, serializedWriter, spendBlocked } from '../src/core/spending.ts';

const record = { candidates: ['a', 'b', 'c', 'd'], reasons: { b: '雨' }, baseCount: 3, matatabiUsed: 0, freePick: 'a', extraPicks: [], opened: ['a', 'b', 'c'] };
const pending = (kind = 'extra') => ({ kind, day: '2026-10-30', ids: [kind === 'extra' ? 'b' : 'd'], id: 'unique-1', currency: kind === 'extra' ? 'tickets' : 'matatabi', fromPaid: 1, fromFree: 0, record: structuredClone(record) });
const state = () => ({ owned: {}, tickets: 0, matatabi: 0, days: {}, paid: { tickets: 1, matatabi: 1 } });
function harness(s = state()) {
  let current = s, disk = structuredClone(s), calls = 0, failAt = 0, writes = 0, offline = false;
  const debited = new Set();
  return {
    get: () => current, put: value => { current = value; }, disk: () => structuredClone(disk),
    fail: n => { failAt = n; writes = 0; }, offline: v => { offline = v; }, calls: () => calls, debited,
    save: async value => { if (++writes === failAt) throw Error('disk full'); disk = structuredClone(value); },
    spend: async (_c, _n, id) => { calls++; debited.add(id); return offline ? 'offline' : 'ok'; },
  };
}

test('a missing day is restored from the journal for both currencies', async () => {
  for (const kind of ['extra', 'matatabi']) {
    const h = harness(), p = pending(kind);
    assert.equal(await runSpend(p, h), true);
    assert.equal(h.get().pendingSpend, undefined);
    if (kind === 'extra') assert.equal(h.get().owned.b.count, 1);
    else { assert.equal(h.get().days[p.day].matatabiUsed, 1); assert.ok(h.get().days[p.day].opened.includes('d')); }
    assert.equal(h.debited.size, 1);
  }
});
test('failed journal persistence never calls the server and blocks replacement/reset/next spend', async () => {
  const h = harness(); h.fail(1);
  assert.equal(await runSpend(pending(), h), false);
  assert.equal(h.calls(), 0);
  assert.equal(spendBlocked(h.get(), false), true);
  assert.equal(spendBlocked(state(), true), true);
});
test('lost response and restart reuse the same id, including a zero paid balance', async () => {
  const h = harness(); h.offline(true);
  assert.equal(await runSpend(pending(), h), false);
  const restored = h.disk(); restored.paid.tickets = 0;
  const restart = harness(restored);
  assert.equal(await runSpend(restored.pendingSpend, restart), true);
  assert.equal(restart.get().owned.b.count, 1);
  assert.deepEqual([...h.debited], [...restart.debited]);
});
test('failed final save is retried without applying or debiting twice', async () => {
  const h = harness(); h.fail(2);
  assert.equal(await runSpend(pending(), h), false);
  assert.equal(h.get().pendingSpend.applied, true);
  assert.equal(h.get().owned.b.count, 1);
  h.fail(0);
  assert.equal(await runSpend(h.get().pendingSpend, h), true);
  assert.equal(h.get().owned.b.count, 1);
  assert.equal(h.calls(), 1);
});
test('restart before final save reconstructs the original day and credits exactly once', async () => {
  const h = harness(); h.fail(2); await runSpend(pending(), h);
  const restart = harness(h.disk());
  assert.equal(await runSpend(restart.get().pendingSpend, restart), true);
  assert.equal(restart.get().owned.b.count, 1);
});
test('legacy missing day compensates only the paid portion', () => {
  const p = { ...pending(), record: undefined, fromPaid: 2, fromFree: 1 };
  const s = { ...state(), tickets: 1 };
  assert.equal(applySpend(s, p).tickets, 3);
});
test('serialized writes preserve order after a slow write and a failure', async () => {
  const seen = []; let release;
  const gate = new Promise(r => { release = r; });
  const write = serializedWriter(async value => { if (value === 1) await gate; seen.push(value); if (value === 2) throw Error('fail'); });
  const first = write(1), second = write(2).catch(() => {}), third = write(3);
  await Promise.resolve(); assert.deepEqual(seen, []);
  release(); await Promise.all([first, second, third]);
  assert.deepEqual(seen, [1, 2, 3]);
});

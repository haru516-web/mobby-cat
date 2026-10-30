import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { toRecord, fromRecord } = await import('../src/services/account/cloudSave.ts');
const cat = 'british-shorthair';
const rec = { candidates: [cat], reasons: { [cat]: '誕生日' }, baseCount: 3, matatabiUsed: 0, extraPicks: [], opened: [] };
const state = { owned: { [cat]: { count: 1, firstDay: '2026-10-28', firstReason: '誕生日' } }, days: Object.fromEntries(['2020-01-01', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map(k => [k, rec])), birthday: { m: 10, d: 28 }, totalSteps: 20000, obs: {}, inbox: [{ day: '2026-10-30', text: 'private' }], inboxRead: 1, pendingSpend: { id: 'private' }, clockSkewMs: 0 };
test('cloud excludes sensitive text, birthday month/day, device signals and journal', () => {
  const text = toRecord(state, new Date(2026, 9, 30, 20));
  const saved = JSON.parse(text);
  assert.deepEqual(Object.keys(saved.days), ['2026-10-28', '2026-10-29', '2026-10-30']);
  assert.equal(saved.owned[cat].firstDay, '2026-01-01');
  assert.equal(saved.owned[cat].firstReason, '');
  for (const d of Object.values(saved.days)) assert.deepEqual(d.reasons, {});
  assert.deepEqual(saved.inbox, []);
  for (const field of ['birthday', 'totalSteps', 'obs', 'pendingSpend', 'clockSkewMs']) assert.equal(field in saved, false);
  assert.ok(fromRecord(text));
  assert.deepEqual(JSON.parse(toRecord(fromRecord(text), new Date(2026, 9, 30, 20))), saved);
});
test('an old or future day is never uploaded, even with fewer than three records', () => {
  const saved = JSON.parse(toRecord({ ...state, days: { '2020-01-01': rec, '2027-01-01': rec } }, new Date(2026, 9, 30, 19, 59)));
  assert.deepEqual(saved.days, {});
});
test('cloud rejects malformed JSON and repaired saves', () => {
  assert.equal(fromRecord('{'), null);
  assert.equal(fromRecord(JSON.stringify({ owned: {}, tickets: -1 })), null);
  assert.equal(fromRecord(JSON.stringify({ owned: null })), null);
});

test('fairness history stays on device while candidate records remain restorable', () => {
 const saved = JSON.parse(toRecord({ ...state, encounterMisses: { cat: 3 }, days: { '2026-10-30': { ...rec, eligible: [cat] } } }, new Date(2026, 9, 30, 20)));
 assert.equal('encounterMisses' in saved, false);
 assert.equal('eligible' in saved.days['2026-10-30'], false);
 assert.deepEqual(saved.days['2026-10-30'].candidates, [cat]);
 assert.ok(fromRecord(JSON.stringify(saved)));
});

import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { checkSaved } = await import('../src/core/saveShape.ts');
const { buildDay } = await import('../src/core/encounter.ts');
const { encounterDayKey, daysBetween } = await import('../src/core/dates.ts');

test('save shape repairs corrupt fields while preserving unknown owned cats', () => {
  const checked = checkSaved({ owned: { future: { count: 2, firstDay: '2026-10-30', firstReason: '' } }, tickets: -1, birthday: { m: 13, d: 1 }, days: { bad: null } });
  assert.equal(checked.repaired, true);
  assert.equal(checked.saved.owned.future.count, 2);
  assert.equal(checked.saved.tickets, undefined);
  assert.deepEqual(checked.saved.days, {});
  assert.equal(checkSaved({ owned: { cat: { count: 0 } } }), null);
});
test('save shape preserves a pending operation snapshot and applied marker', () => {
  const record = { candidates: ['british-shorthair'], reasons: {}, baseCount: 3, matatabiUsed: 0, extraPicks: [], opened: [] };
  const p = { kind: 'extra', day: '2026-10-30', ids: ['british-shorthair'], id: 'unique', currency: 'tickets', fromPaid: 1, fromFree: 0, record, applied: true };
  assert.deepEqual(checkSaved({ owned: {}, pendingSpend: p }).saved.pendingSpend, p);
});
test('encounter day changes exactly at local 20:00', () => {
  assert.equal(encounterDayKey(new Date(2026, 9, 30, 19, 59, 59)), '2026-10-29');
  assert.equal(encounterDayKey(new Date(2026, 9, 30, 20)), '2026-10-30');
  assert.equal(daysBetween('2026-10-29', '2026-10-30'), 1);
});
test('DST keeps the local 20:00 boundary across 23 and 25 hour days', () => {
  const url = new URL('../src/core/dates.ts', import.meta.url).href;
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { encounterDayKey, msUntilNextReveal, daysBetween } from ${JSON.stringify(url)};
    console.log(JSON.stringify([
      msUntilNextReveal(new Date(2026, 2, 7, 20)),
      msUntilNextReveal(new Date(2026, 9, 31, 20)),
      encounterDayKey(new Date(2026, 2, 8, 19, 59)),
      encounterDayKey(new Date(2026, 2, 8, 20)),
      daysBetween('2026-03-07', '2026-03-09')
    ]));`], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), [23 * 3600000, 25 * 3600000, '2026-03-07', '2026-03-08', 2]);
});
test('candidate generation uses the supplied day and signals, with no purchase or wall-clock randomness', () => {
  const signals = { battery: [1, 50], charging: true, steps: 20000, gapDays: 1, streak: 7, openHours: [6, 12, 20], catalogUpdated: false, birthday: { m: 10, d: 30 }, weather: 'rain', totals: { steps: 50000, photos: 10, pets: 10, openDays: 10, cats: 3 } };
  const ctx = { owned: {}, appearCounts: {} };
  const day = buildDay('2026-10-30', signals, ctx);
  assert.ok(day.candidates.length > 0 && day.candidates.length <= 6);
  assert.equal(new Set(day.candidates).size, day.candidates.length);
  assert.deepEqual(buildDay('2026-10-30', { ...signals }, { ...ctx, paid: { matatabi: 100 } }), day);
  const original = Math.random;
  try { Math.random = () => { throw Error('random at purchase'); }; assert.deepEqual(buildDay('2026-10-30', signals, ctx), day); }
  finally { Math.random = original; }
});

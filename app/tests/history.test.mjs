import test from 'node:test';
import assert from 'node:assert/strict';
import { retainDays, LOCAL_DAY_LIMIT } from '../src/core/history.ts';
test('a long history is bounded without changing owned cats or totals', () => {
  const days = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [String(i).padStart(4, '0'), { candidates: [] }]));
  const s = { days, owned: { a: { count: 100, firstDay: '0000' } }, totalSteps: 1000000, appearCounts: { a: 1000 } };
  const next = retainDays(s);
  assert.equal(Object.keys(next.days).length, LOCAL_DAY_LIMIT);
  assert.equal(next.owned, s.owned); assert.equal(next.totalSteps, s.totalSteps); assert.equal(next.appearCounts, s.appearCounts);
  assert.equal('0000' in s.days, true); assert.equal('0000' in next.days, false);
});
test('the pending spend day is retained outside the limit and pruned after completion', () => {
  const s = { days: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [String(i).padStart(4, '0'), {}])), pendingSpend: { day: '0000' } };
  const next = retainDays(s);
  assert.equal(Object.keys(next.days).length, LOCAL_DAY_LIMIT + 1);
  assert.ok(next.days['0000']);
  assert.equal(Object.keys(retainDays({ ...next, pendingSpend: undefined }).days).length, LOCAL_DAY_LIMIT);
});

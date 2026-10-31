import test from 'node:test';
import assert from 'node:assert/strict';
import { clearOverlays, overlayEntries, removeOverlay, setOverlay, subscribeOverlays, topOverlay } from '../src/ui/overlayStore.ts';
import { DAYS_IN, canRegisterBirthday, daysInMonth, isBirthdayOn, isValidBirthday } from '../src/core/birthday.ts';

test('popups stack in the order they were opened, and only the top one is the top', () => {
  clearOverlays();
  setOverlay('settings', 'S');
  setOverlay('category', 'C');
  setOverlay('confirm', 'X');
  assert.deepEqual(overlayEntries().map((e) => e.key), ['settings', 'category', 'confirm']);
  assert.equal(topOverlay().key, 'confirm');
});

test('updating a popup keeps its place; closing one leaves the others where they were', () => {
  clearOverlays();
  setOverlay('a', 1);
  setOverlay('b', 2);
  setOverlay('a', 3);
  assert.deepEqual(overlayEntries().map((e) => [e.key, e.node]), [['a', 3], ['b', 2]]);
  removeOverlay('a');
  assert.deepEqual(overlayEntries().map((e) => e.key), ['b']);
  setOverlay('a', 4);
  assert.equal(topOverlay().key, 'a', 'a popup opened again goes on top');
});

test('closing something that is not open does nothing, and an unchanged popup does not notify', () => {
  clearOverlays();
  let calls = 0;
  const off = subscribeOverlays(() => { calls += 1; });
  const close = () => {};
  setOverlay('a', 1, close);
  setOverlay('a', 1, close);
  removeOverlay('missing');
  assert.equal(calls, 1);
  const before = overlayEntries();
  removeOverlay('missing');
  assert.equal(overlayEntries(), before, 'the snapshot is stable until something changes');
  off();
});

test('closing a popup while another opens in the same moment leaves a clean stack', () => {
  clearOverlays();
  setOverlay('confirm', 'X');
  // the confirm closes and its action opens a notice popup straight away
  removeOverlay('confirm');
  setOverlay('notice', 'N');
  assert.deepEqual(overlayEntries().map((e) => e.key), ['notice']);
  removeOverlay('notice');
  assert.equal(overlayEntries().length, 0);
});

test('a birthday can be registered once, with a real date, and never changed', () => {
  assert.equal(DAYS_IN.length, 12);
  assert.equal(daysInMonth(2), 29);
  assert.equal(isValidBirthday({ m: 2, d: 29 }), true);
  for (const bad of [{ m: 2, d: 30 }, { m: 4, d: 31 }, { m: 0, d: 1 }, { m: 13, d: 1 }, { m: 1, d: 0 }, { m: 1.5, d: 1 }, { m: '1', d: 1 }, null]) assert.equal(isValidBirthday(bad), false);
  assert.equal(canRegisterBirthday(null, { m: 10, d: 30 }), true);
  assert.equal(canRegisterBirthday({ m: 1, d: 1 }, { m: 10, d: 30 }), false, 'a registered birthday is final');
  assert.equal(canRegisterBirthday(null, { m: 4, d: 31 }), false);
});

test('a birthday on 29 February is celebrated on 28 February in years without one', () => {
  const leap = { m: 2, d: 29 };
  assert.equal(isBirthdayOn(leap, 2028, 2, 29), true);
  assert.equal(isBirthdayOn(leap, 2028, 2, 28), false, 'in a leap year only the real day counts');
  for (const year of [2026, 2027, 2029, 2100]) {
    assert.equal(isBirthdayOn(leap, year, 2, 28), true, String(year));
    assert.equal(isBirthdayOn(leap, year, 3, 1), false, String(year));
  }
  assert.equal(isBirthdayOn(leap, 2000, 2, 29), true, '2000 is a leap year');
  assert.equal(isBirthdayOn({ m: 10, d: 30 }, 2026, 10, 30), true);
  assert.equal(isBirthdayOn({ m: 2, d: 28 }, 2026, 2, 28), true, 'a 28 February birthday is unaffected');
  assert.equal(isBirthdayOn(null, 2026, 2, 28), false);
});

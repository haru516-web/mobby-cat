import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustZoom, zoomValue } from '../src/features/camera/zoom.ts';
test('screen reader zoom increments, decrements and stays within camera range', () => {
  assert.equal(adjustZoom(0, 'increment'), 0.1);
  assert.equal(adjustZoom(0.1, 'decrement'), 0);
  assert.equal(adjustZoom(1, 'increment'), 1);
  assert.equal(adjustZoom(0, 'decrement'), 0);
  assert.equal(adjustZoom(0.5, 'activate'), 0.5);
  assert.equal(adjustZoom(0.55, 'increment'), 0.7);
});
test('zoom announcements describe the slider value without inventing an optical magnification', () => {
  assert.deepEqual(zoomValue(0), { min: 0, max: 100, now: 0, text: '等倍' });
  assert.equal(zoomValue(0.6).text, 'ズーム 60パーセント');
});

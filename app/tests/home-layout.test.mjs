import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutHome } from '../src/ui/homeLayout.ts';

// 猫ごとの広がり（足元から上・横。大きさに対する割合）：立ち姿は縦長、ごろごろ・寝る姿は横に広い
const EXTENT = { a: { up: 0.78, wide: 0.78 }, b: { up: 0.7, wide: 0.95 }, c: { up: 0.75, wide: 0.9 }, d: { up: 0.8, wide: 0.8 }, e: { up: 0.72, wide: 0.92 }, f: { up: 0.76, wide: 0.85 } };
const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
const extent = (id) => EXTENT[id];
const foot = () => 0.9;

// 猫の動きの途中でも届く範囲（足元から上・横）
const box = (p, id) => ({ l: p.left + p.size / 2 - (EXTENT[id].wide * p.size) / 2, r: p.left + p.size / 2 + (EXTENT[id].wide * p.size) / 2, t: p.foot - EXTENT[id].up * p.size, b: p.foot });
const overlap = (x, y) => x.l < y.r && y.l < x.r && x.t < y.b && y.t < x.b;

for (const [width, roomH, top] of [[393, 573, 0.4], [430, 640, 0.44], [360, 440, 0.4], [375, 520, 0.27], [440, 700, 0.42]]) {
  test(`cats never overlap in any pose, nearer cats are bigger (${width}x${roomH}, top ${top})`, () => {
    const placed = layoutHome(ids, width, roomH, top, extent, foot);
    for (let i = 0; i < ids.length; i++) {
      const bi = box(placed[i], ids[i]);
      assert.ok(bi.l >= -0.5 && bi.r <= width + 0.5, `cat ${i} stays inside the width`);
      assert.ok(bi.b <= roomH, `cat ${i} stays above the room bottom`);
      for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(bi, box(placed[j], ids[j])), `cats ${i} and ${j} do not overlap`);
    }
    // 画面の下にいる（足元が低い）猫ほど大きい
    for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) if (placed[i].foot > placed[j].foot + 1) assert.ok(placed[i].size >= placed[j].size - 0.01, `cat ${i} is nearer, so not smaller than ${j}`);
    // いちばん奥の猫の頭は、背景の奥の物（top）より上に出ない
    for (let i = 0; i < ids.length; i++) assert.ok(box(placed[i], ids[i]).t >= roomH * top - 0.5, `cat ${i} stays below the back of the room`);
  });
}

test('with fewer cats the remaining ones still do not overlap', () => {
  const some = ['a', null, 'c', null, 'e', 'f'];
  const placed = layoutHome(some, 393, 573, 0.4, extent, foot);
  const live = some.map((id, i) => (id ? box(placed[i], id) : null));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (live[i] && live[j]) assert.ok(!overlap(live[i], live[j]));
});

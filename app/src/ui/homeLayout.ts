// ホームの猫の配置。列には並べず、気ままにちらばって見えるようにする。
// 遠近：画面の下（手前）にいる猫ほど大きく、上（奥）ほど小さい。
// 重なり：猫ごとの、どの動き（ごろごろ・寝る・ひっくり返る…）の途中でも届く範囲を使って、手前の猫から順に置く。
// 置きたい場所がふさがっていたら、いちばん近い空きへずらす。だから、動いている最中も猫どうしは重ならない。
// 奥の猫は、背景の奥にいる人や像（top より上）に入り込まない。
// 画面に依存しない計算だけを置く（テストできるように）

export type Placed = { left: number; top: number; size: number; foot: number };
export type Extent = { up: number; wide: number }; // 足元から上・横に広がる大きさ（大きさに対する割合）

// スロット（0〜5）ごとの、置きたい場所のめやす。x：中心の横位置（幅に対する割合）、depth：0＝いちばん奥、1＝いちばん手前
// 0番は手前の大きい場所。猫ごとに少しずつ、決まった量だけずらして、同じ猫は同じあたりにいるようにする
const ANCHORS = [
  { x: 0.3, depth: 0.97 },
  { x: 0.76, depth: 0.74 },
  { x: 0.17, depth: 0.55 },
  { x: 0.55, depth: 0.5 },
  { x: 0.84, depth: 0.28 },
  { x: 0.4, depth: 0.12 },
];
const NEAR = 0.41; // いちばん手前の猫の大きさ（幅に対する割合）
const FAR = 0.18; // 地平（top）の高さにいる猫の大きさ
const GAP = 5;
const BOTTOM = 6;
const STEP = 8;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

type Box = { l: number; r: number; t: number; b: number };
const hit = (a: Box, b: Box) => a.l < b.r + GAP && b.l < a.r + GAP && a.t < b.b + GAP && b.t < a.b + GAP;

// top：背景の奥の物の下端。猫の頭はこれより上に出さない（部屋の高さに対する割合）
export function layoutHome(ids: (string | null)[], width: number, roomH: number, top: number, extentOf: (id: string) => Extent, footOf: (id: string) => number): Placed[] {
  const limit = roomH * top;
  const floor = roomH - BOTTOM; // 足元がいちばん手前にこられる高さ
  const out: Placed[] = ids.map(() => ({ left: 0, top: 0, size: 0, foot: 0 }));
  const sizeAt = (foot: number, k: number) => width * (FAR + (NEAR - FAR) * Math.max(0, Math.min(1, (foot - limit) / Math.max(1, floor - limit)))) * k;

  // 手前の猫から順に置く（手前の猫が先に場所をとる）
  const order = ids.map((_, i) => i).filter((i) => ids[i]).sort((a, b) => ANCHORS[b].depth - ANCHORS[a].depth);
  let k = 1; // 全体の縮み具合。置けない猫がいたら小さくして、やり直す
  for (let attempt = 0; attempt < 16; attempt++) {
    const placed: Box[] = [];
    let ok = true;
    for (const i of order) {
      const id = ids[i]!;
      const ext = extentOf(id);
      const a = ANCHORS[i];
      const wantX = width * Math.max(0.08, Math.min(0.92, a.x + (hash(id) - 0.5) * 0.14));
      const wantDepth = Math.max(0.04, Math.min(1, a.depth + (hash(id + '#') - 0.5) * 0.1));
      const wantFoot = limit + wantDepth * (floor - limit);
      // 置きたい場所から近い順に、空いている場所をさがす
      let best: { cx: number; foot: number; size: number; box: Box } | null = null;
      let bestCost = Infinity;
      for (let dy = -floor; dy <= floor; dy += STEP) {
        const foot = wantFoot + dy;
        if (foot > floor) continue;
        const size = sizeAt(foot, k);
        if (foot - ext.up * size < limit) continue; // 頭が奥の物に入る
        const half = (ext.wide * size) / 2;
        for (let dx = -width; dx <= width; dx += STEP) {
          const cx = wantX + dx;
          if (cx - half < 0 || cx + half > width) continue;
          const cost = dx * dx + dy * dy * 1.4;
          if (cost >= bestCost) continue;
          const box = { l: cx - half, r: cx + half, t: foot - ext.up * size, b: foot };
          if (placed.some((p) => hit(box, p))) continue;
          best = { cx, foot, size, box };
          bestCost = cost;
        }
      }
      if (!best) { ok = false; break; }
      placed.push(best.box);
      out[i] = { size: best.size, foot: best.foot, left: best.cx - best.size / 2, top: best.foot - best.size * footOf(id) };
    }
    if (ok) return out;
    k *= 0.93;
  }
  return out;
}

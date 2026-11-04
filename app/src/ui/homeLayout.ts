// ホームの猫の配置。遠近をつけて、画面の下（手前）ほど大きく、上（奥）ほど小さくする。
// 手前の列から順に、猫の頭の上に次の列の足元がくるように積むので、どの動き（ごろごろ・寝る・ひっくり返る…）の途中でも、
// 猫どうしは重ならない。奥の列は、背景の奥にいる人や像（top より上）に入り込まない。
// 画面に依存しない計算だけを置く（テストできるように）

export type Placed = { left: number; top: number; size: number; foot: number };
export type Extent = { up: number; wide: number }; // 足元から上・横に広がる大きさ（大きさに対する割合）

const ROWS: number[][] = [[0, 1], [2, 3], [4, 5]]; // 手前の列から。スロットの番号（0〜5）
const CENTERS = [[0.3, 0.72], [0.2, 0.58], [0.36, 0.78]]; // 列ごとの猫の中心の横位置（幅に対する割合）。列で少しずらして並べる
const NEAR = 0.41; // いちばん手前の猫の大きさ（幅に対する割合）
const FAR = 0.18; // 地平（top）の高さにいる猫の大きさ
const GAP = 4;
const BOTTOM = 6;

// top：背景の奥の物の下端。猫の頭はこれより上に出さない（部屋の高さに対する割合）
export function layoutHome(ids: (string | null)[], width: number, roomH: number, top: number, extentOf: (id: string) => Extent, footOf: (id: string) => number): Placed[] {
  const limit = roomH * top;
  const out: Placed[] = ids.map(() => ({ left: 0, top: 0, size: 0, foot: 0 }));
  let k = 1; // 全体の縮み具合。列が収まらなければ小さくして、やり直す
  for (let attempt = 0; attempt < 14; attempt++) {
    let foot = roomH - BOTTOM;
    let ok = true;
    for (let r = 0; r < ROWS.length; r++) {
      // 足元の高さに比例した大きさ（遠近）。手前ほど大きい
      const t = Math.max(0, Math.min(1, (foot - limit) / Math.max(1, roomH - limit)));
      const size = width * (FAR + (NEAR - FAR) * t) * k;
      let up = 0;
      const row = ROWS[r].filter((i) => ids[i]);
      for (const i of row) up = Math.max(up, extentOf(ids[i]!).up * size);
      // 横：左の猫から順に、中心をそろえて置く。重なるなら、右の猫を右へずらす
      let edge = 0;
      for (const [n, i] of row.entries()) {
        const id = ids[i]!;
        const w = extentOf(id).wide * size;
        let cx = width * CENTERS[r][ROWS[r].indexOf(i)];
        cx = Math.max(w / 2, Math.min(width - w / 2, cx));
        if (n > 0) cx = Math.max(cx, edge + GAP + w / 2);
        if (cx + w / 2 > width) ok = false;
        edge = cx + w / 2;
        out[i] = { size, foot, left: cx - size / 2, top: foot - size * footOf(id) };
      }
      foot -= up + GAP;
      if (r === ROWS.length - 1 && foot + GAP < limit) ok = false; // いちばん奥の猫の頭が、奥の物に入る
      if (!ok) break;
    }
    if (ok) return out;
    k *= 0.93;
  }
  return out;
}

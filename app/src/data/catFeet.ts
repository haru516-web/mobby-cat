import feet from './catFeet.json';

// ホームの猫の影の位置合わせと、猫どうしが重ならない配置のための、絵の位置の表。tools/build-cat-feet.mjs が素材から作る（JSON は編集しない）。
// [足元の下端の高さ, 足元の中心の横位置, 足元の幅, 頭の上端の高さ, 左端, 右端]：どれも、画像（または1コマ）に対する割合
export type Foot = readonly [number, number, number, number, number, number];
type Table = { still: Record<string, Foot>; roll: Record<string, Foot[]>; act: Record<string, Foot[]> };
const T = feet as unknown as Table;
const FALLBACK: Foot = [0.9, 0.5, 0.6, 0.1, 0.1, 0.9];

export const footStill = (id: string): Foot => T.still[id] ?? FALLBACK;
export const footRoll = (id: string, pose: number): Foot => T.roll[id]?.[pose] ?? footStill(id);
export const footAct = (id: string, kind: string, pose: number): Foot => T.act[`${id}-${kind}`]?.[pose] ?? footStill(id);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
// 動きの絵は、立ち姿より足元が上や下にずれて描かれていることがある。猫が宙に浮いたり沈んだりしないよう、
// 動きの間は、そのシートの足元の平均が立ち姿の足元に重なるようにずらす（高さの割合）
export const rollShift = (id: string): number => (T.roll[id] ? footStill(id)[0] - mean(T.roll[id].map((f) => f[0])) : 0);
export const actShift = (id: string, kind: string): number => {
  const sheet = T.act[`${id}-${kind}`];
  return sheet ? footStill(id)[0] - mean(sheet.map((f) => f[0])) : 0;
};

// 猫1匹が、立ち姿・ごろごろ・ほかの動きのどのコマでも、足元から上にどれだけ、横にどれだけ広がるか（大きさに対する割合）。
// 足元に合わせてずらした後の位置で測る。配置は、これで猫どうしが重ならないように決める
const extents = new Map<string, { up: number; wide: number }>();
export function extentOf(id: string): { up: number; wide: number } {
  const hit = extents.get(id);
  if (hit) return hit;
  let up = 0;
  let wide = 0;
  const see = (f: Foot) => {
    up = Math.max(up, f[0] - f[3]);
    wide = Math.max(wide, f[5] - f[4]);
  };
  see(footStill(id));
  T.roll[id]?.forEach(see);
  for (const k of Object.keys(T.act)) if (k.startsWith(`${id}-`)) T.act[k].forEach(see);
  const r = { up, wide };
  extents.set(id, r);
  return r;
}

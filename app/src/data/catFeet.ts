import feet from './catFeet.json';

// ホームの猫の影の位置合わせ・大きさ合わせ・重ならない配置のための、絵の位置の表。tools/build-cat-feet.mjs が素材から作る（JSON は編集しない）。
// [足元の下端の高さ, 足元の中心の横位置, 足元の幅, 頭の上端の高さ, 左端, 右端, 猫の面積]：どれも、画像（または1コマ）に対する割合
export type Foot = readonly [number, number, number, number, number, number, number];
type Table = { still: Record<string, Foot>; roll: Record<string, Foot[]>; act: Record<string, Foot[]> };
const T = feet as unknown as Table;
const FALLBACK: Foot = [0.9, 0.5, 0.6, 0.1, 0.1, 0.9, 0.45];

export const footStill = (id: string): Foot => T.still[id] ?? FALLBACK;
export const footRoll = (id: string, pose: number): Foot => T.roll[id]?.[pose] ?? footStill(id);
export const footAct = (id: string, kind: string, pose: number): Foot => T.act[`${id}-${kind}`]?.[pose] ?? footStill(id);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sheetOf = (id: string, kind: string): Foot[] | undefined => (kind === 'roll' ? T.roll[id] : T.act[`${id}-${kind}`]);

// 動きの絵（寝る・ごろごろ…）は、立ち姿より小さく（または大きく）描かれていることがある。
// 立ち姿と同じ大きさの猫に見えるよう、猫の面積がそろう倍率（長さの比）に近づける。
// 面積をそのまま合わせると、横になった猫は長さが伸びて大きく見えるので、補正は EASE 乗で控えめにする。極端にならないよう範囲も決めておく
const EASE = 0.75;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.7;

export type Fit = { scale: number; px: number; py: number; lift: number };
const fits = new Map<string, Fit>();
// 動きのシートを、立ち姿に合わせるための変形：足元（px, py＝シートの足元の平均）を中心に scale 倍に拡大・縮小して、
// 足元が立ち姿の足元の高さに乗るよう lift（高さの割合）だけずらす。猫が宙に浮いたり沈んだりしない。
export function fitOf(id: string, kind: string): Fit {
  const key = `${id}/${kind}`;
  const hit = fits.get(key);
  if (hit) return hit;
  const sheet = sheetOf(id, kind);
  let r: Fit = { scale: 1, px: 0.5, py: 0.9, lift: 0 };
  if (sheet) {
    const still = footStill(id);
    const area = mean(sheet.map((f) => f[6]));
    const scale = area > 0 && still[6] > 0 ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.sqrt(still[6] / area) ** EASE)) : 1;
    const py = mean(sheet.map((f) => f[0]));
    r = { scale, px: mean(sheet.map((f) => f[1])), py, lift: still[0] - py };
  }
  fits.set(key, r);
  return r;
}

// 猫1匹が、立ち姿・ごろごろ・ほかの動きのどのコマでも、足元から上にどれだけ、横にどれだけ広がるか（大きさに対する割合）。
// 立ち姿に合わせて拡大・縮小した後の大きさで測る。配置は、これで猫どうしが重ならないように決める
const extents = new Map<string, { up: number; wide: number }>();
export function extentOf(id: string): { up: number; wide: number } {
  const hit = extents.get(id);
  if (hit) return hit;
  const s = footStill(id);
  let up = s[0] - s[3];
  let wide = s[5] - s[4];
  const kinds = ['roll', ...Object.keys(T.act).filter((k) => k.startsWith(`${id}-`)).map((k) => k.slice(id.length + 1))];
  for (const kind of kinds) {
    const sheet = sheetOf(id, kind);
    if (!sheet) continue;
    const { scale } = fitOf(id, kind);
    for (const f of sheet) {
      up = Math.max(up, (f[0] - f[3]) * scale);
      wide = Math.max(wide, (f[5] - f[4]) * scale);
    }
  }
  const r = { up, wide };
  extents.set(id, r);
  return r;
}

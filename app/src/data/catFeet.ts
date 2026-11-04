import feet from './catFeet.json';

// ホームの猫の影を足元に合わせるための、足の位置の表。tools/build-cat-feet.mjs が素材から作る（編集しない）。
// [足元の下端の高さ, 足元の中心の横位置, 足元の幅]：どれも、画像（または1コマ）に対する割合
export type Foot = readonly [number, number, number];
type Table = { still: Record<string, Foot>; roll: Record<string, Foot[]>; act: Record<string, Foot[]> };
const T = feet as unknown as Table;
const FALLBACK: Foot = [0.9, 0.5, 0.6];

export const footStill = (id: string): Foot => T.still[id] ?? FALLBACK;
export const footRoll = (id: string, pose: number): Foot => T.roll[id]?.[pose] ?? footStill(id);
export const footAct = (id: string, kind: string, pose: number): Foot => T.act[`${id}-${kind}`]?.[pose] ?? footStill(id);

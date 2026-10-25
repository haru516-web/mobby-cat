import { CATS, Rarity } from '../data/catalog';
import { Ctx, Guaranteed, Signals, guaranteedCats } from './conditions';

export { REVEAL_HOUR, encounterDayKey, fmtDay, msUntilNextReveal, prevDayKey } from './dates';

const BASE_CANDIDATES = 3;
export const MAX_CANDIDATES = 6;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEIGHT: Record<Rarity, number> = { 1: 10, 2: 5, 3: 2, 4: 0.6 };
// 毎日の抽選に入るのは猫種と個性シリーズだけ。条件猫・世界の猫・旅猫は抽選に入らない
const POOL = CATS.filter((c) => c.kind === 'breed' || c.kind === 'series');

// 毎日の抽選・またたびで増える候補の、レア度ごとの出現確率（%）。ショップで購入前に表示する
export function rarityOdds(): { rarity: Rarity; count: number; pct: number }[] {
  const total = POOL.reduce((a, c) => a + WEIGHT[c.rarity], 0);
  return ([1, 2, 3, 4] as Rarity[])
    .map((r) => {
      const cats = POOL.filter((c) => c.rarity === r);
      return { rarity: r, count: cats.length, pct: (cats.reduce((a, c) => a + WEIGHT[c.rarity], 0) / total) * 100 };
    })
    .filter((o) => o.count > 0);
}

export type DayCandidates = { candidates: string[]; reasons: Record<string, string>; baseCount: number };

// 先頭 baseCount 匹が最初から見える候補。以降は「またたび」で順に増える。
// 条件を満たした猫は候補枠を超えても全員確定で出す（企画書 3.2 の推奨案）
export function buildDay(dayKey: string, signals: Signals, ctx: Ctx): DayCandidates {
  const ownedIds = Object.keys(ctx.owned);
  const rng = mulberry32(hash('mobby:' + dayKey + ':' + ownedIds.length));
  const g: Guaranteed[] = guaranteedCats(dayKey, signals, ctx);
  const reasons: Record<string, string> = {};
  const picked: string[] = [];
  for (const x of g) {
    picked.push(x.id);
    reasons[x.id] = x.reason;
  }
  const baseCount = Math.max(BASE_CANDIDATES, picked.length);
  const total = Math.max(MAX_CANDIDATES, picked.length);
  const pool = POOL.filter((c) => !picked.includes(c.id));
  while (picked.length < total && pool.length) {
    const w = pool.map((c) => WEIGHT[c.rarity] * (ownedIds.includes(c.id) ? 1 : 1.5));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= w[idx];
      if (r <= 0) break;
    }
    picked.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return { candidates: picked, reasons, baseCount };
}

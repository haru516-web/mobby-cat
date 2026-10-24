import { CATS, Rarity } from '../data/catalog';

export const REVEAL_HOUR = 20;
export const BASE_CANDIDATES = 3;
export const MAX_CANDIDATES = 6;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 20:00 (local) に切り替わる「出会いの日」のキー。20:00前は前日分。
export function encounterDayKey(now: Date): string {
  return fmtDay(new Date(now.getTime() - REVEAL_HOUR * 3600 * 1000));
}

export function prevDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return fmtDay(new Date(y, m - 1, d - 1));
}

export function msUntilNextReveal(now: Date): number {
  const next = new Date(now);
  next.setHours(REVEAL_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

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

type Guaranteed = { id: string; reason: string };

// 全ユーザー共通の出現条件（日付・曜日・所持数）。成立したら候補に確定で入る。
export function guaranteedCats(dayKey: string, ownedIds: string[]): Guaranteed[] {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const out: Guaranteed[] = [];
  if (dow === 5 && d === 13) out.push({ id: 'bombay', reason: '13日の金曜日' });
  if (m === 2 && d === 22) out.push({ id: 'japanese-bobtail', reason: '猫の日' });
  if (m === 2 && d === 29) out.push({ id: 'toyger', reason: 'うるう日' });
  if (m === 4 && d === 1) out.push({ id: 'manx', reason: 'エイプリルフール' });
  if (m === 7 && d === 7) out.push({ id: 'turkish-angora', reason: '七夕' });
  if (m === 12 && d === 25) out.push({ id: 'persian', reason: 'クリスマス' });
  if (m === 1 && d === 1) out.push({ id: 'turkish-van', reason: '元日' });
  if (d === 29) out.push({ id: 'snowshoe', reason: '肉球の日（毎月29日）' });
  if (dow === 5 && d !== 13) out.push({ id: 'ocicat', reason: '金曜日' });
  const n = ownedIds.length;
  const col = (min: number, id: string, reason: string) => {
    if (n >= min && !ownedIds.includes(id)) out.push({ id, reason });
  };
  col(10, 'maine-coon', '10種コレクター');
  col(20, 'siberian', '20種コレクター');
  col(30, 'egyptian-mau', '30種コレクター');
  // 同一IDの重複を除去
  return out.filter((g, i) => out.findIndex((o) => o.id === g.id) === i);
}

const WEIGHT: Record<Rarity, number> = { 1: 10, 2: 5, 3: 2, 4: 0.6 };

export type DayCandidates = { candidates: string[]; reasons: Record<string, string>; baseCount: number };

// 先頭 baseCount 匹が最初から見える候補。以降は「またたび」で順に増える。
export function buildDay(dayKey: string, ownedIds: string[]): DayCandidates {
  const rng = mulberry32(hash('mobby:' + dayKey + ':' + ownedIds.length));
  const g = guaranteedCats(dayKey, ownedIds);
  const reasons: Record<string, string> = {};
  const picked: string[] = [];
  for (const x of g) {
    picked.push(x.id);
    reasons[x.id] = x.reason;
  }
  const baseCount = Math.max(BASE_CANDIDATES, picked.length);
  const total = Math.max(MAX_CANDIDATES, picked.length);
  const pool = CATS.filter((c) => !picked.includes(c.id));
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
  // 条件猫を先頭に固定したうえで、通常枠の並びだけシャッフルしない（またたび順の再現性のため）
  return { candidates: picked, reasons, baseCount };
}

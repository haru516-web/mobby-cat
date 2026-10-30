import { type Ctx, type Guaranteed, type Signals, guaranteedCats } from './conditions';
import { CATS } from '../data/catalog';
import { recipeOf } from './recipes';

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

export type DayCandidates = { candidates: string[]; reasons: Record<string, string>; baseCount: number };

// baseCount 匹まで無料でひらける。以降は「またたび」でひらける数が増え、どの候補をひらくか選べる。
// 候補になるのは、その日に出会いの条件をすべて満たした猫だけ（条件を飛ばして迎える道を作らないため）。
// 7匹以上そろった日は、均等にシャッフルして MAX_CANDIDATES 匹だけ残す。1匹もそろわない日は候補が空になる
export function buildDay(dayKey: string, signals: Signals, ctx: Ctx): DayCandidates {
  const rng = mulberry32(hash('mobby:' + dayKey + ':' + Object.keys(ctx.owned).length));
  const g: Guaranteed[] = guaranteedCats(dayKey, signals, ctx);
  for (let i = g.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [g[i], g[j]] = [g[j], g[i]];
  }
  const reasons: Record<string, string> = {};
  const picked: string[] = [];
  for (const x of g.slice(0, MAX_CANDIDATES)) {
    picked.push(x.id);
    // 条件が複数あるときは、そのうち1つだけを均等な確率で見せる
    reasons[x.id] = x.parts?.length ? x.parts[Math.floor(rng() * x.parts.length)] : x.reason;
  }
  return { candidates: picked, reasons, baseCount: BASE_CANDIDATES };
}

// 以前の記録は、複数の条件を「・」でつないだ文のまま保存されている。読み込み時に1つだけへ直す（日と猫から決まるので毎回同じ）
export function singleReasons(days: Record<string, { reasons: Record<string, string> }>): void {
  for (const [day, rec] of Object.entries(days)) {
    for (const [id, reason] of Object.entries(rec.reasons ?? {})) {
      const cat = CATS.find((c) => c.id === id);
      const parts = cat && cat.kind === 'breed' ? recipeOf(cat)?.atoms.map((a) => a.label) : undefined;
      if (parts && parts.length > 1 && reason === parts.join('・')) rec.reasons[id] = parts[hash(`${day}:${id}`) % parts.length];
    }
  }
}

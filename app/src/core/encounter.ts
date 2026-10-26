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

export type DayCandidates = { candidates: string[]; reasons: Record<string, string>; baseCount: number };

// 先頭 baseCount 匹が最初から見える候補。以降は「またたび」で順に増える（最大 MAX_CANDIDATES 匹）。
// 候補になるのは、その日に出会いの条件をすべて満たした猫だけ（毎日の抽選はない。条件を飛ばして迎える道を作らないため）。
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
    reasons[x.id] = x.reason;
  }
  return { candidates: picked, reasons, baseCount: BASE_CANDIDATES };
}

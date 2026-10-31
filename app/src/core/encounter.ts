import { type Ctx, type Guaranteed, type Signals, guaranteedCats } from './conditions';
import { CATS } from '../data/catalog';
import { recipeOf, shownRarity } from './recipes';

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

// 条件を満たしたレア以上は6匹を超えても候補に残す。
export const isRareEncounter = (id: string) => {
  const c = CATS.find((cat) => cat.id === id);
  return !!c && (c.kind === 'world' || c.kind === 'travel' || shownRarity(c) >= 3);
};

export function selectCandidates(g: Guaranteed[], ctx: Ctx, rng: () => number): Guaranteed[] {
  const picked = g.filter((x) => isRareEncounter(x.id));
  const normal = g.filter((x) => !isRareEncounter(x.id));
  const draw = (pool: Guaranteed[]) => {
    const weight = (x: Guaranteed) => 1 + Math.min(20, ctx.encounterMisses?.[x.id] ?? 0) * 0.5;
    let roll = rng() * pool.reduce((n, x) => n + weight(x), 0);
    const chosen = pool.find((x) => (roll -= weight(x)) < 0) ?? pool[pool.length - 1];
    picked.push(chosen);
    normal.splice(normal.indexOf(chosen), 1);
  };
  if (picked.length < MAX_CANDIDATES) {
    const fresh = normal.filter((x) => !ctx.owned[x.id]?.count);
    if (fresh.length) draw(fresh);
  }
  while (picked.length < MAX_CANDIDATES && normal.length) draw(normal);
  // 位置からレア度が分からないよう、最後に混ぜる。
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

export function nextEncounterMisses(previous: Record<string, number>, eligible: string[], picked: string[]) {
  const next = { ...previous };
  for (const id of eligible) {
    if (picked.includes(id)) delete next[id];
    else next[id] = Math.min(20, (next[id] ?? 0) + 1);
  }
  return next;
}

export const hasRarePresence = (eligible: string[], opened: string[]) => eligible.some((id) => isRareEncounter(id) && !opened.includes(id));

export function encounterComposition(ids: string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const c = CATS.find((cat) => cat.id === id);
    if (!c) continue;
    const label = c.kind === 'world' || c.kind === 'travel' ? '世界' : shownRarity(c) >= 4 ? 'でんせつ' : shownRarity(c) >= 3 ? 'レア' : 'ノーマル';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return ['ノーマル', 'レア', 'でんせつ', '世界'].filter((k) => counts.has(k)).map((k) => k + counts.get(k) + '/' + ids.length).join('・') || 'なし';
}

export function buildDay(dayKey: string, signals: Signals, ctx: Ctx): DayCandidates & { eligible: string[]; encounterMisses: Record<string, number> } {
  const rng = mulberry32(hash('mobby:' + dayKey + ':' + Object.keys(ctx.owned).length));
  const g = guaranteedCats(dayKey, signals, ctx);
  const picked = selectCandidates(g, ctx, rng);
  const reasons: Record<string, string> = {};
  for (const x of picked) reasons[x.id] = x.parts?.length ? x.parts[Math.floor(rng() * x.parts.length)] : x.reason;
  const candidates = picked.map((x) => x.id);
  const eligible = g.map((x) => x.id);
  return { candidates, reasons, baseCount: BASE_CANDIDATES, eligible, encounterMisses: nextEncounterMisses(ctx.encounterMisses ?? {}, eligible, candidates) };
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

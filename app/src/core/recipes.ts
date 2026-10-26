// 猫ごとの出会いの条件（レシピ）。
// - 実在の猫（猫種・毛色）: 簡単な条件を2〜3個。重い猫種は、そのうち1つがやや難しい。
// - それ以外のモビー: 簡単な条件4個＋その猫らしい難しい条件1個（個性猫は conditions.ts の既存条件が「難しい1個」）。
// 条件は猫ごとに ID から決まる（端末や日によって変わらない）。レア度は条件の数と難しさから決める。
import { CATS, CatDef, Rarity } from '../data/catalog';

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow';

// 条件の判定に渡す、その日の材料
export type Env = {
  steps: number | null;
  battery: number[];
  charging: boolean;
  streak: number;
  openHours: number[];
  weather: Weather | null;
  kinds: number; // 暮らしている猫の種類数
  m: number;
  d: number;
  dow: number;
  holiday: boolean;
  fullMoon: boolean;
  newMoon: boolean;
};

type Group = 'steps' | 'weather' | 'week' | 'time' | 'battery' | 'streak' | 'owned' | 'season' | 'moon';
// p は、ふつうの人がその日にこの条件を満たす確率の目安（レア度の計算に使う）
export type Atom = { id: string; group: Group; hard: boolean; p: number; label: string; test: (e: Env) => boolean };

const stepsAtLeast = (n: number): Atom['test'] => (e) => e.steps != null && e.steps >= n;
const openIn = (from: number, to: number): Atom['test'] => (e) => e.openHours.some((h) => h >= from && h < to);

export const ATOMS: Atom[] = [
  // 簡単
  { id: 'steps100', group: 'steps', hard: false, p: 0.9, label: '歩数が100歩以上', test: stepsAtLeast(100) },
  { id: 'steps1000', group: 'steps', hard: false, p: 0.7, label: '歩数が1,000歩以上', test: stepsAtLeast(1000) },
  { id: 'steps3000', group: 'steps', hard: false, p: 0.5, label: '歩数が3,000歩以上', test: stepsAtLeast(3000) },
  { id: 'steps5000', group: 'steps', hard: false, p: 0.3, label: '歩数が5,000歩以上', test: stepsAtLeast(5000) },
  { id: 'sunny', group: 'weather', hard: false, p: 0.4, label: '天気が晴れ', test: (e) => e.weather === 'sunny' },
  { id: 'cloudy', group: 'weather', hard: false, p: 0.3, label: '天気がくもり', test: (e) => e.weather === 'cloudy' },
  { id: 'rain', group: 'weather', hard: false, p: 0.25, label: '天気が雨', test: (e) => e.weather === 'rain' },
  { id: 'weekday', group: 'week', hard: false, p: 0.65, label: '平日', test: (e) => !e.holiday && e.dow >= 1 && e.dow <= 5 },
  { id: 'weekend', group: 'week', hard: false, p: 0.29, label: '土日', test: (e) => e.dow === 0 || e.dow === 6 },
  { id: 'holiday', group: 'week', hard: false, p: 0.04, label: '祝日', test: (e) => e.holiday },
  { id: 'morning', group: 'time', hard: false, p: 0.4, label: '朝（5〜10時）に起動', test: openIn(5, 10) },
  { id: 'noon', group: 'time', hard: false, p: 0.5, label: '昼（10〜16時）に起動', test: openIn(10, 16) },
  { id: 'evening', group: 'time', hard: false, p: 0.4, label: '夕方（16〜19時）に起動', test: openIn(16, 19) },
  { id: 'battery-half', group: 'battery', hard: false, p: 0.6, label: 'バッテリーが50%以下になった', test: (e) => e.battery.some((v) => v <= 50) },
  { id: 'battery-high', group: 'battery', hard: false, p: 0.6, label: 'バッテリーが80%以上', test: (e) => e.battery.some((v) => v >= 80) },
  { id: 'charging', group: 'battery', hard: false, p: 0.5, label: '充電した', test: (e) => e.charging },
  { id: 'streak3', group: 'streak', hard: false, p: 0.5, label: '3日連続で起動', test: (e) => e.streak >= 3 },
  { id: 'owned10', group: 'owned', hard: false, p: 0.5, label: '10種類以上の猫と暮らしている', test: (e) => e.kinds >= 10 },
  { id: 'owned30', group: 'owned', hard: false, p: 0.3, label: '30種類以上の猫と暮らしている', test: (e) => e.kinds >= 30 },
  { id: 'spring', group: 'season', hard: false, p: 0.25, label: '春（3〜5月）', test: (e) => e.m >= 3 && e.m <= 5 },
  { id: 'summer', group: 'season', hard: false, p: 0.25, label: '夏（6〜8月）', test: (e) => e.m >= 6 && e.m <= 8 },
  { id: 'autumn', group: 'season', hard: false, p: 0.25, label: '秋（9〜11月）', test: (e) => e.m >= 9 && e.m <= 11 },
  { id: 'winter', group: 'season', hard: false, p: 0.25, label: '冬（12〜2月）', test: (e) => e.m === 12 || e.m <= 2 },
  // 難しい
  { id: 'steps8000', group: 'steps', hard: true, p: 0.1, label: '歩数が8,000歩以上', test: stepsAtLeast(8000) },
  { id: 'steps12000', group: 'steps', hard: true, p: 0.03, label: '歩数が12,000歩以上', test: stepsAtLeast(12000) },
  { id: 'streak14', group: 'streak', hard: true, p: 0.15, label: '14日連続で起動', test: (e) => e.streak >= 14 },
  { id: 'streak30', group: 'streak', hard: true, p: 0.06, label: '30日連続で起動', test: (e) => e.streak >= 30 },
  { id: 'owned50', group: 'owned', hard: true, p: 0.15, label: '50種類以上の猫と暮らしている', test: (e) => e.kinds >= 50 },
  { id: 'owned100', group: 'owned', hard: true, p: 0.05, label: '100種類以上の猫と暮らしている', test: (e) => e.kinds >= 100 },
  { id: 'battery-low', group: 'battery', hard: true, p: 0.1, label: 'バッテリーが10%以下になった', test: (e) => e.battery.some((v) => v <= 10) },
  { id: 'fullmoon', group: 'moon', hard: true, p: 0.035, label: '満月の夜', test: (e) => e.fullMoon },
  { id: 'newmoon', group: 'moon', hard: true, p: 0.035, label: '新月の夜', test: (e) => e.newMoon },
];
const ATOM_BY_ID: Record<string, Atom> = Object.fromEntries(ATOMS.map((a) => [a.id, a]));

// ---- 日本の祝日 -------------------------------------------------------------

const nthMonday = (y: number, m: number, n: number) => {
  const first = new Date(y, m - 1, 1).getDay();
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
};
const equinox = (y: number, spring: boolean) =>
  Math.floor((spring ? 20.8431 : 23.2488) + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));

function baseHolidays(y: number): Set<number> {
  const k = (m: number, d: number) => m * 100 + d;
  const s = new Set<number>([k(1, 1), k(2, 11), k(2, 23), k(4, 29), k(5, 3), k(5, 4), k(5, 5), k(8, 11), k(11, 3), k(11, 23)]);
  s.add(k(1, nthMonday(y, 1, 2)));
  s.add(k(7, nthMonday(y, 7, 3)));
  s.add(k(9, nthMonday(y, 9, 3)));
  s.add(k(10, nthMonday(y, 10, 2)));
  s.add(k(3, equinox(y, true)));
  s.add(k(9, equinox(y, false)));
  return s;
}

// 祝日（振替休日・国民の休日を含む）か。2020年以降の制度で計算する
export function isJapaneseHoliday(y: number, m: number, d: number): boolean {
  const base = baseHolidays(y);
  const k = m * 100 + d;
  if (base.has(k)) return true;
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  // 振替休日: 日曜の祝日の次の、祝日でない日
  if (dow !== 0) {
    let back = new Date(y, m - 1, d - 1);
    while (base.has((back.getMonth() + 1) * 100 + back.getDate())) {
      if (back.getDay() === 0) return true;
      back = new Date(back.getFullYear(), back.getMonth(), back.getDate() - 1);
    }
  }
  // 国民の休日: 前後が祝日にはさまれた平日
  const prev = new Date(y, m - 1, d - 1);
  const next = new Date(y, m - 1, d + 1);
  return dow !== 0 && base.has((prev.getMonth() + 1) * 100 + prev.getDate()) && base.has((next.getMonth() + 1) * 100 + next.getDate());
}

// ---- 猫ごとのレシピ -----------------------------------------------------------

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 実在の猫（猫種・毛色）。それ以外は個性のあるモビー
const NOT_REAL = new Set(['rea-mobby', 'uyu-mobby']);
export const isRealCat = (c: CatDef) => c.kind === 'breed' && !NOT_REAL.has(c.id);

// 判定の仕組みがまだなく、いまは出会えない猫
// 世界・旅猫は対象外。
export const NO_RECIPE = new Set(['shoku', 'ondo', 'amayadori', 'himitsu']);

// 既存の個性条件（conditions.ts）が使う材料。簡単な条件はこの系統を避ける（食い違いを防ぐ）
const SIGNATURE_GROUPS: Record<string, Group[]> = {
  genkai: ['battery'], denchigire: ['battery'], nyannyan: ['battery'], hanbun: ['battery'], mantan: ['battery'], juuden: ['battery'],
  kiseki: ['battery', 'steps'],
  nyanpo: ['steps'], chokotto: ['steps'], lucky: ['steps'], hodohodo: ['steps'], zorome: ['steps'], osanpo: ['steps'], tekuteku: ['steps'],
  mainichi: ['streak'], asa: ['time'], yuugure: ['time'], yofukashi: ['time'],
  noroware: ['week'], hanakin: ['week'], 'maboroshi-kuroneko': ['week', 'moon'],
  mangetsu: ['moon'], shingetsu: ['moon'], aotsuki: ['moon'], ousama: ['moon', 'owned'], yami: ['moon', 'owned'],
  sakura: ['season'], tsuyu: ['season'], halloween: ['season'], hiruyoru: ['season'], taiyou: ['season'],
  juunyan: ['owned'], tomodachizure: ['owned'], collector: ['owned'], shirokuro: ['owned'], bunshin: ['owned'], sanbiki: ['owned'], shitsukoi: ['owned'],
  bishonure: ['weather'], yukidaruma: ['weather', 'season'], hatsuyuki: ['weather', 'season'], hinata: ['weather'], mayonaka: ['weather', 'week', 'time'],
};
// 個性の条件が2つぶん以上の重さを持つ猫（レア度は「でんせつ」）
const LEGEND = new Set(['maboroshi-kuroneko', 'ousama', 'kiseki', 'pittari', 'aotsuki', 'shoku', 'kikan', 'uruu']);

export type Recipe = { atoms: Atom[]; signature: boolean; rarity: Rarity };

const pickAtoms = (id: string, easy: number, hard: number, skip: Group[], minP = 0): Atom[] => {
  const r = rng(hash(`recipe:${id}`));
  const taken = new Set<Group>(skip);
  const out: Atom[] = [];
  const draw = (pool: Atom[], n: number) => {
    const shuffled = [...pool].sort(() => r() - 0.5);
    for (const a of shuffled) {
      if (out.filter((o) => o.hard === a.hard).length >= n || taken.has(a.group)) continue;
      taken.add(a.group);
      out.push(a);
    }
  };
  draw(ATOMS.filter((a) => !a.hard && a.p >= minP), easy);
  draw(ATOMS.filter((a) => a.hard), hard);
  return out;
};

// ノーマル+以上では、歩数の条件は3,000歩以上にする（100歩・1,000歩はノーマルだけ）
const LOW_STEPS = new Set(['steps100', 'steps1000']);
const raiseSteps = (atoms: Atom[]): Atom[] => atoms.map((a) => (LOW_STEPS.has(a.id) ? ATOM_BY_ID.steps3000 : a));

// 実在の猫のレア度は、条件が同時にそろう確率で決める（春だけ・祝日だけのような、年に数日しか会えない猫がノーマルにならないように）
export function rarityFromChance(atoms: Atom[]): Rarity {
  const p = atoms.reduce((x, a) => x * a.p, 1);
  return p >= 0.15 ? 1 : p >= 0.06 ? 2 : 3; // 実在の猫は「でんせつ」にしない
}

// 条件の数と難しさからレア度を決める（個性のあるモビー）
export function rarityFromConditions(count: number, hard: number): Rarity {
  if (count <= 2) return 1;
  if (count === 3) return hard > 0 ? 3 : 2;
  if (count === 4) return 3;
  return hard >= 2 ? 4 : 3;
}

const cache = new Map<string, Recipe | null>();

export function recipeOf(c: CatDef): Recipe | null {
  const hit = cache.get(c.id);
  if (hit !== undefined) return hit;
  let rec: Recipe | null = null;
  const hasSignature = c.kind === 'condition'; // 条件猫には conditions.ts の個性条件がある
  if (c.kind === 'world' || c.kind === 'travel' || NO_RECIPE.has(c.id)) {
    rec = null;
  } else if (isRealCat(c)) {
    // 実在の猫: 簡単2〜3個。重い猫種（元のレア度3以上）は簡単2＋難しい1
    const heavy = c.rarity >= 3;
    const easy = heavy ? 2 : 2 + (hash(c.id) % 2);
    // 簡単な条件は、ふつうに生活していて半分近い日にそろうものだけ（祝日・所持数など、人によって差が大きいものは入れない）
    let atoms = pickAtoms(c.id, easy, heavy ? 1 : 0, ['owned'], 0.25);
    let rarity = rarityFromChance(atoms);
    if (rarity >= 2) {
      atoms = raiseSteps(atoms);
      rarity = Math.max(rarity, rarityFromChance(atoms)) as Rarity;
    }
    rec = { atoms, signature: false, rarity };
  } else {
    // 個性のあるモビー: 簡単4個＋難しい1個（個性条件がある猫はそれが難しい1個）
    const skip = SIGNATURE_GROUPS[c.id] ?? [];
    const atoms = raiseSteps(pickAtoms(c.id, 4, hasSignature ? 0 : 1, skip, 0.4));
    const hardCount = (hasSignature ? (LEGEND.has(c.id) ? 2 : 1) : 0) + atoms.filter((a) => a.hard).length;
    rec = { atoms, signature: hasSignature, rarity: rarityFromConditions(atoms.length + (hasSignature ? 1 : 0), hardCount) };
  }
  cache.set(c.id, rec);
  return rec;
}

export const evalAtoms = (atoms: Atom[], e: Env) => atoms.every((a) => a.test(e));
export const atomLabels = (atoms: Atom[]) => atoms.map((a) => a.label);
export { ATOM_BY_ID };

// カタログの rarity は生成時の仮の値。レシピができたら条件の数と難しさで上書きする（読み込み時に1回）
for (const c of CATS) {
  const rec = recipeOf(c);
  if (rec) c.rarity = rec.rarity;
}

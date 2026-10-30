import { CATS } from '../data/catalog';
import type { DayRecord, GameState, Notice, Owned } from './game';

/*
 * 保存された記録（端末の中のもの、クラウドから戻したもの）の形を確かめる（B-02）。
 * JSON として読めても、型の違う値（null の配列など）がそのまま入ると、図鑑や出会いの画面が動かなくなる。
 * 形の合わない項目は捨てて、はじめの値に戻す（どこを直したかは `repaired` で分かる）。
 * 知らない猫（新しい版のアプリで迎えた子）は、迎えた記録には残し、候補・ホーム・お気に入りからは外す。
 */

const KNOWN = new Set(CATS.map((c) => c.id));
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const strList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const numList = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNum);

function owned(v: unknown): Record<string, Owned> | null {
  if (!isObj(v)) return null;
  const out: Record<string, Owned> = {};
  for (const [id, o] of Object.entries(v)) {
    if (!isObj(o) || !isCount(o.count) || o.count < 1 || !isStr(o.firstDay) || !isStr(o.firstReason)) return null;
    out[id] = { count: o.count, firstDay: o.firstDay, firstReason: o.firstReason };
  }
  return out;
}

function day(v: unknown): DayRecord | null {
  if (!isObj(v) || !strList(v.candidates) || !isObj(v.reasons) || !isCount(v.baseCount) || !isCount(v.matatabiUsed) || !strList(v.extraPicks)) return null;
  if (v.freePick !== undefined && !isStr(v.freePick)) return null;
  if (v.passBonus !== undefined && !isCount(v.passBonus)) return null;
  if (v.opened !== undefined && !strList(v.opened)) return null;
  const reasons: Record<string, string> = {};
  for (const [id, r] of Object.entries(v.reasons)) if (isStr(r)) reasons[id] = r;
  // 知らない猫は候補から外す（見えている数が変わらないよう、外した分だけ baseCount も減らす）
  const known = v.candidates.filter((id) => KNOWN.has(id));
  const droppedVisible = v.candidates.slice(0, v.baseCount).filter((id) => !KNOWN.has(id)).length;
  return {
    candidates: known,
    reasons,
    baseCount: Math.max(0, v.baseCount - droppedVisible),
    matatabiUsed: v.matatabiUsed,
    extraPicks: v.extraPicks,
    ...(v.freePick !== undefined ? { freePick: v.freePick } : {}),
    ...(v.passBonus !== undefined ? { passBonus: v.passBonus } : {}),
    ...(v.opened !== undefined ? { opened: v.opened.filter((id) => KNOWN.has(id)) } : {}),
  };
}

type Checker = (v: unknown) => unknown | undefined; // 形が合わなければ undefined
const FIELDS: { [K in keyof GameState]?: Checker } = {
  tickets: (v) => (isCount(v) ? v : undefined),
  matatabi: (v) => (isCount(v) ? v : undefined),
  installDay: (v) => (isStr(v) ? v : undefined),
  installLock: (v) => (isBool(v) ? v : undefined),
  debugOffsetDays: (v) => (isNum(v) ? v : undefined),
  notifyEnabled: (v) => (isBool(v) ? v : undefined),
  favorites: (v) => (strList(v) ? v.filter((id) => KNOWN.has(id)) : undefined),
  obs: (v) => {
    if (!isObj(v)) return undefined;
    const out: GameState['obs'] = {};
    for (const [k, o] of Object.entries(v)) {
      if (isObj(o) && numList(o.battery) && isBool(o.charging) && numList(o.hours)) out[k] = { battery: o.battery, charging: o.charging, hours: o.hours };
    }
    return out;
  },
  lastOpenDay: (v) => (isStr(v) ? v : undefined),
  lastGap: (v) => (isCount(v) ? v : undefined),
  streak: (v) => (isCount(v) ? v : undefined),
  appearCounts: (v) => (isObj(v) && Object.values(v).every(isCount) ? v : undefined),
  catalogVersion: (v) => (isStr(v) ? v : undefined),
  birthday: (v) => (v === null ? null : isObj(v) && isCount(v.m) && isCount(v.d) && v.m >= 1 && v.m <= 12 && v.d >= 1 && v.d <= 31 ? { m: v.m, d: v.d } : undefined),
  starterChosen: (v) => (isBool(v) ? v : undefined),
  homeSlots: (v) => (v === null ? null : Array.isArray(v) && v.every((id) => id === null || isStr(id)) ? v.map((id) => (id && KNOWN.has(id) ? id : null)) : undefined),
  starterOffer: (v) => (strList(v) && v.every((id) => KNOWN.has(id)) ? v : undefined),
  starterRerolls: (v) => (isCount(v) ? v : undefined),
  tutorialDone: (v) => (isBool(v) ? v : undefined),
  petCount: (v) => (isCount(v) ? v : undefined),
  photoCount: (v) => (isCount(v) ? v : undefined),
  totalSteps: (v) => (isCount(v) ? v : undefined),
  openDays: (v) => (isCount(v) ? v : undefined),
  loginDays: (v) => (strList(v) ? v : undefined),
  inbox: (v) => (Array.isArray(v) && v.every((n) => isObj(n) && isStr(n.day) && isStr(n.text)) ? (v as Notice[]).map((n) => ({ day: n.day, text: n.text })) : undefined),
  inboxRead: (v) => (isCount(v) ? v : undefined),
  pass: (v) => (isObj(v) && isBool(v.active) && isStr(v.lastGrantMonth) ? { active: v.active, lastGrantMonth: v.lastGrantMonth, ...(isNum(v.until) ? { until: v.until } : {}) } : undefined),
  pendingSpend: (v) => (isObj(v) && (v.kind === 'extra' || v.kind === 'matatabi') && isStr(v.day) && strList(v.ids) && isStr(v.id) && (v.currency === 'tickets' || v.currency === 'matatabi') && isCount(v.fromPaid) && isCount(v.fromFree) ? { kind: v.kind, day: v.day, ids: v.ids, id: v.id, currency: v.currency, fromPaid: v.fromPaid, fromFree: v.fromFree } : undefined),
  spendSalt: (v) => (isStr(v) && v.length > 0 ? v : undefined),
  paid: (v) => (isObj(v) && isCount(v.tickets) && isCount(v.matatabi) ? { tickets: v.tickets, matatabi: v.matatabi } : undefined),
  clockSkewMs: (v) => (isNum(v) ? v : undefined),
};

/**
 * 記録の形を確かめる。迎えた猫（owned）が読めなければ null（記録として使えない）。
 * それ以外の項目は、形が合わなければ捨てる（呼び出し側が、はじめの値で埋める）。
 */
export function checkSaved(value: unknown): { saved: Partial<GameState>; repaired: boolean } | null {
  if (!isObj(value)) return null;
  const o = owned(value.owned);
  if (!o) return null;
  const saved: Partial<GameState> = { owned: o };
  let repaired = false;
  for (const [key, check] of Object.entries(FIELDS) as [keyof GameState, Checker][]) {
    if (!(key in value)) continue;
    const v = check(value[key]);
    if (v === undefined) repaired = true;
    else (saved as Record<string, unknown>)[key] = v;
  }
  if ('days' in value) {
    if (!isObj(value.days)) repaired = true;
    else {
      const days: Record<string, DayRecord> = {};
      for (const [k, d] of Object.entries(value.days)) {
        const r = day(d);
        if (r) days[k] = r;
        else repaired = true;
      }
      saved.days = days;
    }
  }
  return { saved, repaired };
}

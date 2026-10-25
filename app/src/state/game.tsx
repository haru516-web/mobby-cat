import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CATS } from '../data/catalog';
import { Signals } from '../lib/conditions';
import { daysBetween } from '../lib/dates';
import { buildDay, encounterDayKey, fmtDay, prevDayKey } from '../lib/encounter';
import { readBattery, readSteps } from '../lib/signals';

// アプリ更新で猫が増えたかの判定に使う（増えた最初の日に「しんいりモビー」が来る）
const CATALOG_VERSION = String(CATS.length);

// 出会いの日（encounterDayKey）ごとに、起動時に観測した端末の様子
type Obs = { battery: number[]; charging: boolean; hours: number[] };

export type Owned = { count: number; firstDay: string; firstReason: string };
export type DayRecord = {
  candidates: string[];
  reasons: Record<string, string>;
  baseCount: number;
  matatabiUsed: number;
  freePick?: string;
  extraPicks: string[];
};
export type GameState = {
  owned: Record<string, Owned>;
  tickets: number;
  matatabi: number;
  days: Record<string, DayRecord>;
  installDay: string;
  debugOffsetDays: number;
  notifyEnabled: boolean;
  favorites: string[];
  obs: Record<string, Obs>;
  lastOpenDay: string; // 最後に起動した暦日
  lastGap: number; // その起動が前回から何日空いていたか
  streak: number; // 連続起動日数
  appearCounts: Record<string, number>; // 候補に現れた回数
  catalogVersion: string;
  birthday: { m: number; d: number } | null;
};

const KEY = 'mobby-cat/state/v1';
const DAY_MS = 86400000;

function initial(now: Date): GameState {
  return {
    owned: {},
    tickets: 2,
    matatabi: 2,
    days: {},
    installDay: encounterDayKey(now),
    debugOffsetDays: 0,
    notifyEnabled: false,
    favorites: [],
    obs: {},
    lastOpenDay: '',
    lastGap: 0,
    streak: 0,
    appearCounts: {},
    catalogVersion: CATALOG_VERSION,
    birthday: null,
  };
}

const merge = (a?: Obs, b?: Obs): Obs => ({
  battery: [...(a?.battery ?? []), ...(b?.battery ?? [])],
  charging: !!(a?.charging || b?.charging),
  hours: [...(a?.hours ?? []), ...(b?.hours ?? [])],
});

function observe(s: GameState, key: string, hour: number, battery: { level: number; charging: boolean } | null): GameState {
  const o = s.obs[key] ?? { battery: [], charging: false, hours: [] };
  const next: Obs = {
    battery: battery && !o.battery.includes(battery.level) ? [...o.battery, battery.level] : o.battery,
    charging: o.charging || !!battery?.charging,
    hours: o.hours.includes(hour) ? o.hours : [...o.hours, hour],
  };
  // 3日より前の記録は捨てる
  const keep = prevDayKey(prevDayKey(key));
  const obs = Object.fromEntries(Object.entries({ ...s.obs, [key]: next }).filter(([k]) => k >= keep));
  return { ...s, obs };
}

export const visibleCount = (r: DayRecord) => Math.min(r.candidates.length, r.baseCount + r.matatabiUsed);

type Ctx = {
  ready: boolean;
  state: GameState;
  now: Date;
  todayKey: string;
  availableDays: string[]; // [今日, (救済期間中の)きのう]
  pickFree: (day: string, id: string) => void;
  pickExtra: (day: string, ids: string | string[]) => boolean;
  useMatatabi: (day: string) => boolean;
  grant: (what: 'ticket' | 'matatabi', n: number) => void;
  setNotify: (v: boolean) => void;
  setBirthday: (b: { m: number; d: number } | null) => void;
  toggleFavorite: (id: string) => void;
  shiftDays: (n: number) => void;
  reset: () => void;
};

const GameCtx = createContext<Ctx>(null as unknown as Ctx);
export const useGame = () => useContext(GameCtx);

function addCat(s: GameState, id: string, day: string, reason: string): GameState {
  const cur = s.owned[id];
  const owned = {
    ...s.owned,
    [id]: cur ? { ...cur, count: cur.count + 1 } : { count: 1, firstDay: day, firstReason: reason },
  };
  return { ...s, owned };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => initial(new Date()));
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setState({ ...initial(new Date()), ...JSON.parse(raw) });
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const now = useMemo(
    () => new Date(Date.now() + state.debugOffsetDays * DAY_MS),
    [state.debugOffsetDays, tick],
  );
  const todayKey = encounterDayKey(now);
  const yKey = prevDayKey(todayKey);
  const availableDays = useMemo(
    () => (yKey >= state.installDay ? [todayKey, yKey] : [todayKey]),
    [todayKey, yKey, state.installDay],
  );

  // 起動の記録（連続日数・空いた日数）と、起動時刻・電池の観測
  const calendarDay = fmtDay(now);
  const hour = now.getHours();
  useEffect(() => {
    if (!ready) return;
    setState((s) => {
      if (s.lastOpenDay === calendarDay) return s;
      const gap = s.lastOpenDay ? daysBetween(s.lastOpenDay, calendarDay) : 0;
      return { ...s, lastOpenDay: calendarDay, lastGap: gap, streak: gap === 1 ? s.streak + 1 : 1 };
    });
    let alive = true;
    readBattery().then((b) => alive && setState((s) => observe(s, todayKey, hour, b)));
    return () => {
      alive = false;
    };
  }, [ready, calendarDay, todayKey, hour]);

  // その日の候補を（未生成なら）確定させる。歩数・電池は非同期で読むので、生成中の日は記録しておく
  const building = useRef(new Set<string>());
  useEffect(() => {
    if (!ready) return;
    for (const k of availableDays) {
      if (stateRef.current.days[k] || building.current.has(k)) continue;
      building.current.add(k);
      (async () => {
        const [steps, battery] = await Promise.all([readSteps(k, now), readBattery()]);
        setState((s) => {
          if (s.days[k]) return s;
          // 観測の記録が候補の生成より遅れることがあるので、いまの電池と時刻もここで足す
          const o = merge(s.obs[prevDayKey(k)], s.obs[k]);
          if (battery && !o.battery.includes(battery.level)) o.battery.push(battery.level);
          if (k === todayKey && !o.hours.includes(hour)) o.hours.push(hour);
          const signals: Signals = {
            battery: o.battery,
            charging: o.charging || !!battery?.charging,
            steps,
            gapDays: s.lastGap,
            streak: s.streak,
            openHours: o.hours,
            catalogUpdated: s.catalogVersion !== CATALOG_VERSION,
            birthday: s.birthday,
          };
          const d = buildDay(k, signals, { owned: s.owned, appearCounts: s.appearCounts });
          const appearCounts = { ...s.appearCounts };
          for (const id of d.candidates.slice(0, d.baseCount)) appearCounts[id] = (appearCounts[id] ?? 0) + 1;
          return {
            ...s,
            appearCounts,
            catalogVersion: CATALOG_VERSION,
            days: { ...s.days, [k]: { ...d, matatabiUsed: 0, extraPicks: [] } },
          };
        });
        building.current.delete(k);
      })();
    }
  }, [ready, availableDays, now, todayKey, hour]);

  const pickFree = useCallback((day: string, id: string) => {
    setState((s) => {
      const r = s.days[day];
      if (!r || r.freePick || !r.candidates.slice(0, visibleCount(r)).includes(id)) return s;
      const next = addCat(s, id, day, r.reasons[id] ?? '');
      return { ...next, days: { ...next.days, [day]: { ...r, freePick: id } } };
    });
  }, []);

  // お迎え券で追加。複数指定時は全員分の券があるときだけまとめて迎える
  const pickExtra = useCallback((day: string, ids: string | string[]) => {
    const list = Array.isArray(ids) ? ids : [ids];
    const s = stateRef.current;
    const r = s.days[day];
    if (!r || !r.freePick || list.length === 0 || s.tickets < list.length) return false;
    const visible = r.candidates.slice(0, visibleCount(r));
    if (list.some((id) => r.freePick === id || r.extraPicks.includes(id) || !visible.includes(id))) return false;
    let next: GameState = { ...s, tickets: s.tickets - list.length };
    for (const id of list) next = addCat(next, id, day, r.reasons[id] ?? '');
    next = { ...next, days: { ...next.days, [day]: { ...r, extraPicks: [...r.extraPicks, ...list] } } };
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const useMatatabi = useCallback((day: string) => {
    const s = stateRef.current;
    const r = s.days[day];
    if (!r || r.freePick || s.matatabi < 1 || visibleCount(r) >= r.candidates.length) return false;
    setState({
      ...s,
      matatabi: s.matatabi - 1,
      days: { ...s.days, [day]: { ...r, matatabiUsed: r.matatabiUsed + 1 } },
    });
    return true;
  }, []);

  const grant = useCallback((what: 'ticket' | 'matatabi', n: number) => {
    setState((s) => (what === 'ticket' ? { ...s, tickets: s.tickets + n } : { ...s, matatabi: s.matatabi + n }));
  }, []);
  const setNotify = useCallback((v: boolean) => setState((s) => ({ ...s, notifyEnabled: v })), []);
  const setBirthday = useCallback((b: { m: number; d: number } | null) => setState((s) => ({ ...s, birthday: b })), []);
  const toggleFavorite = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
      })),
    [],
  );
  const shiftDays = useCallback((n: number) => setState((s) => ({ ...s, debugOffsetDays: s.debugOffsetDays + n })), []);
  const reset = useCallback(() => setState(initial(new Date())), []);

  const value: Ctx = {
    ready, state, now, todayKey, availableDays,
    pickFree, pickExtra, useMatatabi, grant, setNotify, setBirthday, toggleFavorite, shiftDays, reset,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

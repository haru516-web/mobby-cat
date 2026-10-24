import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildDay, encounterDayKey, prevDayKey } from '../lib/encounter';

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
  };
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

  // その日の候補を（未生成なら）確定させる
  useEffect(() => {
    if (!ready) return;
    setState((s) => {
      let next = s;
      for (const k of availableDays) {
        if (next.days[k]) continue;
        const d = buildDay(k, Object.keys(next.owned));
        next = { ...next, days: { ...next.days, [k]: { ...d, matatabiUsed: 0, extraPicks: [] } } };
      }
      return next;
    });
  }, [ready, availableDays]);

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
    pickFree, pickExtra, useMatatabi, grant, setNotify, toggleFavorite, shiftDays, reset,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

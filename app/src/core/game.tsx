import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CATS } from '../data/catalog';
import { Signals } from './conditions';
import { daysBetween } from './dates';
import { buildDay, encounterDayKey, fmtDay, prevDayKey } from './encounter';
import { readBattery, readSteps } from '../services/signals';

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
  passBonus?: number; // またたびパス加入中に増える候補数
};
export type Notice = { day: string; text: string };
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
  starterChosen: boolean; // 初回の相棒選びを終えたか
  tutorialDone: boolean; // 相棒選びのあとのチュートリアルを見終えた（スキップした）か
  petCount: number; // 猫をなでた回数
  inbox: Notice[]; // お知らせ（新しい順）
  inboxRead: number; // 既読にした時点のお知らせ件数
  pass: { active: boolean; lastGrantMonth: string }; // またたびパス（テスト）
};

// 初回に選べる相棒（色と毛並みがはっきり違う3匹）
export const STARTERS = ['british-shorthair', 'ragdoll', 'bengal'];
const PASS_BONUS = 3;
const PASS_TICKETS = 3;
const STREAK_GIFT_DAYS = 7;

const KEY = 'mobby-cat/state/v1';
const BACKUP_KEY = 'mobby-cat/state/v1.corrupt'; // 読み込めなかった記録の退避先
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
    starterChosen: false,
    tutorialDone: false,
    petCount: 0,
    inbox: [],
    inboxRead: 0,
    pass: { active: false, lastGrantMonth: '' },
  };
}

const INBOX_MAX = 50;
// お知らせを先頭に追加。未読数 = inbox.length - inboxRead になるよう、溢れた分は既読数からも引く
const notify = (s: GameState, day: string, text: string): GameState => {
  const inbox = [{ day, text }, ...s.inbox];
  const over = Math.max(0, inbox.length - INBOX_MAX);
  return { ...s, inbox: inbox.slice(0, INBOX_MAX), inboxRead: Math.max(0, s.inboxRead - over) };
};

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

export const visibleCount = (r: DayRecord) => Math.min(r.candidates.length, r.baseCount + r.matatabiUsed + (r.passBonus ?? 0));

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
  chooseStarter: (id: string) => void;
  finishTutorial: () => void;
  pet: () => void;
  markInboxRead: () => void;
  setPass: (v: boolean) => void;
  shiftDays: (n: number) => void;
  unlockAll: () => void;
  reset: () => void;
  corruptBackup: string | null; // 読み込めずに退避した記録（無ければ null）
  discardBackup: () => void;
  saveBlocked: boolean; // 保存領域を読めず、記録を守るために保存を止めている
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
  const [corruptBackup, setCorruptBackup] = useState<string | null>(null);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 読み込みに失敗したときは、初期状態で上書き保存しない（全データが消えるため）。
  // 壊れた記録は別のキーに退避してから始め直す。保存領域そのものが読めないときは保存を止める。
  useEffect(() => {
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(KEY);
      } catch {
        setSaveBlocked(true);
        setReady(true);
        return;
      }
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<GameState>;
          if (!saved || typeof saved !== 'object' || !saved.owned || typeof saved.owned !== 'object') throw new Error('shape');
          // 相棒選びの導入前から遊んでいた人には、選び直しを出さない
          const starterChosen = saved.starterChosen ?? Object.keys(saved.owned).length > 0;
          // チュートリアルの導入前から遊んでいた人には出さない
          const tutorialDone = saved.tutorialDone ?? starterChosen;
          setState({ ...initial(new Date()), ...saved, starterChosen, tutorialDone });
        } catch {
          try {
            await AsyncStorage.setItem(BACKUP_KEY, raw);
            setCorruptBackup(raw);
          } catch {
            setSaveBlocked(true); // 退避できないなら、壊れた記録を残すため保存しない
          }
        }
      } else {
        try {
          setCorruptBackup(await AsyncStorage.getItem(BACKUP_KEY));
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready || saveBlocked) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready, saveBlocked]);

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
      const streak = gap === 1 ? s.streak + 1 : 1;
      let next: GameState = { ...s, lastOpenDay: calendarDay, lastGap: gap, streak };
      // 7日続けて来てくれたらお迎え券を1枚。休んでも減るものはない
      if (streak % STREAK_GIFT_DAYS === 0) {
        next = notify({ ...next, tickets: next.tickets + 1 }, calendarDay, `${streak}日続けて会いに来てくれたお礼に、お迎え券を1枚どうぞ`);
      }
      if (gap >= 3) next = notify(next, calendarDay, `${gap}日ぶりですね。猫たちが待っていました`);
      // またたびパス：月が変わったらお迎え券を届ける
      const month = calendarDay.slice(0, 7);
      if (next.pass.active && next.pass.lastGrantMonth !== month) {
        next = notify(
          { ...next, tickets: next.tickets + PASS_TICKETS, pass: { ...next.pass, lastGrantMonth: month } },
          calendarDay,
          `またたびパスの特典で、お迎え券が${PASS_TICKETS}枚届きました`,
        );
      }
      return next;
    });
    let alive = true;
    readBattery().then((b) => alive && setState((s) => observe(s, todayKey, hour, b)));
    return () => {
      alive = false;
    };
  }, [ready, calendarDay, todayKey, hour]);

  // その日の候補を（未生成なら）確定させる。歩数・電池は非同期で読むので、生成中の日は記録しておく
  const building = useRef(new Set<string>());
  // 相棒を選ぶまでは作らない（所持猫の数で抽選が変わるのと、お知らせの順番を「ようこそ」が先になるようにするため）
  useEffect(() => {
    if (!ready || !state.starterChosen) return;
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
          let next: GameState = {
            ...s,
            appearCounts,
            catalogVersion: CATALOG_VERSION,
            days: { ...s.days, [k]: { ...d, matatabiUsed: 0, extraPicks: [], passBonus: s.pass.active ? PASS_BONUS : 0 } },
          };
          const special = [...new Set(Object.values(d.reasons))];
          if (special.length) next = notify(next, k, `「${special.join('」「')}」の条件がそろって、特別な猫が来ています`);
          return next;
        });
        building.current.delete(k);
      })();
    }
  }, [ready, state.starterChosen, availableDays, now, todayKey, hour]);

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
  const chooseStarter = useCallback(
    (id: string) =>
      setState((s) => {
        if (s.starterChosen) return s;
        const next = addCat({ ...s, starterChosen: true }, id, encounterDayKey(new Date(Date.now() + s.debugOffsetDays * DAY_MS)), '最初の相棒');
        return notify(next, next.owned[id].firstDay, 'ようこそ！毎日20時に、新しい猫モビーとの出会いが届きます');
      }),
    [],
  );
  const finishTutorial = useCallback(() => setState((s) => (s.tutorialDone ? s : { ...s, tutorialDone: true })), []);
  const markInboxRead = useCallback(() => setState((s) => (s.inboxRead === s.inbox.length ? s : { ...s, inboxRead: s.inbox.length })), []);
  const pet = useCallback(() => setState((s) => ({ ...s, petCount: s.petCount + 1 })), []);
  const setPass = useCallback((v: boolean) => setState((s) => ({ ...s, pass: { ...s.pass, active: v } })), []);
  const shiftDays = useCallback((n: number) => setState((s) => ({ ...s, debugOffsetDays: s.debugOffsetDays + n })), []);
  // 開発用: 全猫を図鑑に開放する
  const unlockAll = useCallback(
    () =>
      setState((s) => {
        const day = encounterDayKey(new Date(Date.now() + s.debugOffsetDays * DAY_MS));
        const owned = { ...s.owned };
        for (const c of CATS) if (!owned[c.id]) owned[c.id] = { count: 1, firstDay: day, firstReason: '開発用に開放' };
        return { ...s, starterChosen: true, owned };
      }),
    [],
  );
  const reset = useCallback(() => setState(initial(new Date())), []);
  const discardBackup = useCallback(() => {
    AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
    setCorruptBackup(null);
  }, []);

  const value: Ctx = {
    ready, state, now, todayKey, availableDays,
    pickFree, pickExtra, useMatatabi, grant, setNotify, setBirthday, toggleFavorite, chooseStarter, finishTutorial, pet, markInboxRead, setPass, shiftDays, unlockAll, reset,
    corruptBackup, discardBackup, saveBlocked,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

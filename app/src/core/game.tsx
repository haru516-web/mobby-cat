import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CATS } from '../data/catalog';
import { Signals } from './conditions';
import { daysBetween } from './dates';
import { MAX_CANDIDATES, buildDay, encounterDayKey, fmtDay, prevDayKey, singleReasons } from './encounter';
import { readBattery, readSteps } from '../services/signals';
import { readWeather } from '../services/weather';
import { readWorldStats } from '../services/world';
import { ensureDailyNotification } from '../services/notify';
import { notice } from '../services/dialog';
import { readServerClockOffset } from '../services/clock';
import { checkSaved } from './saveShape';
import { isRealCat } from './recipes';
import { worldGifts } from './world';

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
  // ひらいた（中身を見た）候補。ひらく前は、どの子も同じシルエット。ひらける数は openLimit。
  // 2026-10-30 より前の記録には無い（openedOf を参照）
  opened?: string[];
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
  homeSlots: (string | null)[] | null; // ホームに出す猫（1〜6番目。null のときは入手した順に6体まで）
  starterOffer: string[]; // 相棒選びで見せている3匹（アプリを閉じても同じ子を見せる）
  starterRerolls: number; // 相棒を引き直した回数（最大 STARTER_REROLLS）
  tutorialDone: boolean; // 相棒選びのあとのチュートリアルを見終えた（スキップした）か
  petCount: number; // 猫をなでた回数
  photoCount: number; // 撮った写真の枚数
  totalSteps: number; // 出会いの候補を作った日の歩数の合計
  openDays: number; // 起動した日数（延べ）
  loginDays: string[]; // 起動した暦日（ログイン記録のスタンプ。直近400日）
  inbox: Notice[]; // お知らせ（新しい順）
  inboxRead: number; // 既読にした時点のお知らせ件数
  pass: { active: boolean; lastGrantMonth: string; until?: number }; // またたびパス（active と until（いまの期間の終わり、ms）はサーバーの答えの写し。毎月のお迎え券もサーバーが届ける）
  pendingSpend?: PendingSpend; // 買った分を引く途中の操作（終わると消える。クラウドには預けない）
  spendSalt: string; // 買った分を使う操作の番号に混ぜる、この記録だけの値（記録を消すと変わる。クラウドから戻すと同じ）
  paid: { tickets: number; matatabi: number }; // 買った分の残高の写し（正しい値はサーバー。表示と、使う前の確認に使う。クラウドには預けない）
  clockSkewMs: number; // 端末の時計とサーバーの時計の差（端末の時刻を進めて先の日の猫に会えないよう、サーバーの時刻で日を決める。クラウドには預けない）
};

// 持っているお迎え券・またたび = 無料で得た分（端末内）+ 買った分（サーバーの残高の写し）
export const ticketsOf = (s: Pick<GameState, 'tickets' | 'paid'>) => s.tickets + (s.paid?.tickets ?? 0);
export const matatabiOf = (s: Pick<GameState, 'matatabi' | 'paid'>) => s.matatabi + (s.paid?.matatabi ?? 0);

/** 買った分をサーバーの残高から使う（account.tsx が渡す）。使えたら ok、残高が足りない・つながらないときは false。 */
// 買った分を使った結果。short＝残高が足りない（何も引かれていない）、offline＝分からない（引かれたかもしれない。同じ番号で、もう一度確かめられる）
export type SpendResult = 'ok' | 'short' | 'offline';
export type Spender = (currency: 'tickets' | 'matatabi', amount: number, requestId: string) => Promise<SpendResult>;
// 買った分を引く前に、端末へ書いておく操作。引けたのに、猫の追加を保存する前に落ちても、次の起動で同じ番号で確かめ、結果を確定する（A-04）
export type PendingSpend = { kind: 'extra' | 'matatabi'; day: string; ids: string[]; id: string; currency: 'tickets' | 'matatabi'; fromPaid: number; fromFree: number };
const newSalt = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
// 買った分を使う操作の番号。同じ操作（同じ日・同じ猫、同じ日の何個目のまたたび）なら同じ番号になる。
// 通信が切れて結果が分からないまま、もう一度同じ操作をすると、サーバーは二重に引かず「使えた」と答える（A-04）
// サーバーが受け付ける番号は128文字まで。猫をまとめて迎えると長くなるので、中身を短い値にする
const fnv = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
const spendId = (salt: string, what: string) => `use-${salt}-${fnv(what)}${fnv(`${what}:2`)}`;

// 初回の相棒は、実在の猫種から均等な確率で3種を引く。引き直しは最大3回（回数は端末に保存する）
export const STARTER_REROLLS = 3;
export function drawStarters(avoid: string[] = []): string[] {
  const pool = CATS.filter(isRealCat).map((c) => c.id);
  const fresh = pool.filter((id) => !avoid.includes(id)); // 直前に見た子は、できるだけ外す
  const from = fresh.length >= 3 ? fresh : pool;
  const out: string[] = [];
  while (out.length < 3) {
    const id = from[Math.floor(Math.random() * from.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
const PASS_BONUS = 3;
const STREAK_GIFT_DAYS = 7;

const KEY = 'mobby-cat/state/v1';
const BACKUP_KEY = 'mobby-cat/state/v1.corrupt'; // 読み込めなかった記録の退避先
const DAY_MS = 86400000;
// ゲームの中の「いま」：サーバーの時刻に合わせた時計（と、開発用の日付のずれ）
const clockNow = (s: Pick<GameState, 'clockSkewMs' | 'debugOffsetDays'>) => new Date(Date.now() + (s.clockSkewMs ?? 0) + s.debugOffsetDays * DAY_MS);

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
    homeSlots: null,
    starterOffer: [],
    starterRerolls: 0,
    tutorialDone: false,
    petCount: 0,
    photoCount: 0,
    totalSteps: 0,
    openDays: 0,
    loginDays: [],
    inbox: [],
    inboxRead: 0,
    pass: { active: false, lastGrantMonth: '' },
    spendSalt: newSalt(),
    paid: { tickets: 0, matatabi: 0 },
    clockSkewMs: 0,
  };
}

// 保存された記録（端末の中のものも、クラウドから戻したものも）を、いまの形に直す（形は checkSaved で確かめたもの）
export function normalizeSaved(saved: Partial<GameState>, now: Date = new Date()): GameState {
  // 相棒選びの導入前から遊んでいた人には、選び直しを出さない
  const starterChosen = saved.starterChosen ?? Object.keys(saved.owned ?? {}).length > 0;
  // チュートリアルの導入前から遊んでいた人には出さない
  const tutorialDone = saved.tutorialDone ?? starterChosen;
  if (saved.days) singleReasons(saved.days);
  return { ...initial(now), ...saved, starterChosen, tutorialDone, paid: saved.paid ?? initial(now).paid };
}

const INBOX_MAX = 50;
// お知らせを先頭に追加。未読数 = inbox.length - inboxRead になるよう、溢れた分は既読数からも引く
const notify = (s: GameState, day: string, text: string): GameState => {
  const inbox = [{ day, text }, ...s.inbox];
  const over = Math.max(0, inbox.length - INBOX_MAX);
  return { ...s, inbox: inbox.slice(0, INBOX_MAX), inboxRead: Math.max(0, s.inboxRead - over) };
};

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

// またたびパスの、いまの期間が終わったか（サーバーの時刻に合わせた時計で。開発用の日付のずれは含めない）
const passOver = (s: Pick<GameState, 'pass' | 'clockSkewMs'>) => !!s.pass.until && Date.now() + (s.clockSkewMs ?? 0) >= s.pass.until;

// その日にひらける数（ふだん3匹。またたび1個で+1、パスで+3。候補の数まで）
export const openLimit = (r: DayRecord) => Math.min(r.candidates.length, r.baseCount + r.matatabiUsed + (r.passBonus ?? 0));
/**
 * ひらいた候補（ひらいた順）。2026-10-30 より前の記録には opened が無い。
 * まだ何も迎えず、またたびも使っていない日は、シルエットから始める（どの子もまだひらいていない）。
 * 迎えた・またたびを使った日は、前と同じく、先頭から openLimit 匹をひらいたものとして読む（その状態で選んだため）。
 */
export const openedOf = (r: DayRecord) =>
  r.opened ?? (r.freePick || r.extraPicks.length || r.matatabiUsed ? r.candidates.slice(0, openLimit(r)) : []);
/** あと何匹、無料でひらけるか */
export const openLeft = (r: DayRecord) => Math.max(0, openLimit(r) - openedOf(r).length);

type Ctx = {
  ready: boolean;
  state: GameState;
  now: Date;
  todayKey: string;
  availableDays: string[]; // [今日, (救済期間中の)きのう]
  pickFree: (day: string, id: string) => void;
  pickExtra: (day: string, ids: string | string[]) => Promise<boolean>;
  /** 候補をまとめてひらく（無料。ひらける数の中で。ひらく子は、まだひらいていない候補だけ） */
  openCandidates: (day: string, ids: string[]) => boolean;
  /** またたびを1個使って、ひらける数を1つ増やし、その子をひらく */
  useMatatabi: (day: string, openId: string) => Promise<boolean>;
  grant: (what: 'ticket' | 'matatabi', n: number) => void; // 開発用
  setPaid: (wallet: { tickets: number; matatabi: number }) => void;
  registerSpender: (fn: Spender | null) => void;
  /** クラウドから戻した記録で、いまの記録を置き換える */
  replaceState: (saved: Partial<GameState>) => void;
  setNotify: (v: boolean) => void;
  setBirthday: (b: { m: number; d: number } | null) => void;
  toggleFavorite: (id: string) => void;
  chooseStarter: (id: string) => void;
  rerollStarter: () => void;
  setHomeSlots: (slots: (string | null)[] | null) => void;
  finishTutorial: () => void;
  pet: () => void;
  countPhoto: () => void;
  markInboxRead: () => void;
  /** サーバーの答え：加入中か、いまの期間がいつ終わるか（ms。分からなければ undefined） */
  setPass: (active: boolean, until?: number) => void;
  shiftDays: (n: number) => void;
  unlockAll: () => void;
  /** 開発用：今日の候補を、試験用の6匹で作り直す（ブラウザでは歩数・天気が取れず、候補が0匹になるため） */
  devFillToday: () => void;
  reset: () => void;
  corruptBackup: string | null; // 読み込めずに退避した記録（無ければ null）
  discardBackup: () => void;
  saveBlocked: boolean; // 保存領域を読めず、記録を守るために保存を止めている
  saveFailed: boolean; // 最後の保存に失敗した（空き容量の不足など。次の変更と30秒ごとに、保存し直す）
};

// ホームに出せる数。置き場所は HomeScreen の SLOTS と同じ並び（1番目が手前の大きい場所）
export const HOME_SLOTS = 6;
// いまホームに出す猫。自分で選んでいなければ、入手した順（owned の追加順）に6体まで。お気に入りは関係しない
export function homeSlotsOf(s: Pick<GameState, 'owned' | 'homeSlots'>): (string | null)[] {
  const auto = Object.keys(s.owned).filter((id) => CATS.some((c) => c.id === id)).slice(0, HOME_SLOTS); // 新しい版で迎えた、知らない猫は出さない
  const picked = s.homeSlots;
  const base = picked ? picked.map((id) => (id && s.owned[id] ? id : null)) : auto;
  return Array.from({ length: HOME_SLOTS }, (_, i) => base[i] ?? null);
}

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

// 買った分を引けたあとの、端末の中の変更（お迎え券で追加で迎える／またたびでひらく）。すでに反映済みの分は、二重にしない
function applyExtra(s: GameState, p: PendingSpend): GameState {
  const r = s.days[p.day];
  if (!r) return { ...s, pendingSpend: undefined };
  const ids = p.ids.filter((id) => !r.extraPicks.includes(id));
  let next: GameState = { ...s, tickets: Math.max(0, s.tickets - p.fromFree), pendingSpend: undefined };
  for (const id of ids) next = addCat(next, id, p.day, r.reasons[id] ?? '');
  return { ...next, days: { ...next.days, [p.day]: { ...r, extraPicks: [...r.extraPicks, ...ids] } } };
}
function applyMatatabi(s: GameState, p: PendingSpend): GameState {
  const r = s.days[p.day];
  if (!r) return { ...s, pendingSpend: undefined };
  const opened = openedOf(r);
  const open = opened.includes(p.ids[0]) ? opened : [...opened, p.ids[0]];
  return { ...s, matatabi: Math.max(0, s.matatabi - p.fromFree), pendingSpend: undefined, days: { ...s.days, [p.day]: { ...r, matatabiUsed: r.matatabiUsed + 1, opened: open } } };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => initial(new Date()));
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [corruptBackup, setCorruptBackup] = useState<string | null>(null);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 読み込みに失敗したときは、初期状態で上書き保存しない（全データが消えるため）。
  // 壊れた記録は別のキーに退避してから始め直す。形の一部だけが合わない記録は、直して使い、元の記録も退避しておく。
  // 保存領域そのものが読めないときは保存を止める。
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
        let checked: ReturnType<typeof checkSaved> = null;
        try {
          checked = checkSaved(JSON.parse(raw));
        } catch {}
        if (checked) setState(normalizeSaved(checked.saved));
        if (!checked || checked.repaired) {
          try {
            await AsyncStorage.setItem(BACKUP_KEY, raw);
          } catch {
            if (!checked) setSaveBlocked(true); // 退避できないなら、壊れた記録を残すため保存しない
          }
        }
      }
      // 退避した記録があるかは、毎回の起動で調べる（退避したあとの起動でも、設定に案内を出し続ける）
      try {
        setCorruptBackup(await AsyncStorage.getItem(BACKUP_KEY));
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // 保存に失敗したら、知らせる（1回だけ）。次の変更と、30秒ごとの時計で、保存し直す
  const failNoticeShown = useRef(false);
  const retryTick = saveFailed ? tick : 0;
  useEffect(() => {
    if (!ready || saveBlocked) return;
    AsyncStorage.setItem(KEY, JSON.stringify(stateRef.current))
      .then(() => setSaveFailed(false))
      .catch(() => {
        setSaveFailed(true);
        if (failNoticeShown.current) return;
        failNoticeShown.current = true;
        notice('記録を保存できませんでした', '端末の空き容量が足りないかもしれません。空きを作ると、自動で保存し直します。保存できるまでは、アプリを閉じると、いまの記録が失われることがあります。');
      });
  }, [state, ready, saveBlocked, retryTick]);

  // 日付は、サーバーの時刻に合わせた時計で決める（端末の時刻を進めても、先の日の猫には会えない）
  const { debugOffsetDays, clockSkewMs } = state;
  const now = useMemo(
    () => clockNow({ debugOffsetDays, clockSkewMs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick: 30秒ごとに時計を進める
    [debugOffsetDays, clockSkewMs, tick],
  );
  const todayKey = encounterDayKey(now);
  const yKey = prevDayKey(todayKey);
  // 入れた日の最初の出会い（その日の20時より前に入れた場合）は、20時までは作らない。1日の様子（歩数など）が出そろってから届ける
  const firstLocked = (s: GameState, k: string) => k === s.installDay && !s.days[k] && !!s.loginDays?.[0] && s.loginDays[0] !== s.installDay;
  const yHas = !!state.days[yKey];
  const availableDays = useMemo(
    () => (yKey > state.installDay || (yKey === state.installDay && yHas) ? [todayKey, yKey] : [todayKey]),
    [todayKey, yKey, state.installDay, yHas],
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
      let next: GameState = { ...s, lastOpenDay: calendarDay, lastGap: gap, streak, openDays: (s.openDays ?? 0) + 1, loginDays: [...(s.loginDays ?? []), calendarDay].slice(-400) };
      // 7日続けて来てくれたらお迎え券を1枚。休んでも減るものはない
      if (streak % STREAK_GIFT_DAYS === 0) {
        next = notify({ ...next, tickets: next.tickets + 1 }, calendarDay, `${streak}日続けて会いに来てくれたお礼に、お迎え券を1枚どうぞ`);
      }
      if (gap >= 3) next = notify(next, calendarDay, `${gap}日ぶりですね。猫たちが待っていました`);
      // またたびパスの毎月のお迎え券は、サーバーが購入の更新のたびに残高へ足す（ここでは足さない）
      return next;
    });
    let alive = true;
    readBattery().then((b) => alive && setState((s) => observe(s, todayKey, hour, b)));
    return () => {
      alive = false;
    };
  }, [ready, calendarDay, todayKey, hour]);

  // 通知をオンにしている記録なのに、この端末で予約が無いとき（機種変更で戻したあとなど）は、予約し直す
  useEffect(() => {
    if (ready && state.notifyEnabled) void ensureDailyNotification();
  }, [ready, state.notifyEnabled]);

  // 端末の時計のずれを、起動したときと、アプリに戻ってきたときに、サーバーの時刻で確かめる。
  // つながらないときは、前回のずれのまま（電波を切って時刻を進めた場合までは防げない）
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      void readServerClockOffset().then((offset) => {
        if (offset !== null) setState((s) => (s.clockSkewMs === offset ? s : { ...s, clockSkewMs: offset }));
      });
    };
    check();
    const sub = AppState.addEventListener('change', (next) => { if (next === 'active') check(); });
    return () => sub.remove();
  }, [ready]);

  // またたびパスの期間が終わったら、サーバーの答えを待たずに、加入していない扱いにする（つながらないときも、期限を守る）。
  // 更新されていれば、次にサーバーを確かめたときに戻る（account.tsx が、期限の時刻にも確かめる）
  const passEnded = !!state.pass.active && passOver(state);
  useEffect(() => {
    if (passEnded) setState((s) => (s.pass.active ? { ...s, pass: { ...s.pass, active: false } } : s));
  }, [passEnded]);

  // パスが切れている（期限・返金・クラウドから戻した記録）のに、記録の日に残っているパスの枠は、すでにひらいた分だけ残して取り除く。
  // 未使用の枠が、期限のあとも使えてしまわないように（ひらいた猫・使ったまたたびは、そのまま）
  const passDays = state.days;
  const passIdle = !state.pass.active || passEnded;
  useEffect(() => {
    if (!ready || !passIdle) return;
    setState((s) => {
      let changed = false;
      const days = Object.fromEntries(
        Object.entries(s.days).map(([k, d]) => {
          if (!d.passBonus) return [k, d];
          const used = Math.max(0, openedOf(d).length - d.baseCount - d.matatabiUsed);
          const bonus = Math.min(d.passBonus, used);
          if (bonus === d.passBonus) return [k, d];
          changed = true;
          return [k, { ...d, opened: openedOf(d), passBonus: bonus }];
        }),
      );
      return changed ? { ...s, days } : s;
    });
  }, [ready, passIdle, passDays]);

  // その日の候補を（未生成なら）確定させる。歩数・電池は非同期で読むので、生成中の日は記録しておく
  const building = useRef(new Set<string>());
  // 相棒を選ぶまでは作らない（所持猫の数で抽選が変わるのと、お知らせの順番を「ようこそ」が先になるようにするため）
  useEffect(() => {
    if (!ready || !state.starterChosen) return;
    for (const k of availableDays) {
      if (stateRef.current.days[k] || building.current.has(k) || firstLocked(stateRef.current, k)) continue;
      building.current.add(k);
      (async () => {
        const [steps, battery, wx] = await Promise.all([readSteps(k, now), readBattery(), readWeather(k, todayKey)]);
        setState((s) => {
          if (s.days[k]) return s;
          // 判定に使う「その日の様子」は、出会いの締め切り（20時）までの24時間（前日20時〜当日20時）の観測。
          // 歩数も同じ24時間（readSteps）。きょうの候補を作るときだけ、いまの電池と時刻も1回分として足す
          // （20時を過ぎて初めて開いた日にも、その日の様子が入るように）。きのうの分を遅れて作るときは、いまの値を足さない
          const w = s.obs[prevDayKey(k)];
          const o: Obs = { battery: [...(w?.battery ?? [])], charging: !!w?.charging, hours: [...(w?.hours ?? [])] };
          if (k === todayKey) {
            if (battery && !o.battery.includes(battery.level)) o.battery.push(battery.level);
            if (battery?.charging) o.charging = true;
            if (!o.hours.includes(hour)) o.hours.push(hour);
          }
          const signals: Signals = {
            battery: o.battery,
            charging: o.charging,
            steps,
            gapDays: s.lastGap,
            streak: s.streak,
            openHours: o.hours,
            catalogUpdated: s.catalogVersion !== CATALOG_VERSION,
            birthday: s.birthday,
            weather: wx?.weather ?? null,
            temp: wx?.temp ?? null,
            favorites: s.favorites,
            installDay: s.installDay,
            totals: {
              steps: (s.totalSteps ?? 0) + (steps ?? 0),
              photos: s.photoCount ?? 0,
              pets: s.petCount,
              openDays: s.openDays ?? 0,
              cats: Object.values(s.owned).reduce((n, o) => n + o.count, 0),
            },
          };
          const d = buildDay(k, signals, { owned: s.owned, appearCounts: s.appearCounts });
          const appearCounts = { ...s.appearCounts };
          for (const id of d.candidates.slice(0, d.baseCount)) appearCounts[id] = (appearCounts[id] ?? 0) + 1;
          let next: GameState = {
            ...s,
            totalSteps: (s.totalSteps ?? 0) + (steps ?? 0),
            appearCounts,
            catalogVersion: CATALOG_VERSION,
            days: { ...s.days, [k]: { ...d, matatabiUsed: 0, extraPicks: [], opened: [], passBonus: s.pass.active && !passOver(s) ? PASS_BONUS : 0 } },
          };
          // 実在の猫の簡単な条件は通知しない。個性のある猫（特別な猫）が来た日だけ知らせる
          const special = [...new Set(d.candidates.filter((id) => CATS.find((c) => c.id === id)?.kind !== 'breed').map((id) => d.reasons[id]))];
          if (special.length) next = notify(next, k, `「${special.join('」「')}」の条件がそろって、特別な猫が来ています`);
          return next;
        });
        building.current.delete(k);
      })();
    }
  }, [ready, state.starterChosen, availableDays, now, todayKey, hour]);

  // 世界みんなの記録で届く猫（国の数・旅猫の記録）。1日1回、静的JSONを読むだけ
  useEffect(() => {
    if (!ready || !state.starterChosen) return;
    let alive = true;
    readWorldStats().then((w) => {
      if (!alive || !w) return;
      setState((s) => {
        let next = s;
        for (const g of worldGifts(w, s.owned)) {
          next = notify(addCat(next, g.id, todayKey, g.reason), todayKey, `「${g.reason}」ので、世界の猫が届きました`);
        }
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [ready, state.starterChosen, todayKey]);

  const pickFree = useCallback((day: string, id: string) => {
    setState((s) => {
      const r = s.days[day];
      if (!r || r.freePick || !openedOf(r).includes(id)) return s;
      const next = addCat(s, id, day, r.reasons[id] ?? '');
      return { ...next, days: { ...next.days, [day]: { ...r, freePick: id } } };
    });
  }, []);

  // 買った分は、サーバーの残高から引く。引けたあとで、端末の中の記録を変える
  const spender = useRef<Spender | null>(null);
  const [spenderTick, setSpenderTick] = useState(0); // 買った分を引く窓口がつながったら、途中の操作を確かめ直す
  const registerSpender = useCallback((fn: Spender | null) => {
    spender.current = fn;
    if (fn) setSpenderTick((x) => x + 1);
  }, []);
  const spending = useRef(false); // 通信を待っているあいだは、次の操作を受け付けない（二重に使わないため）

  /**
   * お迎え券・またたびを n 個使う。まず端末内の無料分から、足りない分を買った分（サーバー）から。
   * 使えたら、無料分の引き算を済ませた状態を返す。使えなければ null（何も引かない）。
   */
  const spendCurrency = useCallback(
    async (currency: 'tickets' | 'matatabi', n: number, what: string, intent?: Pick<PendingSpend, 'kind' | 'day' | 'ids'>): Promise<number | null> => {
      const s = stateRef.current;
      const free = currency === 'tickets' ? s.tickets : s.matatabi;
      const fromFree = Math.min(free, n);
      const fromPaid = n - fromFree;
      if (fromPaid > 0) {
        if (fromPaid > (s.paid?.[currency] ?? 0) || !spender.current) return null;
        const id = spendId(s.spendSalt, what);
        // 引く前に、操作を端末へ書いておく。引けたあとで落ちても、次の起動で同じ番号で確かめて、猫の追加を確定できる
        if (intent) {
          stateRef.current = { ...s, pendingSpend: { ...intent, id, currency, fromPaid, fromFree } };
          setState(stateRef.current);
          await AsyncStorage.setItem(KEY, JSON.stringify(stateRef.current)).catch(() => {});
        }
        const result = await spender.current(currency, fromPaid, id);
        if (result === 'ok') return fromFree;
        // 足りない＝何も引かれていない。つながらない＝引かれたか分からないので、書いた操作を残して、あとで確かめる
        if (result === 'short') {
          stateRef.current = { ...stateRef.current, pendingSpend: undefined };
          setState(stateRef.current);
        }
        return null;
      }
      return fromFree;
    },
    [],
  );

  // お迎え券で追加。複数指定時は全員分の券があるときだけまとめて迎える
  const pickExtra = useCallback(async (day: string, ids: string | string[]) => {
    const list = Array.isArray(ids) ? ids : [ids];
    const check = (s: GameState) => {
      const r = s.days[day];
      if (!r || !r.freePick || list.length === 0 || ticketsOf(s) < list.length) return null;
      const visible = openedOf(r);
      if (list.some((id) => r.freePick === id || r.extraPicks.includes(id) || !visible.includes(id))) return null;
      return r;
    };
    if (spending.current || !check(stateRef.current)) return false;
    spending.current = true;
    try {
      const fromFree = await spendCurrency('tickets', list.length, `extra:${day}:${list.join(',')}`, { kind: 'extra', day, ids: list });
      if (fromFree === null) return false;
      // 買った分はすでに引かれているので、猫は必ず迎える（通信を待つあいだに記録が変わっていても、残りの分だけ反映する）
      if (!stateRef.current.days[day]) return false;
      const next = applyExtra(stateRef.current, { kind: 'extra', day, ids: list, id: '', currency: 'tickets', fromPaid: list.length - fromFree, fromFree });
      stateRef.current = next;
      setState(next);
      return true;
    } finally {
      spending.current = false;
    }
  }, [spendCurrency]);

  const openCandidates = useCallback((day: string, ids: string[]) => {
    const r = stateRef.current.days[day];
    const list = [...new Set(ids)];
    if (!r || list.length < 1 || list.length > openLeft(r) || list.some((id) => !r.candidates.includes(id) || openedOf(r).includes(id))) return false;
    const next: GameState = { ...stateRef.current, days: { ...stateRef.current.days, [day]: { ...r, opened: [...openedOf(r), ...list] } } };
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  // ひらける数を使い切ったあとだけ使える（無駄にしない）。無料のお迎えのあとは使えない（またたびは、迎える子を選ぶためのもの）
  const useMatatabi = useCallback(async (day: string, openId: string) => {
    const ok = (s: GameState) => {
      const r = s.days[day];
      return !!r && !r.freePick && matatabiOf(s) >= 1 && openLeft(r) === 0 && openLimit(r) < r.candidates.length && r.candidates.includes(openId) && !openedOf(r).includes(openId);
    };
    if (spending.current || !ok(stateRef.current)) return false;
    spending.current = true;
    try {
      const fromFree = await spendCurrency('matatabi', 1, `matatabi:${day}:${(stateRef.current.days[day]?.matatabiUsed ?? 0) + 1}`, { kind: 'matatabi', day, ids: [openId] });
      if (fromFree === null) return false;
      // 買った分はすでに引かれているので、ひらける数は必ず増やす
      if (!stateRef.current.days[day]) return false;
      const next = applyMatatabi(stateRef.current, { kind: 'matatabi', day, ids: [openId], id: '', currency: 'matatabi', fromPaid: 1 - fromFree, fromFree });
      stateRef.current = next;
      setState(next);
      return true;
    } finally {
      spending.current = false;
    }
  }, [spendCurrency]);

  // 引く途中で落ちた操作（pendingSpend）を、起動したとき・つながったときに、同じ番号で確かめて確定する。
  // 引けていれば、猫の追加（またはひらける数）を反映する。残高が足りなければ（引かれていない）、捨てる。つながらなければ、あとでもう一度
  useEffect(() => {
    const p = state.pendingSpend;
    if (!ready || !p || !spender.current || spending.current) return;
    spending.current = true;
    let alive = true;
    void spender.current(p.currency, p.fromPaid, p.id)
      .then((result) => {
        if (!alive || result === 'offline') return;
        const s = stateRef.current;
        if (s.pendingSpend?.id !== p.id) return;
        const next = result === 'ok' ? (p.kind === 'extra' ? applyExtra(s, p) : applyMatatabi(s, p)) : { ...s, pendingSpend: undefined };
        stateRef.current = next;
        setState(next);
      })
      .finally(() => {
        spending.current = false;
      });
    return () => {
      alive = false;
    };
  }, [ready, state.pendingSpend, spenderTick, tick]);

  // 開発用：無料で足す。製品の購入は、サーバーが検証してから残高に足す（account.tsx）
  const grant = useCallback((what: 'ticket' | 'matatabi', n: number) => {
    setState((s) => (what === 'ticket' ? { ...s, tickets: s.tickets + n } : { ...s, matatabi: s.matatabi + n }));
  }, []);
  const setPaid = useCallback((wallet: { tickets: number; matatabi: number }) => {
    setState((s) => (s.paid?.tickets === wallet.tickets && s.paid?.matatabi === wallet.matatabi ? s : { ...s, paid: { tickets: wallet.tickets, matatabi: wallet.matatabi } }));
  }, []);
  const replaceState = useCallback((saved: Partial<GameState>) => {
    // クラウドに預けない（端末の中だけの）情報は、この端末の値を残す
    setState((s) => ({ ...normalizeSaved(saved), debugOffsetDays: s.debugOffsetDays, paid: s.paid, pass: s.pass, birthday: s.birthday, totalSteps: s.totalSteps, obs: s.obs, clockSkewMs: s.clockSkewMs }));
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
  // 相棒選びの3匹を、まだ決まっていなければ引く（起動のたびに変わらないよう、引いた結果を保存する）
  useEffect(() => {
    if (!ready || saveBlocked) return;
    setState((s) => (s.starterChosen || s.starterOffer?.length === 3 ? s : { ...s, starterOffer: drawStarters() }));
  }, [ready, saveBlocked, state.starterChosen]);

  const rerollStarter = useCallback(() => {
    setState((s) =>
      s.starterChosen || (s.starterRerolls ?? 0) >= STARTER_REROLLS
        ? s
        : { ...s, starterOffer: drawStarters(s.starterOffer ?? []), starterRerolls: (s.starterRerolls ?? 0) + 1 },
    );
  }, []);

  const setHomeSlots = useCallback((slots: (string | null)[] | null) => setState((s) => ({ ...s, homeSlots: slots })), []);

  const chooseStarter = useCallback(
    (id: string) =>
      setState((s) => {
        if (s.starterChosen) return s;
        const next = addCat({ ...s, starterChosen: true }, id, encounterDayKey(clockNow(s)), '最初の相棒');
        return notify(next, next.owned[id].firstDay, 'ようこそ！毎日20時に、新しいにゃこモビーとの出会いが届きます');
      }),
    [],
  );
  const finishTutorial = useCallback(() => setState((s) => (s.tutorialDone ? s : { ...s, tutorialDone: true })), []);
  const markInboxRead = useCallback(() => setState((s) => (s.inboxRead === s.inbox.length ? s : { ...s, inboxRead: s.inbox.length })), []);
  const pet = useCallback(() => setState((s) => ({ ...s, petCount: s.petCount + 1 })), []);
  const countPhoto = useCallback(() => setState((s) => ({ ...s, photoCount: (s.photoCount ?? 0) + 1 })), []);
  // またたびパスの有無は、サーバーの答え。加入した日のうちから、候補が増える（まだ作っていない日は、作るときに反映される）
  const setPass = useCallback((v: boolean, until?: number) => {
    setState((s) => {
      if (s.pass.active === v && s.pass.until === until) return s;
      if (s.pass.active === v) return { ...s, pass: { ...s.pass, until } };
      const days = v
        ? Object.fromEntries(Object.entries(s.days).map(([k, d]) => [k, k >= prevDayKey(encounterDayKey(clockNow(s))) ? { ...d, passBonus: PASS_BONUS } : d]))
        : s.days;
      return { ...s, days, pass: { ...s.pass, active: v, until } };
    });
  }, []);
  const shiftDays = useCallback((n: number) => setState((s) => ({ ...s, debugOffsetDays: s.debugOffsetDays + n })), []);
  // 開発用: 全猫を図鑑に開放する
  const devFillToday = useCallback(
    () =>
      setState((s) => {
        const day = encounterDayKey(clockNow(s));
        const pool = CATS.filter(isRealCat).map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, MAX_CANDIDATES);
        const reasons = Object.fromEntries(pool.map((id) => [id, '開発用の試験']));
        const rec: DayRecord = { candidates: pool, reasons, baseCount: 3, matatabiUsed: 0, extraPicks: [], opened: [], passBonus: s.pass.active ? PASS_BONUS : 0 };
        return { ...s, days: { ...s.days, [day]: rec } };
      }),
    [],
  );
  const unlockAll = useCallback(
    () =>
      setState((s) => {
        const day = encounterDayKey(clockNow(s));
        const owned = { ...s.owned };
        for (const c of CATS) if (!owned[c.id]) owned[c.id] = { count: 1, firstDay: day, firstReason: '開発用に開放' };
        return { ...s, starterChosen: true, owned };
      }),
    [],
  );
  const reset = useCallback(() => setState((s) => ({ ...initial(new Date()), clockSkewMs: s.clockSkewMs })), []);
  const discardBackup = useCallback(() => {
    AsyncStorage.removeItem(BACKUP_KEY).catch(() => {});
    setCorruptBackup(null);
  }, []);

  const value: Ctx = {
    ready, state, now, todayKey, availableDays,
    pickFree, pickExtra, openCandidates, useMatatabi, grant, setPaid, registerSpender, replaceState, setNotify, setBirthday, toggleFavorite, chooseStarter, rerollStarter, setHomeSlots, finishTutorial, pet, countPhoto, markInboxRead, setPass, shiftDays, unlockAll, devFillToday, reset,
    corruptBackup, discardBackup, saveBlocked, saveFailed,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

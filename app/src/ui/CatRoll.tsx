import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { ActKind, CAT_ACT } from '../data/catAct';
import { CAT_ROLL } from '../data/catRoll';
import { useReduceMotion } from './base';

// ごろごろスプライトシート：4列×2行・8ポーズ。0→7→1 と往復して、14コマで1周（元動画と同じ並び）
const COLS = 4;
const ROWS = 2;
const POSES = COLS * ROWS;
const CYCLE = [...Array.from({ length: POSES }, (_, i) => i), ...Array.from({ length: POSES - 2 }, (_, i) => POSES - 2 - i)];
export const ROLL_STEP_MS = 300;
export const ROLL_CYCLE_MS = CYCLE.length * ROLL_STEP_MS;

export const hasRoll = (id: string) => !!CAT_ROLL[id];

export type CatAction = 'roll' | ActKind;

// どの動きが使えるか。ごろごろは全員、そのほかは素材のある猫だけ
// 動きごとの、コマ送りの間隔とコマの並び（寝るは2周ループ、ほかは8コマを1回）
const ACT_PLAY: Record<ActKind, { stepMs: number; cycle: number[] }> = {
  sleep: { stepMs: 420, cycle: Array.from({ length: 16 }, (_, i) => i % POSES) },
  peekaboo: { stepMs: 250, cycle: Array.from({ length: POSES }, (_, i) => i) }, // 約2.0秒
  fall: { stepMs: 234, cycle: Array.from({ length: POSES }, (_, i) => i) }, // 約1.9秒
  angry: { stepMs: 200, cycle: Array.from({ length: POSES }, (_, i) => i) }, // 約1.6秒
  cover: { stepMs: 250, cycle: Array.from({ length: POSES }, (_, i) => i) }, // 二足で構える→飛ぶ→肉球でレンズを覆う。約2.0秒
};

const COVER_CHANCE = 0.05; // 猫が動き出すたびに、肉球カバーを選ぶ確率
const COVER_COOLDOWN_MS = 120000; // 肉球カバーの次まで、最低でもこれだけあける

export const actionsOf = (id: string): CatAction[] => (hasRoll(id) ? ['roll', ...(Object.keys(CAT_ACT[id] ?? {}) as ActKind[])] : []);

// スプライトシートを cycle の順に1回だけ再生して onDone。onReady は最初のコマが描けたとき（それまでは静止画を残せるように）
function SheetSprite({ src, cycle, stepMs, size, onReady, onPose, onDone }: { src: number; cycle: number[]; stepMs: number; size: number; onReady?: () => void; onPose?: (pose: number) => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const cb = useRef({ onReady, onPose, onDone });
  useEffect(() => { cb.current = { onReady, onPose, onDone }; });
  useEffect(() => {
    if (!loaded) return;
    cb.current.onReady?.();
    cb.current.onPose?.(cycle[0]);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= cycle.length) {
        clearInterval(t);
        cb.current.onDone();
        return;
      }
      setStep(i);
      cb.current.onPose?.(cycle[i]);
    }, stepMs);
    return () => clearInterval(t);
  }, [loaded, cycle, stepMs]);
  const pose = cycle[step];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={src}
        onLoad={() => setLoaded(true)}
        contentFit="fill"
        style={{ position: 'absolute', width: size * COLS, height: size * ROWS, left: -(pose % COLS) * size, top: -Math.floor(pose / COLS) * size }}
      />
    </View>
  );
}

// 1周ぶんだけ再生して onDone
export function RollSprite({ id, size, onReady, onPose, onDone }: { id: string; size: number; onReady?: () => void; onPose?: (pose: number) => void; onDone: () => void }) {
  const src = CAT_ROLL[id];
  if (!src) return null;
  return <SheetSprite src={src} cycle={CYCLE} stepMs={ROLL_STEP_MS} size={size} onReady={onReady} onPose={onPose} onDone={onDone} />;
}

// ごろごろ以外の動き。素材のない猫には何も描かない
export function ActSprite({ id, kind, size, onReady, onPose, onDone }: { id: string; kind: ActKind; size: number; onReady?: () => void; onPose?: (pose: number) => void; onDone: () => void }) {
  const src = CAT_ACT[id]?.[kind];
  if (!src) return null;
  return <SheetSprite src={src} cycle={ACT_PLAY[kind].cycle} stepMs={ACT_PLAY[kind].stepMs} size={size} onReady={onReady} onPose={onPose} onDone={onDone} />;
}

// ホームの猫たちのごろごろの出番を決める。
// 猫ごとに「しばらく待つ→1周ごろごろ→また待つ」を別々のランダムな間隔でくり返す。
// 重なって同時に動くこともあれば、一緒に始まることもある。だれも動かない間ができそうなときは、
// すぐ別の子が始める（開いている間は常にどれか1匹は動く）
export function useRollDirector(ids: string[]): { active: Map<string, { run: number; kind: CatAction }>; done: (id: string) => void } {
  // Webは開発用の確認画面なので、端末の「視差効果を減らす」に関係なく動かす（実機ではこの設定に従う）
  const reduce = useReduceMotion();
  const still = reduce && Platform.OS !== 'web';
  const [active, setActive] = useState<Map<string, { run: number; kind: CatAction }>>(new Map());
  const finish = useRef<(id: string) => void>(() => {});
  const key = ids.filter(hasRoll).join('|');

  useEffect(() => {
    const pool = key ? key.split('|') : [];
    const running = new Map<string, { run: number; kind: CatAction }>(); // 猫id → 何回目の再生か、何をするか（同じ猫がすぐ続けて始まっても、再生をやりなおせるように）
    let seq = 0;
    let lastCover = Date.now(); // 開いた直後には出さない
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let dead = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const start = (id: string) => {
      if (dead || running.has(id)) return;
      const acts = actionsOf(id);
      // ごろごろを半分、残りはその猫が持っている動きからランダムに。
      // 「肉球で画面を覆う」は画面いっぱいになるので、たまにだけ（ほかが動き出すたびの小さなくじ＋前から時間をあける。同時には1つだけ）
      const others = acts.slice(1).filter((k) => k !== 'cover');
      const coverNow = [...running.values()].some((r) => r.kind === 'cover');
      const now = Date.now();
      let kind: CatAction = 'roll';
      if (acts.includes('cover') && !coverNow && now - lastCover > COVER_COOLDOWN_MS && Math.random() < COVER_CHANCE) {
        kind = 'cover';
        lastCover = now;
      } else if (others.length > 0 && Math.random() < 0.5) {
        kind = others[Math.floor(Math.random() * others.length)];
      }
      running.set(id, { run: (seq += 1), kind });
      setActive(new Map(running));
    };
    const wait = (id: string, ms: number) => {
      const t = setTimeout(() => { timers.delete(t); start(id); }, ms);
      timers.add(t);
    };
    finish.current = (id) => {
      if (dead || !running.delete(id)) return;
      setActive(new Map(running));
      if (running.size === 0) {
        const others = pool.length > 1 ? pool.filter((p) => p !== id) : pool;
        start(others[Math.floor(Math.random() * others.length)]);
      }
      wait(id, rnd(9000, 28000));
    };
    if (!still && pool.length > 0) {
      const first = pool[Math.floor(Math.random() * pool.length)];
      start(first);
      for (const id of pool) if (id !== first) wait(id, Math.random() < 0.2 ? rnd(0, 600) : rnd(3000, 20000));
    }
    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      setActive(new Map());
    };
  }, [key, still]);

  return { active, done: (id) => finish.current(id) };
}

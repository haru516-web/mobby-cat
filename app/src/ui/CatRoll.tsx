import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { CAT_ACT } from '../data/catAct';
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

export type CatAction = 'roll' | 'sleep';
export const SLEEP_STEP_MS = 420;
export const SLEEP_STEPS = 16; // 8コマを2周

const SLEEP_CYCLE = Array.from({ length: SLEEP_STEPS }, (_, i) => i % POSES);

// どの動きが使えるか。ごろごろは全員、寝るは素材のある猫だけ
export const actionsOf = (id: string): CatAction[] => (CAT_ACT[id] ? ['roll', 'sleep'] : hasRoll(id) ? ['roll'] : []);

// スプライトシートを cycle の順に1回だけ再生して onDone。onReady は最初のコマが描けたとき（それまでは静止画を残せるように）
function SheetSprite({ src, cycle, stepMs, size, onReady, onDone }: { src: number; cycle: number[]; stepMs: number; size: number; onReady?: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const cb = useRef({ onReady, onDone });
  useEffect(() => { cb.current = { onReady, onDone }; });
  useEffect(() => {
    if (!loaded) return;
    cb.current.onReady?.();
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= cycle.length) {
        clearInterval(t);
        cb.current.onDone();
        return;
      }
      setStep(i);
    }, stepMs);
    return () => clearInterval(t);
  }, [loaded, cycle.length, stepMs]);
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
export function RollSprite({ id, size, onReady, onDone }: { id: string; size: number; onReady?: () => void; onDone: () => void }) {
  const src = CAT_ROLL[id];
  if (!src) return null;
  return <SheetSprite src={src} cycle={CYCLE} stepMs={ROLL_STEP_MS} size={size} onReady={onReady} onDone={onDone} />;
}

// 鼻ちょうちんで寝る。素材のない猫には何も描かない
export function ActSprite({ id, size, onReady, onDone }: { id: string; size: number; onReady?: () => void; onDone: () => void }) {
  const src = CAT_ACT[id]?.sleep;
  if (!src) return null;
  return <SheetSprite src={src} cycle={SLEEP_CYCLE} stepMs={SLEEP_STEP_MS} size={size} onReady={onReady} onDone={onDone} />;
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
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let dead = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const start = (id: string) => {
      if (dead || running.has(id)) return;
      const acts = actionsOf(id);
      // ごろごろと寝るを半々（寝る素材のある猫だけ）
      const kind: CatAction = acts.length > 1 && Math.random() < 0.5 ? 'sleep' : 'roll';
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

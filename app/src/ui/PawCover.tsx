import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { CAT_ACT } from '../data/catAct';
import { footAct, footStill } from '../data/catFeet';

// 「肉球で画面を覆う」：猫がいる場所から二足で構えて飛び、手前に近づいて、最後は画面いっぱいが肉球になる。
// シートは4列×2行・8コマ。コマ送りに合わせて、絵の枠を猫の大きさから画面いっぱいまで拡大しながら画面の中央へ寄せる。
// （枠を最初から画面の大きさで描いて縮めておくので、最後まで粗くならない）
const COLS = 4;
const POSES = 8;
const STEP_MS = 250;
const PLAY_MS = POSES * STEP_MS; // 約2.0秒
const FILL_AT = (POSES - 1) / POSES; // 最後のコマ（肉球いっぱい）が出る時点で、枠が画面を覆いきる
const HOLD_MS = 900; // 肉球いっぱいのまま、少し止める
const FADE_MS = 350;

export function PawCover({ id, size, left, top, rootW, rootH, onReady, onDone }: { id: string; size: number; left: number; top: number; rootW: number; rootH: number; onReady?: () => void; onDone: () => void }) {
  const src = CAT_ACT[id]?.cover;
  const [pose, setPose] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const prog = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(1))[0];
  const cb = useRef({ onReady, onDone });
  useEffect(() => { cb.current = { onReady, onDone }; });

  useEffect(() => {
    if (!loaded) return;
    cb.current.onReady?.();
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= POSES) { clearInterval(t); return; }
      setPose(i);
    }, STEP_MS);
    let dead = false;
    Animated.sequence([
      Animated.timing(prog, { toValue: 1, duration: PLAY_MS, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished && !dead) cb.current.onDone(); });
    return () => { dead = true; clearInterval(t); prog.stopAnimation(); fade.stopAnimation(); };
  }, [loaded, prog, fade]);

  if (!src) return null;

  // 猫の立ち姿に、最初のコマの猫の大きさ・足元を合わせて始める（切り替わりで猫が跳ねて見えないように）
  const still = footStill(id);
  const f0 = footAct(id, 'cover', 0);
  const sc = f0[6] > 0 && still[6] > 0 ? Math.max(0.7, Math.min(1.7, Math.sqrt(still[6] / f0[6]))) : 1;
  const tx0 = (still[1] - (0.5 + sc * (f0[1] - 0.5))) * size;
  const ty0 = (still[0] - (0.5 + sc * (f0[0] - 0.5))) * size;
  const full = Math.max(rootW, rootH) * 1.08; // 正方形の枠が、画面（縦横どちらが長くても）を覆える大きさ
  const k = full / size;
  const dx = rootW / 2 - (left + size / 2); // 猫の中心から画面の中心へ
  const dy = rootH / 2 - (top + size / 2);
  const sx = -dx + tx0;
  const sy = -dy + ty0;
  const at = [0, 0.5, FILL_AT, 1];
  const scale = prog.interpolate({ inputRange: at, outputRange: [sc / k, (sc * 1.4) / k, 1, 1] });
  const tx = prog.interpolate({ inputRange: at, outputRange: [sx, sx * 0.85, 0, 0] });
  const ty = prog.interpolate({ inputRange: at, outputRange: [sy, sy * 0.85, 0, 0] });
  const cell = full; // 1コマの一辺
  const col = pose % COLS;
  const row = Math.floor(pose / COLS);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: rootW / 2 - full / 2, top: rootH / 2 - full / 2, width: full, height: full, opacity: fade, zIndex: 1000, elevation: 1000, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}
    >
      <View style={{ width: cell, height: cell, overflow: 'hidden' }}>
        <Image
          source={src}
          onLoad={() => setLoaded(true)}
          contentFit="fill"
          style={{ position: 'absolute', width: cell * COLS, height: cell * 2, left: -col * cell, top: -row * cell }}
        />
      </View>
    </Animated.View>
  );
}

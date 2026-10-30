import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { playSfx } from '../../services/audio';
import { C, CatImage, T, useReduceMotion } from '../../ui/base';
import { Backdrop, Pic, Slice } from '../../ui/Slice';

// 上から降ってきて画面の下にたまる猫。指定の6匹に、ノーマルから10種を足して各1体。下の段から順に落ちる
const CATS = [
  'british-longhair', 'nebelung', 'napoleon', 'mike-neko', 'nebosuke', 'halloween',
  'ragdoll', 'british-shorthair', 'siamese-seal-point', 'american-shorthair', 'scottish-fold',
  'maine-coon', 'persian', 'russian-blue', 'abyssinian', 'birman',
];
const ROWS = [6, 5, 5]; // 下の段から。左右の端まで広げる
const SIZE = 0.2; // 画面幅に対する猫の大きさ
const SEED = [0.37, 0.81, 0.12, 0.64, 0.95, 0.29, 0.53, 0.07, 0.72, 0.46, 0.18, 0.88, 0.33, 0.6, 0.24, 0.77];
const rnd = (i: number, k: number) => SEED[(i * 5 + k * 3) % SEED.length];
const PILE = (() => {
  const list: { id: string; x: number; row: number; rot: number; spin: number; delay: number; drift: number }[] = [];
  let n = 0;
  ROWS.forEach((cols, row) => {
    for (let c = 0; c < cols; c++, n++) {
      const frac = (c + 0.5 + (rnd(n, 1) - 0.5) * 0.4) / cols; // 0〜1。両端の猫は少し画面の外にはみ出す
      list.push({
        id: CATS[n],
        x: frac,
        row,
        rot: (rnd(n, 2) - 0.5) * 36,
        spin: (rnd(n, 3) - 0.5) * 70, // 落ちはじめの傾き
        delay: 500 + n * 280 + rnd(n, 4) * 120,
        drift: (rnd(n, 0) - 0.5) * 0.08, // 落ちながら横にゆれる幅（画面幅に対する割合）
      });
    }
  });
  return list;
})();

// 重力と反発で落下を作る。位置と傾きを細かくサンプルして、線形に進む時間で補間する（ネイティブ駆動でなめらか）
function dropCurve(fallDist: number, spin: number, drift: number) {
  const g = (2 * fallDist) / (1.15 * 1.15); // 約1.15秒で着地
  const e = 0.46; // 反発係数。大きいほど高く跳ねる
  const dt = 1 / 60;
  const ts: number[] = [], ys: number[] = [], xs: number[] = [], rs: number[] = [];
  let y = -fallDist, v = 0, t = 0, landed = -1, bounces = 0;
  for (let i = 0; i < 400; i++) {
    y += v * dt;
    v += g * dt;
    if (y >= 0) {
      y = 0;
      if (landed < 0) landed = t;
      if (Math.abs(v) < g * 0.07 || bounces >= 6) {
        v = 0;
      } else {
        v = -v * e;
        bounces++;
      }
    }
    if (i % 2 === 0) {
      const fallen = landed < 0 ? 1 - Math.min(1, -y / fallDist) : 1; // 0（上）→1（着地）
      const after = landed < 0 ? 0 : t - landed;
      ts.push(t);
      ys.push(y);
      xs.push(drift * Math.sin(fallen * Math.PI * 1.5) * (1 - fallen * 0.6));
      // 落ちるあいだは傾きが減り、着地後はゆらゆらと止まる
      rs.push(landed < 0 ? spin * (1 - fallen) : 6 * Math.exp(-after * 4) * Math.cos(after * 14) * Math.sign(spin || 1));
    }
    t += dt;
    if (landed >= 0 && v === 0 && t - landed > 0.7) break;
  }
  return { ts, ys, xs, rs, total: t };
}

function FallingCat({ id, x, row, rot, spin, delay, drift, w, h }: { id: string; x: number; row: number; rot: number; spin: number; delay: number; drift: number; w: number; h: number }) {
  const size = w * SIZE;
  const fallDist = h + size * 1.6 + row * size * 0.5; // 画面の上の外から落ちる
  const curve = useMemo(() => dropCurve(fallDist, spin, drift * w), [fallDist, spin, drift, w]);
  const clock = useState(() => new Animated.Value(0))[0];
  const still = useReduceMotion();
  useEffect(() => {
    // 動きを減らす設定では、落ちずに、はじめから積もった形で見せる
    if (still) { clock.setValue(curve.total); return; }
    const t = Animated.timing(clock, { toValue: curve.total, duration: curve.total * 1000, delay, easing: Easing.linear, useNativeDriver: true });
    t.start();
    return () => t.stop();
  }, [clock, curve, delay, still]);
  const input = curve.ts;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: w * x - size / 2,
        bottom: -size * 0.1 + row * size * 0.5,
        opacity: clock.interpolate({ inputRange: [0, 0.03, 1], outputRange: [1, 1, 1], extrapolate: 'clamp' }),
        zIndex: row,
        transform: [
          { translateX: clock.interpolate({ inputRange: input, outputRange: curve.xs, extrapolate: 'clamp' }) },
          { translateY: clock.interpolate({ inputRange: input, outputRange: curve.ys, extrapolate: 'clamp' }) },
          { rotate: clock.interpolate({ inputRange: input, outputRange: curve.rs.map((r) => `${r + rot}deg`), extrapolate: 'clamp' }) },
        ],
      }}
    >
      <CatImage id={id} size={size} />
    </Animated.View>
  );
}

const SPARKLES = [
  { x: 0.12, y: 0.14, s: 26, d: 0 }, { x: 0.82, y: 0.12, s: 20, d: 500 }, { x: 0.9, y: 0.3, s: 28, d: 1100 },
  { x: 0.06, y: 0.34, s: 18, d: 800 }, { x: 0.7, y: 0.4, s: 16, d: 300 },
];

function Sparkle({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  const v = useState(() => new Animated.Value(0))[0];
  const still = useReduceMotion();
  useEffect(() => {
    if (still) { v.setValue(0.8); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, delay: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, d, still]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '60deg'] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, opacity: v, transform: [{ rotate }, { scale }] }}>
      <Pic name="opening/sparkle" width={s * 2} />
    </Animated.View>
  );
}

// 起動時のタイトル。中央にロゴが左から順に現れ、そのまわりを猫が漂う。タップで始める
export default function OpeningScreen({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 430);
  const logoW = w * 0.8;
  const logoH = logoW * (420 / 1000);
  const reveal = useState(() => new Animated.Value(0))[0]; // ロゴを左から出す（0→1）
  const blink = useState(() => new Animated.Value(0))[0];
  const still = useReduceMotion();
  useEffect(() => {
    if (still) { reveal.setValue(1); blink.setValue(1); return; }
    Animated.sequence([
      Animated.timing(reveal, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reveal, blink, still]);

  return (
    <Pressable
      style={s.fill}
      accessibilityRole="button"
      accessibilityLabel="タップしてはじめる"
      onPress={() => {
        playSfx('sfx_tap');
        onStart();
      }}
    >
      <Backdrop name="opening/bg" />
      <View style={[s.pile, { width: w }]} pointerEvents="none">
        {PILE.map((c, i) => <FallingCat key={i} {...c} w={w} h={height} />)}
      </View>
      <View style={[s.stage, { width: w }]} pointerEvents="none">
        {SPARKLES.map((p, i) => <Sparkle key={i} {...p} />)}

        {/* タイトルを画面の中央に置き、そこを基準に猫を並べる */}
        <View style={{ width: logoW, height: logoH }}>
          <Animated.View style={{ width: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, logoW] }), height: logoH, overflow: 'hidden' }}>
            <Pic name="opening/logo-hero" width={logoW} />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[s.tap, { opacity: blink.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]} pointerEvents="none">
        <Slice name="opening/tap-pill" style={s.pill}>
          <T w="x" size={15} color={C.ink}>タップしてはじめる</T>
        </Slice>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center' },
  stage: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pile: { position: 'absolute', top: 0, bottom: 0 },
  tap: { position: 'absolute', bottom: '24%' },
  pill: { height: 44, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center' },
});

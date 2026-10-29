import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { shownRarity } from '../../core/recipes';
import { CAT_BY_ID, CatImage, T } from '../../ui/base';
import { ImgButton, RarityBadge, Tap } from '../../ui/kit';
import { Pic, Stretch } from '../../ui/Slice';
import { UI } from '../../ui/uiAssets';
import { playSfx } from '../../services/audio';
import { hapticLight, hapticSuccess } from '../../services/haptics';

/*
 * 候補をひらく演出。選んだ子たち（1〜6匹）が、まだ誰か分からない共通のシルエットのまま、いっしょに
 *   1. 暗くなって、シルエットが並んでふわっと出る
 *   2. 3回ふるえる（だんだん大きく。ふるえるたびに、軽く震えて知らせる）
 *   3. 光の輪が広がり、きらめきと肉球が飛び散る
 *   4. 猫たちが、少しずつずれて、はずんで出てくる。後ろで光がゆっくり回る。レア以上がいると、きらめきが2回出る
 *   5. 名前・レア度・出会えた条件が出て、ボタンを押すと閉じる
 * 途中で画面を押すと、最後（猫が出たところ）まで飛ばす。
 * 画像だけで作る（色や形はコードで描かない）。専用の画像（deai/*）が届くまでは、ある素材で代わりにする。
 */

const MYSTERY = UI['deai/mystery-cat'] ? 'deai/mystery-cat' : 'cat/silhouette-locked';
const RAYS = UI['deai/reveal-rays'] ? 'deai/reveal-rays' : 'navbtn/glow';
const BURST = UI['deai/reveal-burst'] ? 'deai/reveal-burst' : 'cat/halo-select';

const SPARKS = 14;
const PAWS = 8;
const PER_ROW = 3;

type Props = { ids: string[] | null; reasons: Record<string, string>; newIds: string[]; onClose: () => void };

export function RevealOverlay({ ids, reasons, newIds, onClose }: Props) {
  // 閉じる暗転のあいだも、同じ子たちを見せておく
  const last = useRef<string[] | null>(null);
  if (ids) last.current = ids;
  const shown = ids ?? last.current;
  return (
    <Modal visible={!!ids} transparent animationType="fade" onRequestClose={onClose}>
      {shown && <Reveal key={shown.join(',')} ids={shown} reasons={reasons} newIds={newIds} onClose={onClose} />}
    </Modal>
  );
}

function Reveal({ ids, reasons, newIds, onClose }: { ids: string[]; reasons: Record<string, string>; newIds: string[]; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const n = ids.length;
  const rare = ids.some((id) => !!CAT_BY_ID[id] && shownRarity(CAT_BY_ID[id]) >= 3);
  // 1匹はおおきく、2匹・3匹以上は小さく並べる（1行に最大3匹）
  const stageW = width - 56;
  const size = n === 1 ? Math.min(width * 0.62, 260) : n === 2 ? Math.min(stageW * 0.46, 170) : Math.min(stageW / 3 - 6, 124);
  const rows = useMemo(() => Array.from({ length: Math.ceil(n / PER_ROW) }, (_, r) => ids.slice(r * PER_ROW, r * PER_ROW + PER_ROW)), [ids, n]);
  const cellH = n === 1 ? size * 1.5 : size + 96;
  const burstSize = n === 1 ? size : Math.min(stageW, size * 2.2);

  const intro = useRef(new Animated.Value(0)).current; // シルエットが出る
  const shake = useRef(new Animated.Value(0)).current; // ふるえ（-1〜1）
  const swell = useRef(new Animated.Value(0)).current; // ふるえながら大きくなる
  const flash = useRef(new Animated.Value(0)).current; // 光の輪
  const burst = useRef(new Animated.Value(0)).current; // 飛び散るきらめき
  const burst2 = useRef(new Animated.Value(0)).current; // レア以上の2回目
  const pop = useRef(new Animated.Value(0)).current; // 猫が出る
  const spin = useRef(new Animated.Value(0)).current; // 後ろの光の回転（ずっと）
  const info = useRef(new Animated.Value(0)).current; // 名前などの文字
  const [done, setDone] = useState(false);
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 飛び散る向きと距離は、毎回少しずつ変える（同じ演出に見えないように）
  const reach = Math.max(size, burstSize * 0.9);
  const sparks = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => ({ a: (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4, r: reach * (0.62 + Math.random() * 0.45), s: 18 + Math.random() * 20 })),
    [reach],
  );
  const paws = useMemo(
    () => Array.from({ length: PAWS }, (_, i) => ({ a: (i / PAWS) * Math.PI * 2 + 0.3 + Math.random() * 0.5, r: reach * (0.5 + Math.random() * 0.35), s: 16 + Math.random() * 10, turn: (Math.random() - 0.5) * 120 })),
    [reach],
  );

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const wiggle = (amp: number, ms: number) =>
      Animated.sequence([
        Animated.timing(shake, { toValue: amp, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shake, { toValue: -amp, duration: ms * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]);
    const seq = Animated.sequence([
      Animated.spring(intro, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.delay(180),
      Animated.parallel([wiggle(0.5, 70), Animated.timing(swell, { toValue: 0.33, duration: 280, useNativeDriver: true })]),
      Animated.delay(140),
      Animated.parallel([wiggle(0.75, 60), Animated.timing(swell, { toValue: 0.66, duration: 240, useNativeDriver: true })]),
      Animated.delay(110),
      Animated.parallel([wiggle(1, 50), Animated.timing(swell, { toValue: 1, duration: 200, useNativeDriver: true })]),
      Animated.delay(80),
      // 光って、正体が出る（猫が多いほど、出そろうまで少し長く）
      Animated.parallel([
        Animated.timing(flash, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 4.2, tension: 90, useNativeDriver: true }),
        Animated.sequence([Animated.delay(rare ? 420 : 0), Animated.timing(burst2, { toValue: rare ? 1 : 0, duration: rare ? 900 : 0, easing: ease, useNativeDriver: true })]),
        Animated.sequence([Animated.delay(260 + (n - 1) * 120), Animated.timing(info, { toValue: 1, duration: 380, easing: ease, useNativeDriver: true })]),
      ]),
    ]);
    running.current = seq;
    seq.start(({ finished }) => { if (finished) setDone(true); });
    // ふるえと光に合わせて、触感と音
    later(0, () => playSfx('sfx_tap'));
    later(420, () => hapticLight());
    later(800, () => hapticLight());
    later(1130, () => hapticLight());
    later(1420, () => { hapticSuccess(); playSfx(rare ? 'sfx_pick_special' : 'sfx_gift'); });
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => {
      seq.stop();
      loop.stop();
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [intro, shake, swell, flash, burst, burst2, pop, spin, info, rare, n]);

  // 途中で押すと、猫が出たところまで飛ばす
  const skip = () => {
    if (done) return;
    running.current?.stop();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (const v of [intro, swell, flash, burst, pop, info]) v.setValue(1);
    burst2.setValue(rare ? 1 : 0);
    shake.setValue(0);
    hapticSuccess();
    playSfx(rare ? 'sfx_pick_special' : 'sfx_gift');
    setDone(true);
  };

  const mysteryOpacity = pop.interpolate({ inputRange: [0, 0.15], outputRange: [1, 0], extrapolate: 'clamp' });
  const mysteryScale = Animated.multiply(
    intro.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
    swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }),
  );
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const raysOpacity = pop.interpolate({ inputRange: [0, 1], outputRange: [0, rare ? 1 : 0.85] });
  const stageH = rows.length * cellH;

  const flying = (v: Animated.Value, list: { a: number; r: number; s: number; turn?: number }[], name: string, key: string) =>
    list.map((p, i) => (
      <Animated.View
        key={`${key}${i}`}
        pointerEvents="none"
        style={[
          s.center,
          {
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.r] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.r] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.turn ?? 90}deg`] }) },
              { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.1, 0.7] }) },
            ],
          },
        ]}
      >
        <Pic name={name} width={p.s * 2} />
      </Animated.View>
    ));

  // 1匹ぶんの場所：ひらく前のシルエットと、出てきた猫を重ね、下に名前などを置く
  const cell = (id: string, index: number) => {
    const cat = CAT_BY_ID[id];
    const reason = reasons[id];
    const sign = index % 2 ? -1 : 1;
    const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: [`${-9 * sign}deg`, `${9 * sign}deg`] });
    // 出てくるのは、左から順に少しずつずらす
    const start = Math.min(0.5, index * 0.12);
    const catScale = pop.interpolate({ inputRange: [0, start, 1], outputRange: [0.2, 0.2, 1] });
    const catOpacity = pop.interpolate({ inputRange: [0, start, start + 0.1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
    const big = n === 1;
    return (
      <View key={id} style={{ width: n === 1 ? stageW : size + 6, height: cellH, alignItems: 'center' }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View pointerEvents="none" style={[s.center, { opacity: mysteryOpacity, transform: [{ scale: mysteryScale }, { rotate }] }]}>
            <Pic name={MYSTERY} width={size * 0.92} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[s.center, { opacity: catOpacity, transform: [{ scale: catScale }] }]}>
            <CatImage id={id} size={size} />
          </Animated.View>
          {newIds.includes(id) && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, opacity: info }}>
              <Pic name="badge/new" height={big ? 30 : 22} />
            </Animated.View>
          )}
        </View>
        <Animated.View style={[s.info, { opacity: info, transform: [{ translateY: info.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
          {cat && <RarityBadge cat={cat} height={big ? 26 : 20} />}
          <T w="x" size={big ? 24 : 12} color="#fff" numberOfLines={2} style={s.name}>{cat?.name ?? ''}</T>
          <T w="b" size={big ? 13 : 10} color="#fff" numberOfLines={2} style={s.reason}>{reason ? `「${reason}」で出会えた！` : 'ふらりと遊びに来てくれた！'}</T>
        </Animated.View>
      </View>
    );
  };

  return (
    <Tap sfx={null} style={s.fill} onPress={skip} accessibilityLabel="ひらく演出を飛ばす">
      {/* 暗幕は1枚だと薄いので重ねる（後ろの一覧が透けて、ひらく前に答えが見えないように） */}
      {UI['deai/reveal-dim'] ? <Stretch name="deai/reveal-dim" style={StyleSheet.absoluteFill} /> : [0, 1, 2].map((i) => <Stretch key={i} name="bg/overlay-dim" style={StyleSheet.absoluteFill} />)}
      <View style={[s.stage, { height: stageH, width: stageW }]}>
        {/* 後ろでゆっくり回る光 */}
        <Animated.View pointerEvents="none" style={[s.center, { opacity: raysOpacity, transform: [{ rotate: spinDeg }] }]}>
          <Pic name={RAYS} width={Math.max(stageW * 1.05, burstSize * 1.9)} />
        </Animated.View>
        {/* 広がる光の輪 */}
        <Animated.View
          pointerEvents="none"
          style={[s.center, { opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] }) }] }]}
        >
          <Pic name={BURST} width={burstSize} />
        </Animated.View>
        {flying(burst, sparks, 'opening/sparkle', 's')}
        {flying(burst, paws, 'icon/paw', 'p')}
        {rare && flying(burst2, sparks.map((p) => ({ ...p, a: p.a + 0.26, r: p.r * 1.15 })), 'opening/sparkle', 'r')}
        {rows.map((row, r) => (
          <View key={r} style={[s.row, { height: cellH }]}>
            {row.map((id, c) => cell(id, r * PER_ROW + c))}
          </View>
        ))}
      </View>

      <Animated.View pointerEvents={done ? 'auto' : 'none'} style={[s.footer, { opacity: info }]}>
        <ImgButton label={n === 1 ? 'この子を見る' : 'この子たちを見る'} icon="icon/paw" height={50} onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </Animated.View>
    </Tap>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stage: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  info: { alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 2 },
  name: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  reason: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 5 },
  footer: { alignSelf: 'stretch', marginTop: 18 },
});

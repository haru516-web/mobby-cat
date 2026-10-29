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
 * 候補をひらく演出。まだ誰か分からない子（共通のシルエット）が、ふるえて、光って、ぽんっと正体を見せる。
 *   1. 暗くなって、シルエットが真ん中にふわっと出る
 *   2. 3回ふるえる（だんだん大きく。ふるえるたびに、軽く震えて知らせる）
 *   3. 光の輪が広がり、きらめきと肉球が飛び散る
 *   4. 猫がはずんで出てくる。後ろで光がゆっくり回る。レア以上は、きらめきが2回目も出る
 *   5. 名前・レア度・出会えた条件が出て、ボタンを押すと閉じる
 * 途中で画面を押すと、最後（猫が出たところ）まで飛ばす。
 * 画像だけで作る（色や形はコードで描かない）。専用の画像（deai/reveal-*）が届くまでは、ある素材で代わりにする。
 */

const MYSTERY = UI['deai/mystery-cat'] ? 'deai/mystery-cat' : 'cat/silhouette-locked';
const RAYS = UI['deai/reveal-rays'] ? 'deai/reveal-rays' : 'navbtn/glow';
const BURST = UI['deai/reveal-burst'] ? 'deai/reveal-burst' : 'cat/halo-select';

const SPARKS = 12;
const PAWS = 6;

type Props = { id: string | null; reason?: string; isNew: boolean; onClose: () => void };

export function RevealOverlay({ id, reason, isNew, onClose }: Props) {
  // 閉じる暗転のあいだも、同じ子を見せておく
  const last = useRef<string | null>(null);
  if (id) last.current = id;
  const shown = id ?? last.current;
  return (
    <Modal visible={!!id} transparent animationType="fade" onRequestClose={onClose}>
      {shown && <Reveal key={shown} id={shown} reason={reason} isNew={isNew} onClose={onClose} />}
    </Modal>
  );
}

function Reveal({ id, reason, isNew, onClose }: { id: string; reason?: string; isNew: boolean; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const cat = CAT_BY_ID[id];
  const rare = !!cat && shownRarity(cat) >= 3;
  const size = Math.min(width * 0.62, 260);

  // 0→1 の進み具合を、段階ごとに持つ
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
  const sparks = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => ({ a: (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4, r: size * (0.62 + Math.random() * 0.4), s: 18 + Math.random() * 20 })),
    [size],
  );
  const paws = useMemo(
    () => Array.from({ length: PAWS }, (_, i) => ({ a: (i / PAWS) * Math.PI * 2 + 0.3 + Math.random() * 0.5, r: size * (0.48 + Math.random() * 0.3), s: 16 + Math.random() * 10, turn: (Math.random() - 0.5) * 120 })),
    [size],
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
      // 光って、正体が出る
      Animated.parallel([
        Animated.timing(flash, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 4.2, tension: 90, useNativeDriver: true }),
        Animated.sequence([Animated.delay(rare ? 420 : 0), Animated.timing(burst2, { toValue: rare ? 1 : 0, duration: rare ? 900 : 0, easing: ease, useNativeDriver: true })]),
        Animated.sequence([Animated.delay(260), Animated.timing(info, { toValue: 1, duration: 380, easing: ease, useNativeDriver: true })]),
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
  }, [intro, shake, swell, flash, burst, burst2, pop, spin, info, rare]);

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
  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] });
  const catScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const raysOpacity = pop.interpolate({ inputRange: [0, 1], outputRange: [0, rare ? 1 : 0.85] });

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

  return (
    <Tap sfx={null} style={s.fill} onPress={skip} accessibilityLabel="ひらく演出を飛ばす">
      {/* 暗幕は1枚だと薄いので重ねる（後ろの一覧が透けて、ひらく前に答えが見えないように） */}
      {UI['deai/reveal-dim'] ? <Stretch name="deai/reveal-dim" style={StyleSheet.absoluteFill} /> : [0, 1, 2].map((i) => <Stretch key={i} name="bg/overlay-dim" style={StyleSheet.absoluteFill} />)}
      <View style={[s.stage, { height: size * 1.6 }]}>
        {/* 後ろでゆっくり回る光 */}
        <Animated.View pointerEvents="none" style={[s.center, { opacity: raysOpacity, transform: [{ rotate: spinDeg }] }]}>
          <Pic name={RAYS} width={size * 1.9} />
        </Animated.View>
        {/* 広がる光の輪 */}
        <Animated.View
          pointerEvents="none"
          style={[s.center, { opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] }) }] }]}
        >
          <Pic name={BURST} width={size} />
        </Animated.View>
        {flying(burst, sparks, 'opening/sparkle', 's')}
        {flying(burst, paws, 'icon/paw', 'p')}
        {rare && flying(burst2, sparks.map((p) => ({ ...p, a: p.a + 0.26, r: p.r * 1.15 })), 'opening/sparkle', 'r')}

        {/* ひらく前：共通のシルエット */}
        <Animated.View pointerEvents="none" style={[s.center, { opacity: mysteryOpacity, transform: [{ scale: mysteryScale }, { rotate }] }]}>
          <Pic name={MYSTERY} width={size * 0.92} />
        </Animated.View>
        {/* ひらいたあと：その子 */}
        <Animated.View pointerEvents="none" style={[s.center, { opacity: pop.interpolate({ inputRange: [0, 0.1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: catScale }] }]}>
          <CatImage id={id} size={size} />
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents={done ? 'auto' : 'none'}
        style={[s.info, { opacity: info, transform: [{ translateY: info.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        {isNew && <Pic name="badge/new" height={26} />}
        {cat && <RarityBadge cat={cat} height={26} />}
        <T w="x" size={24} color="#fff" style={s.name}>{cat?.name ?? ''}</T>
        <T w="b" size={13} color="#fff" style={s.reason}>{reason ? `「${reason}」で出会えた！` : 'ふらりと遊びに来てくれた！'}</T>
        <ImgButton label="この子を見る" icon="icon/paw" height={50} onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 10 }} />
      </Animated.View>
    </Tap>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stage: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  info: { alignSelf: 'stretch', alignItems: 'center', gap: 6, marginTop: -12 },
  name: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  reason: { textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 5 },
});

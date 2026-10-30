import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { shownRarity } from '../../core/recipes';
import { CAT_BY_ID, useReduceMotion } from '../../ui/base';
import { Pic } from '../../ui/Slice';
import { BURST, FlyingBits, RAYS, makePaws, makeSparks } from './RevealFx';

/*
 * 猫をお迎えした瞬間の演出。ひらく演出の、光とはずみを、こちらでは思いきり使う（ひらく演出のほうは控えめ）。
 *   1. 光の輪がぱっと広がり、きらめきと肉球が飛び散る
 *   2. 発見カードが、はずんで出てくる。後ろで光がゆっくり回る。レア以上は、きらめきが2回出る
 *   3. 下のボタンが出る
 * カードは普通の View のまま（画像の保存・共有で、そのまま撮れるように）。
 */
export function WelcomeFx({ id, width, children, footer }: { id: string; width: number; children: ReactNode; footer: ReactNode }) {
  const still = useReduceMotion(); // 「視差効果を減らす」：光・飛び散り・はずみを止める
  const rare = !!CAT_BY_ID[id] && shownRarity(CAT_BY_ID[id]) >= 3;
  const flash = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const burst2 = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const foot = useRef(new Animated.Value(0)).current;

  const reach = width * 0.8;
  const sparks = useMemo(() => makeSparks(reach, 16), [reach]);
  const paws = useMemo(() => makePaws(reach, 9), [reach]);

  useEffect(() => {
    if (still) {
      for (const v of [pop, rays, foot]) v.setValue(1);
      return;
    }
    const ease = Easing.out(Easing.cubic);
    const seq = Animated.parallel([
      Animated.timing(flash, { toValue: 1, duration: 650, easing: ease, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4.2, tension: 90, useNativeDriver: true }),
      Animated.timing(rays, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),
      Animated.sequence([Animated.delay(rare ? 450 : 0), Animated.timing(burst2, { toValue: rare ? 1 : 0, duration: rare ? 1000 : 0, easing: ease, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(550), Animated.timing(foot, { toValue: 1, duration: 350, easing: ease, useNativeDriver: true })]),
    ]);
    seq.start();
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => {
      seq.stop();
      loop.stop();
    };
  }, [flash, burst, burst2, pop, rays, spin, foot, rare, still]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* 効果は、カードの中心から広がる。カードの見た目や大きさは変えない */}
        <View pointerEvents="none" style={s.fx}>
          <Animated.View style={[s.center, { opacity: rays.interpolate({ inputRange: [0, 1], outputRange: [0, rare ? 1 : 0.85] }), transform: [{ rotate: spinDeg }] }]}>
            <Pic name={RAYS} width={width * 1.7} />
          </Animated.View>
          <Animated.View style={[s.center, { opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.8] }) }] }]}>
            <Pic name={BURST} width={width * 0.8} />
          </Animated.View>
          <FlyingBits v={burst} list={sparks} name="opening/sparkle" />
          <FlyingBits v={burst} list={paws} name="icon/paw" />
          {rare && <FlyingBits v={burst2} list={sparks.map((p) => ({ ...p, a: p.a + 0.26, r: p.r * 1.15 }))} name="opening/sparkle" />}
        </View>
        <Animated.View style={{ alignItems: 'center', gap: 12, opacity: pop.interpolate({ inputRange: [0, 0.2], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }] }}>
          {children}
        </Animated.View>
      </View>
      <Animated.View style={{ alignSelf: 'stretch', opacity: foot }}>{footer}</Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  fx: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});

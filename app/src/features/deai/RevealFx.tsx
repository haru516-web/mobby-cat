import { Animated, StyleSheet } from 'react-native';
import { Pic } from '../../ui/Slice';
import { UI } from '../../ui/uiAssets';

// ひらく演出とお迎えの演出で共通の、光と飛び散るきらめき。画像だけで作る（deai/* が無いときは、ある素材で代わりにする）
export const MYSTERY = UI['deai/mystery-cat'] ? 'deai/mystery-cat' : 'cat/silhouette-locked';
export const RAYS = UI['deai/reveal-rays'] ? 'deai/reveal-rays' : 'navbtn/glow';
export const BURST = UI['deai/reveal-burst'] ? 'deai/reveal-burst' : 'cat/halo-select';

export type Bit = { a: number; r: number; s: number; turn?: number };

// 飛び散る向きと距離は、毎回少しずつ変える（同じ演出に見えないように）
export const makeSparks = (reach: number, n: number): Bit[] =>
  Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + Math.random() * 0.4, r: reach * (0.62 + Math.random() * 0.45), s: 18 + Math.random() * 20 }));
export const makePaws = (reach: number, n: number): Bit[] =>
  Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + 0.3 + Math.random() * 0.5, r: reach * (0.5 + Math.random() * 0.35), s: 16 + Math.random() * 10, turn: (Math.random() - 0.5) * 120 }));

// v（0→1）に合わせて、中心から外へ飛んで消える
export function FlyingBits({ v, list, name }: { v: Animated.Value; list: Bit[]; name: string }) {
  return (
    <>
      {list.map((p, i) => (
        <Animated.View
          key={i}
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
      ))}
    </>
  );
}

const s = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});

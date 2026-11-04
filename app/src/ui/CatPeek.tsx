import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useReduceMotion } from './base';

// 天井からのぞくにゃこモビー（assets/peek/、動画「Summer Night Fast Cuts」の素材を軽くしたもの）
const PEEKS = [
  require('../../assets/peek/02-upper-left-tilt.webp'),
  require('../../assets/peek/03-upside-down-top-right.webp'),
  require('../../assets/peek/04-right-edge-side-peek.webp'),
  require('../../assets/peek/05-lower-left-curl.webp'),
  require('../../assets/peek/06-bottom-right-paws-first.webp'),
  require('../../assets/peek/07-top-center-sneak.webp'),
  require('../../assets/peek/08-left-edge-wave.webp'),
  require('../../assets/peek/09-bottom-center-stretch.webp'),
  require('../../assets/peek/10-nose-first-top-left.webp'),
];
const SHOW_MS = 1400;

// ごろごろと同じ考え方：しばらく待つ→ランダムな1枚をのぞかせる→また待つ。
// ホームの部屋の上にかぶせる（さわれない）。呼び出し側は部屋のビューの中に置く
export default function CatPeek() {
  const reduce = useReduceMotion();
  const still = reduce && Platform.OS !== 'web';
  const [pick, setPick] = useState<number | null>(null);
  const fade = useState(() => new Animated.Value(0))[0];
  const last = useRef(-1);

  useEffect(() => {
    if (still) return;
    let dead = false;
    let timer: ReturnType<typeof setTimeout>;
    const wait = () => {
      timer = setTimeout(show, 12000 + Math.random() * 20000);
    };
    const show = () => {
      if (dead) return;
      let n = Math.floor(Math.random() * PEEKS.length);
      if (n === last.current) n = (n + 1) % PEEKS.length;
      last.current = n;
      fade.setValue(0);
      setPick(n);
    };
    wait();
    // 画像が描けてから（onLoad）フェードを始める。おわったら次の待ちへ
    (CatPeek as unknown as { _next?: () => void })._next = wait;
    return () => { dead = true; clearTimeout(timer); };
  }, [still, fade]);

  if (pick === null) return null;
  const run = () => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(SHOW_MS),
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setPick(null);
      (CatPeek as unknown as { _next?: () => void })._next?.();
    });
  };
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 1000 }]}>
      <Image source={PEEKS[pick]} onLoad={run} contentFit="cover" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, Text, TextProps, TextStyle, ViewStyle } from 'react-native';
import { CATS, CatDef } from '../data/catalog';

export const C = {
  bg: '#FFF8F0',
  card: '#FFFDF8',
  ink: '#4A3B32',
  sub: '#8C7A6B',
  accent: '#F08A20',
  green: '#5E9B3F',
  line: '#EADBC8',
  ok: '#6BAF8D',
};

export const FONT = {
  m: 'MPLUSRounded1c_500Medium',
  b: 'MPLUSRounded1c_700Bold',
  x: 'MPLUSRounded1c_800ExtraBold',
};

export const CAT_BY_ID: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));
export const catNo = (id: string) => String(CATS.findIndex((c) => c.id === id) + 1).padStart(3, '0');

type TProps = TextProps & { w?: keyof typeof FONT; size?: number; color?: string; style?: StyleProp<TextStyle> };

// 丸ゴシック（M PLUS Rounded 1c）で描くテキスト
export function T({ w = 'b', size = 14, color = C.ink, style, ...rest }: TProps) {
  return <Text {...rest} style={[{ fontFamily: FONT[w], fontSize: size, color }, style]} />;
}

export function CatImage({ id, size }: { id: string; size: number }) {
  const cat = CAT_BY_ID[id];
  return (
    <Image
      source={cat.image}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

// ふわふわ上下に揺れる（呼吸）
export function Bobbing({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const scaleY = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  return <Animated.View style={[style, { transform: [{ translateY }, { scaleY }] }]}>{children}</Animated.View>;
}

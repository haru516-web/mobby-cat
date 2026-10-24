import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CATS, CatDef, Rarity } from './data/catalog';

export const C = {
  bg: '#FFF8F0',
  card: '#FFFFFF',
  ink: '#4A3B32',
  sub: '#9A8A7E',
  accent: '#F08A5D',
  line: '#F0E4D8',
  ok: '#6BAF8D',
};

export const CAT_BY_ID: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));

export const RARITY_LABEL: Record<Rarity, string> = { 1: 'ふつう', 2: 'めずらしい', 3: 'レア', 4: 'でんせつ' };
export const RARITY_COLOR: Record<Rarity, string> = { 1: '#9A8A7E', 2: '#6BAF8D', 3: '#5B8DEF', 4: '#E5A23B' };

export function CatImage({ id, size, silhouette }: { id: string; size: number; silhouette?: boolean }) {
  const cat = CAT_BY_ID[id];
  return (
    <Image
      source={cat.image}
      style={{ width: size, height: size }}
      contentFit="contain"
      tintColor={silhouette ? '#CDBFB3' : undefined}
    />
  );
}

// ふわふわ上下に揺れる（呼吸）
export function Bobbing({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
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

export function Btn({
  label, onPress, disabled, kind = 'primary',
}: { label: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        kind === 'ghost' && s.btnGhost,
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function RarityTag({ r }: { r: Rarity }) {
  return <Text style={[s.tag, { color: RARITY_COLOR[r], borderColor: RARITY_COLOR[r] }]}>{RARITY_LABEL[r]}</Text>;
}

const s = StyleSheet.create({
  btn: { backgroundColor: C.accent, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.accent },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tag: { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
});

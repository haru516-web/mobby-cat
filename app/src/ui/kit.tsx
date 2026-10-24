import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CatDef } from '../data/catalog';
import { useGame } from '../state/game';
import { C, T } from './base';
import { Pic, Slice, hasUI } from './Slice';

// 素材が未作成のときに代わりに出す絵文字
const EMOJI: Record<string, string> = {
  'icon/paw': '🐾', 'icon/ticket-paw': '🎟️', 'icon/matatabi-leaf': '🌿', 'icon/calendar-today': '📅',
  'icon/cat-head': '🐱', 'icon/book': '📖', 'icon/search': '🔍', 'icon/chevron-right': '›', 'icon/camera': '📷',
  'icon/globe': '🌐', 'icon/pin': '📍', 'icon/flag': '🚩', 'icon/megaphone': '📣', 'icon/heart-on': '❤️',
  'icon/heart-off': '🤍', 'icon/coin-paw': '🪙', 'icon/lock': '🔒', 'icon/matatabi-bag': '🌿',
  'tabbar/home-on': '🏠', 'tabbar/home-off': '🏠', 'tabbar/deai-on': '🐱', 'tabbar/deai-off': '🐱',
  'tabbar/zukan-on': '📖', 'tabbar/zukan-off': '📖', 'tabbar/world-on': '🌐', 'tabbar/world-off': '🌐',
};

export function Icon({ name, size = 22, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  if (hasUI(name)) return <Pic name={name} height={size} style={style} />;
  const e = EMOJI[name] ?? '•';
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * (e === '›' ? 1 : 0.78), color: C.ink, lineHeight: size }}>{e}</Text>
    </View>
  );
}

type Skin = 'primary-orange' | 'primary-green' | 'ghost-outline' | 'ghost-green' | 'disabled';
const SKIN_TEXT: Record<Skin, string> = {
  'primary-orange': '#fff', 'primary-green': '#fff', 'ghost-outline': C.accent, 'ghost-green': C.green, disabled: '#9C8F83',
};
const SKIN_FALLBACK: Record<Skin, ViewStyle> = {
  'primary-orange': { backgroundColor: C.accent, borderColor: '#C9650E' },
  'primary-green': { backgroundColor: C.green, borderColor: '#3F6E28' },
  'ghost-outline': { backgroundColor: C.card, borderColor: C.accent },
  'ghost-green': { backgroundColor: C.card, borderColor: C.green },
  disabled: { backgroundColor: '#D9D0C6', borderColor: '#BDB1A5' },
};

export function ImgButton({
  label, onPress, disabled, skin = 'primary-orange', height = 48, icon, badge, style, fontSize,
}: {
  label: string; onPress: () => void; disabled?: boolean; skin?: Skin; height?: number;
  icon?: string; badge?: string; style?: StyleProp<ViewStyle>; fontSize?: number;
}) {
  const [down, setDown] = useState(false);
  const s = disabled ? 'disabled' : skin;
  const name = s === 'primary-orange' && down && hasUI('button/primary-orange-pressed') ? 'button/primary-orange-pressed' : `button/${s}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[{ height }, style, down && { transform: [{ scale: 0.97 }] }]}
    >
      <Slice name={name} style={[k.btn, { height, borderRadius: height / 2 }]} fallback={{ ...SKIN_FALLBACK[s], borderRadius: height / 2, borderWidth: 2 }}>
        {icon && <Icon name={icon} size={height * 0.45} style={{ marginRight: 6 }} />}
        <T w="x" size={fontSize ?? (height > 44 ? 16 : 14)} color={SKIN_TEXT[s]} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
        {badge && (
          <View style={k.btnBadge}><T w="x" size={11} color={C.accent}>{badge}</T></View>
        )}
      </Slice>
    </Pressable>
  );
}

// 上部のピル型の情報表示（所持数・今日の出会い・お迎え券）
export function InfoPill({ icon, label, value, onPress, style }: { icon: string; label: string; value: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={style}>
      <Slice name="panel/pill-info" style={k.pill} fallback={{ borderRadius: 22 }}>
        <Icon name={icon} size={24} />
        {!!label && <T w="m" size={11} color={C.sub} style={{ marginLeft: 6, marginRight: 6, flexShrink: 1 }} numberOfLines={1}>{label}</T>}
        <T w="x" size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} numberOfLines={1}>{value}</T>
        {onPress && <Icon name="icon/chevron-right" size={16} style={{ marginLeft: 2 }} />}
      </Slice>
    </Pressable>
  );
}

// ロゴ / タイトル画像＋所持品＋ベル
export function Header({ title = 'brand/logo-nekomobby', onShop, onBell }: { title?: string; onShop: () => void; onBell: () => void }) {
  const { state } = useGame();
  return (
    <View style={k.header}>
      <Pic name={title} height={title === 'brand/logo-nekomobby' ? 44 : 52} fallback={<T w="x" size={26}>ねこモビー</T>} />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onShop}>
        <Slice name="panel/pill-currency" style={k.currency} fallback={{ borderRadius: 22 }}>
          <Icon name="icon/ticket-paw" size={20} />
          <T w="x" size={14} style={{ marginLeft: 3, marginRight: 8 }}>{state.tickets}</T>
          <Icon name="icon/matatabi-leaf" size={20} />
          <T w="x" size={14} style={{ marginLeft: 3 }}>{state.matatabi}</T>
        </Slice>
      </Pressable>
      <Pressable onPress={onBell} style={{ marginLeft: 6 }}>
        <Pic name="button/bell-round" height={44} fallback={<Icon name="icon/bell" size={36} />} />
      </Pressable>
    </View>
  );
}

// 出会い画面・図鑑でのレア度バッジ。条件つきの猫は「限定」
export function RarityBadge({ cat, limited, height = 22 }: { cat: CatDef; limited?: boolean; height?: number }) {
  const [name, label, color] = limited
    ? ['limited', '限定', '#fff']
    : cat.rarity === 4 ? ['legend', 'でんせつ', '#fff']
    : cat.rarity === 3 ? ['rare', 'レア', '#2F5DA8']
    : ['normal', 'ノーマル', C.ink];
  const fb: Record<string, ViewStyle> = {
    limited: { backgroundColor: '#F2665A' }, legend: { backgroundColor: '#E5A23B' }, rare: { backgroundColor: '#BFD8FF' }, normal: { backgroundColor: '#E8DDD0' },
  };
  return (
    <Slice name={`badge/rarity-${name}`} style={[k.badge, { height, minWidth: height * 2.8, borderRadius: height / 2 }]} fallback={{ ...fb[name], borderWidth: 0, borderRadius: height / 2 }}>
      <T w="x" size={height * 0.52} color={color}>{label}</T>
    </Slice>
  );
}

export function Gauge({ value, max, color = 'orange', height = 14 }: { value: number; max: number; color?: 'orange' | 'yellow'; height?: number }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <Slice name="gauge/track" style={{ height, borderRadius: height / 2 }} fallback={{ backgroundColor: '#EFE4D6', borderWidth: 0, borderRadius: height / 2 }}>
      {pct > 0 && (
        <Slice
          name={`gauge/fill-${color}`}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pct * 100, 8)}%`, borderRadius: height / 2 }}
          fallback={{ backgroundColor: color === 'orange' ? C.accent : '#F5B935', borderWidth: 0, borderRadius: height / 2 }}
        />
      )}
    </Slice>
  );
}

export function Card({ children, style, skin = 'cream' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; skin?: 'cream' | 'white' | 'selected' }) {
  return (
    <Slice name={`panel/card-${skin}`} style={[k.card, style]} fallback={skin === 'selected' ? { borderColor: C.accent, borderWidth: 3, borderRadius: 18 } : { borderRadius: 18 }}>
      {children}
    </Slice>
  );
}

// ポラロイド枠（写真領域は元画像の 上下左右 24/24/24/84px）
export function Polaroid({ width, children, style }: { width: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const h = width * (420 / 360);
  const m = width * (24 / 360);
  return (
    <View style={[{ width, height: h }, style]}>
      <Pic name="panel/polaroid" width={width} style={StyleSheet.absoluteFill} fallback={<View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', borderRadius: 4 }]} />} />
      <View style={{ position: 'absolute', left: m * 1.3, right: m * 1.3, top: m * 1.3, bottom: width * (84 / 360), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6EBDD' }}>
        {children}
      </View>
    </View>
  );
}

export type TabKey = 'home' | 'deai' | 'zukan' | 'world';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' }, { key: 'deai', label: '出会い' }, { key: 'zukan', label: '図鑑' }, { key: 'world', label: '世界' },
];

export function TabBar({ tab, onChange, bottomInset }: { tab: TabKey; onChange: (t: TabKey) => void; bottomInset: number }) {
  return (
    <Slice name="tabbar/bg" style={[k.tabbar, { paddingBottom: Math.max(bottomInset, 8) }]} fallback={k.tabbarFallback}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable key={t.key} style={k.tab} onPress={() => onChange(t.key)}>
            {on && <Pic name="tabbar/active-glow" height={72} style={k.glow} />}
            <Icon name={`tabbar/${t.key}-${on ? 'on' : 'off'}`} size={34} style={!on && !hasUI(`tabbar/${t.key}-off`) ? { opacity: 0.45 } : undefined} />
            <T w="x" size={12} color={on ? C.accent : C.sub} style={{ marginTop: 2 }}>{t.label}</T>
            {on && <Pic name="tabbar/underline" width={60} style={{ marginTop: 3 }} fallback={<View style={k.underline} />} />}
          </Pressable>
        );
      })}
    </Slice>
  );
}

const k = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnBadge: { marginLeft: 8, backgroundColor: '#FFF2E2', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  pill: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 },
  currency: { height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  badge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  card: { padding: 14 },
  tabbar: { flexDirection: 'row', paddingTop: 8 },
  tabbarFallback: { backgroundColor: C.card, borderRadius: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0, borderTopWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10 },
  tab: { flex: 1, alignItems: 'center' },
  glow: { position: 'absolute', top: -18 },
  underline: { width: 48, height: 4, borderRadius: 2, backgroundColor: C.accent },
});

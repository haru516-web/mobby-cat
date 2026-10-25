import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { CatDef } from '../data/catalog';
import { useGame } from '../state/game';
import { C, T } from './base';
import { Pic, Slice } from './Slice';

export function Icon({ name, size = 22, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return <Pic name={name} height={size} style={style} />;
}

type Skin = 'primary-orange' | 'primary-green' | 'ghost-outline' | 'ghost-green' | 'disabled';
const SKIN_TEXT: Record<Skin, string> = {
  'primary-orange': '#fff', 'primary-green': '#fff', 'ghost-outline': C.accent, 'ghost-green': C.green, disabled: '#9C8F83',
};

export function ImgButton({
  label, onPress, disabled, skin = 'primary-orange', height = 48, icon, badge, style, fontSize,
}: {
  label: string; onPress: () => void; disabled?: boolean; skin?: Skin; height?: number;
  icon?: string; badge?: string; style?: StyleProp<ViewStyle>; fontSize?: number;
}) {
  const [down, setDown] = useState(false);
  const s = disabled ? 'disabled' : skin;
  const name = down && s !== 'disabled' ? `button/${s}-pressed` : `button/${s}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[{ height }, style]}
    >
      <Slice name={name} style={[k.btn, { height }]}>
        {icon && <Icon name={icon} size={height * 0.45} style={{ marginRight: 6 }} />}
        <T w="x" size={fontSize ?? (height > 44 ? 16 : 14)} color={SKIN_TEXT[s]} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
        {badge && (
          <Slice name="badge/owned-count" style={k.btnBadge}>
            <T w="x" size={11} color={C.accent}>{badge}</T>
          </Slice>
        )}
      </Slice>
    </Pressable>
  );
}

// 上部のピル型の情報表示（所持数・今日の出会い・お迎え券）
export function InfoPill({ icon, label, value, onPress, style }: { icon: string; label: string; value: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={style}>
      <Slice name="panel/pill-info" style={k.pill}>
        <Icon name={icon} size={24} />
        {!!label && <T w="m" size={11} color={C.sub} style={{ marginLeft: 6, marginRight: 6, flexShrink: 1 }} numberOfLines={1}>{label}</T>}
        <T w="x" size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} numberOfLines={1}>{value}</T>
        {onPress && <Icon name="icon/chevron-right" size={14} style={{ marginLeft: 4 }} />}
      </Slice>
    </Pressable>
  );
}

// ロゴ / タイトル画像＋所持品＋ベル
export function Header({ title = 'brand/logo-nekomobby', onShop, onBell }: { title?: string; onShop: () => void; onBell: () => void }) {
  const { state } = useGame();
  return (
    <View style={k.header}>
      <Pic name={title} height={title === 'brand/logo-nekomobby' ? 44 : 52} />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onShop}>
        <Slice name="panel/pill-currency" style={k.currency}>
          <Icon name="icon/ticket-paw" size={20} />
          <T w="x" size={14} style={{ marginLeft: 3, marginRight: 8 }}>{state.tickets}</T>
          <Icon name="icon/matatabi-leaf" size={20} />
          <T w="x" size={14} style={{ marginLeft: 3 }}>{state.matatabi}</T>
        </Slice>
      </Pressable>
      <Pressable onPress={onBell} style={{ marginLeft: 6 }}>
        <Pic name="button/bell-round" height={44} />
      </Pressable>
    </View>
  );
}

// レア度バッジ。条件つきの猫は「限定」、世界の猫・旅猫は「世界」
export function RarityBadge({ cat, limited, height = 22 }: { cat: CatDef; limited?: boolean; height?: number }) {
  const world = cat.kind === 'world' || cat.kind === 'travel';
  const [name, label, color] = world
    ? ['travel-cat', '世界', '#fff']
    : limited || cat.kind === 'condition' ? ['rarity-limited', '限定', '#fff']
    : cat.rarity === 4 ? ['rarity-legend', 'でんせつ', '#fff']
    : cat.rarity === 3 ? ['rarity-rare', 'レア', '#2F5DA8']
    : ['rarity-normal', 'ノーマル', C.ink];
  return (
    <Slice name={`badge/${name}`} style={[k.badge, { height, minWidth: height * 2.8 }]}>
      <T w="x" size={height * 0.52} color={color} style={world ? { marginLeft: height * 0.6 } : undefined}>{label}</T>
    </Slice>
  );
}

export function Gauge({ value, max, color = 'orange', height = 14 }: { value: number; max: number; color?: 'orange' | 'yellow'; height?: number }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <Slice name="gauge/track" style={{ height }}>
      {pct > 0 && (
        <Slice name={`gauge/fill-${color}`} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pct * 100, 8)}%` }} />
      )}
    </Slice>
  );
}

export function Card({ children, style, skin = 'cream' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; skin?: 'cream' | 'white' | 'selected' }) {
  return <Slice name={`panel/card-${skin}`} style={[k.card, style]}>{children}</Slice>;
}

// 写真や猫を置くくぼみ
export function Well({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Slice name="panel/photo-well" style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>{children}</Slice>;
}

// ポラロイド枠（写真領域は元画像の 上下左右 24/24/24/84px）
export function Polaroid({ width, children, style }: { width: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const h = width * (420 / 360);
  const m = width * (24 / 360);
  return (
    <View style={[{ width, height: h }, style]}>
      <Pic name="panel/polaroid" width={width} style={StyleSheet.absoluteFill} />
      <Well style={{ position: 'absolute', left: m * 1.3, right: m * 1.3, top: m * 1.3, bottom: width * (84 / 360) }}>{children}</Well>
    </View>
  );
}

// 設定のスイッチ
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Pic name={value ? 'button/toggle-on' : 'button/toggle-off'} height={36} />
    </Pressable>
  );
}

export type TabKey = 'home' | 'deai' | 'zukan' | 'world';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' }, { key: 'deai', label: '出会い' }, { key: 'zukan', label: '図鑑' }, { key: 'world', label: '世界' },
];

export function TabBar({ tab, onChange, bottomInset }: { tab: TabKey; onChange: (t: TabKey) => void; bottomInset: number }) {
  return (
    <Slice name="tabbar/bg" style={[k.tabbar, { paddingBottom: Math.max(bottomInset, 8) }]}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable key={t.key} style={k.tab} onPress={() => onChange(t.key)}>
            {on && <Pic name="tabbar/active-glow" height={72} style={k.glow} />}
            <Icon name={`tabbar/${t.key}-${on ? 'on' : 'off'}`} size={34} />
            <T w="x" size={12} color={on ? C.accent : C.sub} style={{ marginTop: 2 }}>{t.label}</T>
            {on && <Pic name="tabbar/underline" width={60} style={{ marginTop: 3 }} />}
          </Pressable>
        );
      })}
    </Slice>
  );
}

const k = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnBadge: { marginLeft: 8, height: 20, minWidth: 40, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 },
  currency: { height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  badge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  card: { padding: 14 },
  tabbar: { flexDirection: 'row', paddingTop: 14 },
  tab: { flex: 1, alignItems: 'center' },
  glow: { position: 'absolute', top: -18 },
});

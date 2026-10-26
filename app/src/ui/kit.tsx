import React, { useState } from 'react';
import { shownRarity } from '../core/recipes';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { CatDef } from '../data/catalog';
import { useGame } from '../core/game';
import { SfxId } from '../data/audioAssets';
import { playSfx } from '../services/audio';
import { hapticTap } from '../services/haptics';
import { C, T } from './base';
import { Pic, Slice } from './Slice';
import { TourAnchor } from './TourAnchor';
import { UI } from './uiAssets';

export function Icon({ name, size = 22, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return <Pic name={name} height={size} style={style} />;
}

// 音の鳴る押せる場所。画像だけのボタン（×・ベルなど）や一覧のマスはこれで包む。
// 操作音はどのボタンも同じ sfx_tap。専用の音（シャッターなど）を鳴らすときは sfx で変えるか null
type TapProps = Omit<PressableProps, 'onPress'> & { sfx?: SfxId | null; onPress?: () => void };
export function Tap({ sfx = 'sfx_tap', onPress, ...rest }: TapProps) {
  return <Pressable {...rest} onPress={onPress && withSfx(onPress, sfx)} />;
}
// 文字のリンク（T の onPress）にも同じ音と触覚をつける
export const withSfx = (f: () => void, sfx: SfxId | null = 'sfx_tap') => () => {
  if (sfx) playSfx(sfx);
  hapticTap();
  f();
};

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
      onPress={() => {
        playSfx('sfx_tap');
        hapticTap();
        onPress();
      }}
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
  // 幅の狭い端末（iPhone SE など）ではラベルを省いて値だけ見せる
  const narrow = useWindowDimensions().width < 390;
  return (
    <Tap onPress={onPress} style={style} accessibilityLabel={`${label} ${value}`}>
      <Slice name="panel/pill-info" style={k.pill}>
        <Icon name={icon} size={24} />
        {!!label && !narrow && <T w="m" size={11} color={C.sub} style={{ marginLeft: 6, marginRight: 6, flexShrink: 1 }} numberOfLines={1}>{label}</T>}
        <T w="x" size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} numberOfLines={1}>{value}</T>
        {onPress && <Icon name="icon/chevron-right" size={14} style={{ marginLeft: 4 }} />}
      </Slice>
    </Tap>
  );
}

// ロゴ / タイトル画像＋所持品＋ベル
export function Header({ title = 'brand/logo-nekomobby', onShop, onBell, onSettings }: { title?: string; onShop: () => void; onBell: () => void; onSettings: () => void }) {
  const { state } = useGame();
  const width = useWindowDimensions().width;
  const logoH = (title === 'brand/logo-nekomobby' ? 44 : 52) * (width < 390 ? 0.8 : 1);
  const tight = width < 390; // 設定ボタンが増えたぶん、ロゴを少し小さくする
  return (
    <View style={k.header}>
      <Pic name={title} height={logoH} />
      <View style={{ flex: 1 }} />
      <TourAnchor id="header-items">
        <Tap onPress={onShop}>
          <Slice name="panel/pill-currency" style={k.currency}>
            <Icon name="icon/ticket-paw" size={20} />
            <T w="x" size={14} style={{ marginLeft: 3, marginRight: 8 }}>{state.tickets}</T>
            <Icon name="icon/matatabi-leaf" size={20} />
            <T w="x" size={14} style={{ marginLeft: 3 }}>{state.matatabi}</T>
          </Slice>
        </Tap>
      </TourAnchor>
      <TourAnchor id="header-bell" style={{ marginLeft: 6 }}>
        <Tap onPress={onBell} accessibilityLabel="お知らせ">
          <Pic name="button/bell-round" height={44} />
          {state.inbox.length > state.inboxRead && <Pic name="button/bell-badge" height={14} style={k.bellBadge} />}
        </Tap>
      </TourAnchor>
      <Tap onPress={onSettings} accessibilityLabel="設定" style={{ marginLeft: 6 }}>
        {UI['button/settings-round'] ? (
          <Pic name="button/settings-round" height={tight ? 38 : 44} />
        ) : (
          // 歯車の画像（button/settings-round）が届くまでの代わり。docs/codex/UI_SETTINGS_PROMPT.md
          <Slice name="button/ghost-outline" style={k.gearFallback}>
            <T w="x" size={11} color={C.accent}>設定</T>
          </Slice>
        )}
      </Tap>
    </View>
  );
}

// レア度バッジ。条件つきの猫は「限定」、世界の猫・旅猫は「世界」
export function RarityBadge({ cat, height = 22 }: { cat: CatDef; height?: number }) {
  const world = cat.kind === 'world' || cat.kind === 'travel';
  const [name, label, color] = world
    ? ['travel-cat', '世界', '#fff']
    : shownRarity(cat) === 4 ? ['rarity-legend', 'でんせつ', '#fff']
    : shownRarity(cat) === 3 ? ['rarity-rare', 'レア', '#2F5DA8']
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
    <Pressable
      onPress={() => {
        playSfx('sfx_tap');
        hapticTap();
        onChange(!value);
      }}
      accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Pic name={value ? 'button/toggle-on' : 'button/toggle-off'} height={36} />
    </Pressable>
  );
}

export type TabKey = 'home' | 'deai' | 'zukan' | 'world';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' }, { key: 'deai', label: '出会い' }, { key: 'zukan', label: '図鑑' }, { key: 'world', label: '世界' },
];

// ナビバーは画面下に重ねて置く。各画面はこの高さぶんだけ下に余白を取る
export const TabPadCtx = React.createContext(0);
export const useTabPad = () => React.useContext(TabPadCtx);

export function TabBar({ tab, onChange, bottomInset }: { tab: TabKey; onChange: (t: TabKey) => void; bottomInset: number }) {
  return (
    <Slice name="tabbar/bg" style={[k.tabbar, { paddingBottom: Math.max(bottomInset, 8) }]}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable key={t.key} style={k.tab} onPress={() => {
              if (!on) playSfx('sfx_tap');
              onChange(t.key);
            }}>
            <Icon name={`tabbar/${t.key}-${on ? 'on' : 'off'}`} size={34} />
            <T w="x" size={11} color={on ? C.accent : C.sub} style={{ marginTop: 1 }}>{t.label}</T>
          </Pressable>
        );
      })}
    </Slice>
  );
}

const k = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnBadge: { marginLeft: 8, height: 20, minWidth: 40, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  // 左右の端（9スライスの 26pt）には花の飾りがあるので、中身はその内側に置く
  pill: { height: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 },
  currency: { height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22 },
  badge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  card: { padding: 14 },
  tabbar: { flexDirection: 'row', paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center' },
  glow: { position: 'absolute', top: -18 },
  gearFallback: { height: 36, minWidth: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  bellBadge: { position: 'absolute', right: 2, top: 2 },
});

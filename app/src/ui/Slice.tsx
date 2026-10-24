import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { UI } from './uiAssets';

// UI素材は @3x で作られているので、1pt = 3px として扱う
export const PX = 3;

export type Insets = { t: number; r: number; b: number; l: number };
const ins = (l: number, t = 0, r = l, b = t): Insets => ({ l, t, r, b });

// 素材ごとの伸縮しない端の幅（元画像のpx）。ここにない素材は Slice では使わない。
const INSETS: Record<string, Insets> = {
  'panel/card-cream': ins(64, 64),
  'panel/card-white': ins(64, 64),
  'panel/card-selected': ins(64, 64),
  'panel/pill-info': ins(72),
  'panel/pill-currency': ins(96),
  'panel/sheet-bottom': ins(90, 90, 90, 10),
  'button/primary-orange': ins(72),
  'button/primary-orange-pressed': ins(72),
  'button/primary-green': ins(72),
  'button/ghost-outline': ins(72),
  'button/ghost-green': ins(72),
  'button/disabled': ins(72),
  'button/tab-all-on': ins(64),
  'button/tab-normal': ins(64),
  'button/tab-rare': ins(64),
  'button/tab-limited': ins(64),
  'button/chip-detail': ins(110, 0, 60),
  'button/chip-favorite-on': ins(130, 0, 70),
  'button/chip-favorite-off': ins(130, 0, 70),
  'button/search-bar': ins(270, 0, 130), // 素材の左右に約105pxの透明余白あり
  'badge/rarity-normal': ins(56),
  'badge/rarity-rare': ins(56),
  'badge/rarity-limited': ins(56),
  'badge/rarity-legend': ins(56),
  'badge/travel-cat': ins(80),
  'camera/cat-tray': ins(90, 90),
  'gauge/track': ins(30),
  'gauge/fill-orange': ins(30),
  'gauge/fill-yellow': ins(30),
};

export const hasUI = (name: string) => !!UI[name];

type SliceProps = {
  name: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  fallback?: ViewStyle; // 素材がまだ無いときの見た目
};

// 9スライス描画。四隅は等倍、辺は一方向、中央は両方向に伸ばす。
export function Slice({ name, style, children, fallback }: SliceProps) {
  const a = UI[name];
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };
  if (!a) {
    return <View style={[{ backgroundColor: '#FFF6EA', borderRadius: 16, borderWidth: 1.5, borderColor: '#E5D3BF' }, fallback, style]}>{children}</View>;
  }
  const i = INSETS[name] ?? ins(0);
  const { w, h } = size;
  const cells: React.ReactNode[] = [];
  if (w > 0 && h > 0) {
    // 表示先の端の太さ（pt）。表示サイズが小さすぎるときは縮める
    const kx = Math.min(1, w / ((i.l + i.r) / PX || 1));
    const ky = Math.min(1, h / ((i.t + i.b) / PX || 1));
    const dl = (i.l / PX) * kx, dr = (i.r / PX) * kx, dt = (i.t / PX) * ky, db = (i.b / PX) * ky;
    const xs = [[0, dl, 0, i.l], [dl, w - dl - dr, i.l, a.w - i.l - i.r], [w - dr, dr, a.w - i.r, i.r]];
    const ys = [[0, dt, 0, i.t], [dt, h - dt - db, i.t, a.h - i.t - i.b], [h - db, db, a.h - i.b, i.b]];
    for (const [y, dh, sy, sh] of ys) {
      for (const [x, dw, sx, sw] of xs) {
        if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) continue;
        const fx = dw / sw, fy = dh / sh;
        cells.push(
          <View key={`${x}-${y}`} pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: dw + 1, height: dh + 1, overflow: 'hidden' }}>
            <Image source={a.src} resizeMode="stretch" style={{ position: 'absolute', left: -sx * fx, top: -sy * fy, width: a.w * fx, height: a.h * fy }} />
          </View>,
        );
      }
    }
  }
  return (
    <View style={style} onLayout={onLayout}>
      {cells}
      {children}
    </View>
  );
}

type PicProps = { name: string; height?: number; width?: number; style?: StyleProp<ViewStyle>; fallback?: React.ReactNode };

// 縦横比を保ったまま表示する画像素材。height か width のどちらかを指定（両方なければ @3x 実寸）。
export function Pic({ name, height, width, style, fallback }: PicProps) {
  const a = UI[name];
  if (!a) return fallback ? <View style={style}>{fallback}</View> : null;
  const w = width ?? (height ? (a.w / a.h) * height : a.w / PX);
  const h = height ?? (width ? (a.h / a.w) * width : a.h / PX);
  return (
    <View style={style} pointerEvents="none">
      <Image source={a.src} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}

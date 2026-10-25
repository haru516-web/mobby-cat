import React, { useState } from 'react';
import { Image, LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { UI, UIAsset } from './uiAssets';

// UI素材は @3x で作られているので、1pt = 3px として扱う
export const PX = 3;

const warned = new Set<string>();
function asset(name: string): UIAsset | undefined {
  const a = UI[name];
  if (!a && !warned.has(name)) {
    warned.add(name);
    console.warn(`[ui] 画像素材がありません: ${name}`);
  }
  return a;
}

type SliceProps = { name: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode };

// 9スライス描画。伸縮位置は app/assets/ui/manifest.json の slice（素材のpx）。
// 四隅は等倍、辺は一方向、中央は両方向に伸ばす。色や角丸はコードで描かない。
export function Slice({ name, style, children }: SliceProps) {
  const a = asset(name);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };
  const cells: React.ReactNode[] = [];
  const { w, h } = size;
  if (a && w > 0 && h > 0) {
    const i = a.slice ?? { t: 0, r: 0, b: 0, l: 0 };
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

type PicProps = { name: string; height?: number; width?: number; style?: StyleProp<ViewStyle> };

// 縦横比を保ったまま表示する画像素材。height か width のどちらかを指定（両方なければ @3x 実寸）。
export function Pic({ name, height, width, style }: PicProps) {
  const a = asset(name);
  if (!a) return null;
  const w = width ?? (height ? (a.w / a.h) * height : a.w / PX);
  const h = height ?? (width ? (a.h / a.w) * width : a.h / PX);
  return (
    <View style={style} pointerEvents="none">
      <Image source={a.src} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}

// 画面全体を覆う背景（不透明の bg/ 素材）。縦横比を保って全面を埋める
export function Backdrop({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  const a = asset(name);
  if (!a) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden' }, style]}>
      <Image source={a.src} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

// 素材を指定の大きさに引き伸ばして敷く（暗幕・グラデーションなど単色に近いもの）
export function Stretch({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  const a = asset(name);
  if (!a) return null;
  return (
    <View pointerEvents="none" style={[{ overflow: 'hidden' }, style]}>
      <Image source={a.src} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

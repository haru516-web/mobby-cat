import React, { ComponentRef, useEffect, useRef } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';

// チュートリアルが指し示せる場所。各画面が <TourAnchor> で目印を付ける
export type AnchorId = 'header-items' | 'header-bell' | 'home-room' | 'deai-hero' | 'deai-grid' | 'tabbar';

type ViewHandle = ComponentRef<typeof View>;

export type Rect = { x: number; y: number; width: number; height: number };

// 目印の View をモジュール内の表に登録しておき、チュートリアルは必要な段になったときだけ引いて測る
// （画面側はチュートリアルの状態を知らなくてよい）
const anchors = new Map<AnchorId, React.RefObject<ViewHandle | null>>();

export function TourAnchor({ id, children, style, onLayout }: { id: AnchorId; children: React.ReactNode; style?: StyleProp<ViewStyle>; onLayout?: (e: LayoutChangeEvent) => void }) {
  const ref = useRef<ViewHandle>(null);
  useEffect(() => {
    anchors.set(id, ref);
    return () => {
      if (anchors.get(id) === ref) anchors.delete(id);
    };
  }, [id]);
  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={style}>
      {children}
    </View>
  );
}

export function measureAnchor(id: AnchorId): Promise<Rect | null> {
  const view = anchors.get(id)?.current;
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) =>
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null)),
  );
}

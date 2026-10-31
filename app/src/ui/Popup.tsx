import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Overlay } from './Overlay';
import { Backdrop, Stretch } from './Slice';

// 画面の中央に出るポップ。暗幕のタップか onClose で閉じる。ポップの上にさらにポップを重ねられる。
// ネイティブの Modal は使わず、アプリの一番外側（OverlayHost）に、開いた順に重ねる（順序のきまりは overlayStore.ts）。
// 中身は高さいっぱい（flex: 1）で受け取るので、長いものは中で ScrollView にする。背景は画像（bg/app-cream）
export function Popup({ visible, onClose, children, maxWidth = 400, heightRatio = 0.82 }: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  heightRatio?: number;
}) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width - 24, maxWidth);
  const h = Math.min(height * heightRatio, 760);
  return (
    <Overlay visible={visible} onRequestClose={onClose}>
      <View style={s.fill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="閉じる">
          <Stretch name="bg/overlay-dim" style={StyleSheet.absoluteFill} />
        </Pressable>
        {/* 外枠は付けず、背景画像（bg/app-cream）をポップいっぱいに敷いて角だけ丸める */}
        <View style={{ width: w, height: h, overflow: 'hidden', borderRadius: 26 }}>
          <Backdrop name="bg/app-cream" />
          {children}
        </View>
      </View>
    </Overlay>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

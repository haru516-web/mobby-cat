import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';
import { overlayEntries, removeOverlay, setOverlay, subscribeOverlays, topOverlay } from './overlayStore';

// 重ね方のきまりは overlayStore.ts を見る。ここは、その一覧を画面に出す部品。

function Fade({ children }: { children: ReactNode }) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={{ flex: 1, opacity: v }}>{children}</Animated.View>;
}

/** visible のあいだ、children を画面いっぱいに重ねて出す（Modal の代わり）。閉じるのは、visible を false にするだけ。 */
export function Overlay({ visible, onRequestClose, children }: { visible: boolean; onRequestClose?: () => void; children: ReactNode }) {
  const id = useId();
  const closeRef = useRef(onRequestClose);
  useEffect(() => {
    closeRef.current = onRequestClose;
  });
  const [close] = useState(() => () => closeRef.current?.());
  // 内容は、描画のたびに差し替える（重なる順は、最初に出した時のまま）
  useEffect(() => {
    if (visible) setOverlay(id, <Fade>{children}</Fade>, close);
  });
  useEffect(() => {
    if (!visible) return;
    return () => removeOverlay(id);
  }, [visible, id]);
  return null;
}

/** アプリの一番外側に1つだけ置く。重なったポップは、ここで開いた順に描かれる */
export function OverlayHost() {
  const list = useSyncExternalStore(subscribeOverlays, overlayEntries, overlayEntries);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const top = topOverlay();
      if (!top) return false;
      top.onClose?.();
      return true;
    });
    return () => sub.remove();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {list.map((entry) => (
        <View key={entry.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {entry.node}
        </View>
      ))}
    </View>
  );
}

import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { C, T } from '../../ui/base';
import { Card, ImgButton, TabKey } from '../../ui/kit';
import { Slice, Stretch } from '../../ui/Slice';
import { Rect, measureAnchor } from '../../ui/TourAnchor';
import { TOUR_STEPS } from './steps';

const NAV_ORDER: TabKey[] = ['home', 'deai', 'zukan', 'world'];
// 暗幕は他のモーダルと同じ素材（bg/overlay-dim）を、明るく残す場所の上下左右に4枚敷いて作る
const DIM = 'bg/overlay-dim';

// 画面を暗くして、説明する場所だけ明るく残す。タップで次へ進む。説明するだけで、下の画面は操作できない。
export default function TutorialTour({ bottomInset, onNavigate, onClose }: { bottomInset: number; onNavigate: (t: TabKey) => void; onClose: () => void }) {
  const [pos, setPos] = useState(0);
  const step = TOUR_STEPS[pos];
  const last = pos >= TOUR_STEPS.length - 1;
  const [target, setTarget] = useState<Rect | null>(null);
  const [frame, setFrame] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [cardH, setCardH] = useState(170);
  const frameRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    onNavigate(step.tab);
  }, [step.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // タブが切り替わって描き終わるまで待ってから測る。遅れて出る画面のために数回やり直す
  useEffect(() => {
    let cancelled = false;
    setTarget(null);
    const run = async () => {
      frameRef.current?.measureInWindow((x, y, width, height) => {
        if (!cancelled) setFrame((p) => (p.x === x && p.y === y && p.width === width && p.height === height ? p : { x, y, width, height }));
      });
      if (!step.anchor && !step.nav) return;
      const rect = await measureAnchor(step.nav ? 'tabbar' : step.anchor!);
      if (cancelled || !rect) return;
      if (step.nav) {
        const i = NAV_ORDER.indexOf(step.nav);
        const w = rect.width / NAV_ORDER.length;
        setTarget({ x: rect.x + w * i, y: rect.y, width: w, height: rect.height });
      } else {
        setTarget(rect);
      }
    };
    const timers = [160, 600, 1400].map((ms) => setTimeout(() => void run(), ms));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [step]);

  const width = Math.max(1, frame.width);
  const height = Math.max(1, frame.height);
  // 画面の外にはみ出す分は切り詰める。ほとんど見えないときは説明だけにする
  const hole = (() => {
    if (!target || frame.width <= 0) return null;
    const x0 = Math.max(0, target.x - frame.x - 6);
    const y0 = Math.max(0, target.y - frame.y - 6);
    const x1 = Math.min(width, target.x - frame.x + target.width + 6);
    const y1 = Math.min(height, target.y - frame.y + target.height + 6);
    return x1 - x0 > 24 && y1 - y0 > 24 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  })();

  const cardW = Math.max(240, Math.min(360, width - 28));
  const left = Math.max(14, (width - cardW) / 2);
  const bottomLimit = height - cardH - 12;
  const top = hole
    ? hole.y + hole.h / 2 < height / 2
      ? Math.min(hole.y + hole.h + 14, bottomLimit)
      : Math.max(12, hole.y - cardH - 14)
    : Math.max(12, height - bottomInset - cardH - 90);

  return (
    <View
      ref={frameRef}
      collapsable={false}
      accessibilityViewIsModal
      onLayout={() => frameRef.current?.measureInWindow((x, y, w, h) => setFrame({ x, y, width: w, height: h }))}
      style={s.overlay}
    >
      {/* 下の画面が反応しないよう、全面でタップを受ける。タップで次へ */}
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="つぎへ" onPress={() => (last ? onClose() : setPos(pos + 1))} />
      {hole ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Stretch name={DIM} style={[s.dim, { left: 0, top: 0, width, height: hole.y }]} />
          <Stretch name={DIM} style={[s.dim, { left: 0, top: hole.y + hole.h, width, height: Math.max(0, height - hole.y - hole.h) }]} />
          <Stretch name={DIM} style={[s.dim, { left: 0, top: hole.y, width: hole.x, height: hole.h }]} />
          <Stretch name={DIM} style={[s.dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, width - hole.x - hole.w), height: hole.h }]} />
        </View>
      ) : (
        <Stretch name={DIM} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />
      )}
      <View style={{ position: 'absolute', left, top, width: cardW }} onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}>
        <Card skin="white" style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Slice name="button/tab-all-on" style={s.badge}>
              <T w="x" size={11} color="#fff">{pos + 1} / {TOUR_STEPS.length}</T>
            </Slice>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="チュートリアルをとじる">
              <T w="b" size={12} color={C.sub} style={{ textDecorationLine: 'underline' }}>スキップ</T>
            </Pressable>
          </View>
          <T w="x" size={17}>{step.title}</T>
          <T w="b" size={12.5} style={{ lineHeight: 19 }}>{step.detail}</T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <ImgButton skin="ghost-outline" label="もどる" height={42} fontSize={13} disabled={pos === 0} onPress={() => setPos(pos - 1)} style={{ flex: 1 }} />
            <ImgButton label={last ? 'はじめる' : 'つぎへ'} height={42} fontSize={13} onPress={() => (last ? onClose() : setPos(pos + 1))} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 300, elevation: 300 },
  dim: { position: 'absolute' },
  badge: { minWidth: 60, height: 28, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});

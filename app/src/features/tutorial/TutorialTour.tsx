import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { C, T } from '../../ui/base';
import { Card, ImgButton, NAV_KEYS, TabKey, Tap } from '../../ui/kit';
import { Pic, Slice, Stretch } from '../../ui/Slice';
import { Rect, measureAnchor } from '../../ui/TourAnchor';
import { TOUR_STEPS } from './steps';
import { onTourEvent, setTourActions, setTourPopup, tourActions, useTourPopup } from './tourStore';

const NAV_ORDER: TabKey[] = NAV_KEYS;
// 暗幕は他のモーダルと同じ素材（bg/overlay-dim）を、明るく残す場所の上下左右に4枚敷いて作る
const DIM = 'bg/overlay-dim';

export default function TutorialTour({ bottomInset, onNavigate, onClose, openPopup, closePopups }: {
  bottomInset: number;
  onNavigate: (t: TabKey) => void;
  onClose: () => void;
  openPopup: (kind: 'shop' | 'notice') => void; // ショップ・お知らせのポップを、チュートリアルから開く
  closePopups: () => void; // 開いているポップを、チュートリアルから閉じる
}) {
  const [pos, setPos] = useState(0);
  const step = TOUR_STEPS[pos];
  const last = pos >= TOUR_STEPS.length - 1;
  const [target, setTarget] = useState<Rect | null>(null);
  const [frame, setFrame] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [cardH, setCardH] = useState(170);
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const live = useRef({ pos });
  live.current = { pos };
  // 呼び出し元は毎回新しい関数を渡すので、最新のものを参照だけして、効果は作り直さない
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const popupsRef = useRef({ openPopup, closePopups });
  popupsRef.current = { openPopup, closePopups };

  const goNext = () => {
    const p = live.current.pos;
    if (p >= TOUR_STEPS.length - 1) {
      popupsRef.current.closePopups();
      setTourPopup(null);
      closeRef.current();
    } else setPos(p + 1);
  };

  // 段が変わったら、その段のタブを開き、ショップ／お知らせの段ならポップも開く（そうでなければ閉じる）。
  // 利用者が押せるのは「もどる」「つぎへ」「スキップ」だけで、画面の中は操作できない
  useEffect(() => {
    onNavigate(step.tab);
    popupsRef.current.closePopups();
    if (step.popup) {
      popupsRef.current.openPopup(step.popup);
      setTourPopup({ kind: step.popup, pos: pos + 1, total: TOUR_STEPS.length, title: step.title, detail: step.detail, canBack: pos > 0, last: pos >= TOUR_STEPS.length - 1 });
    } else setTourPopup(null);
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ポップの背景などで、利用者がポップを閉じてしまったときは、つぎの段へ進む
  useEffect(() => onTourEvent((e) => {
    if (e === 'popup-closed' && TOUR_STEPS[live.current.pos].popup) goNext();
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ポップの中の説明の「もどる」「つぎへ」「スキップ」
  useEffect(() => {
    setTourActions({
      back: () => setPos((p) => Math.max(0, p - 1)),
      next: goNext,
      skip: () => {
        popupsRef.current.closePopups();
        setTourPopup(null);
        closeRef.current();
      },
    });
    return () => {
      setTourActions(null);
      setTourPopup(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const dimRects = hole
    ? [
        { left: 0, top: 0, width, height: hole.y },
        { left: 0, top: hole.y + hole.h, width, height: Math.max(0, height - hole.y - hole.h) },
        { left: 0, top: hole.y, width: hole.x, height: hole.h },
        { left: hole.x + hole.w, top: hole.y, width: Math.max(0, width - hole.x - hole.w), height: hole.h },
      ]
    : [];

  return (
    <View
      ref={frameRef}
      collapsable={false}
      accessibilityViewIsModal
      onLayout={() => frameRef.current?.measureInWindow((x, y, w, h) => setFrame({ x, y, width: w, height: h }))}
      style={s.overlay}
      pointerEvents="box-none"
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {hole ? dimRects.map((r, i) => <Stretch key={i} name={DIM} style={[s.dim, r]} />) : <Stretch name={DIM} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />}
      </View>
      {/* 下の画面が反応しないよう、全面でタップを止める（説明は「つぎへ」で進む） */}
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="説明を読んでね" />

      {!step.popup && (
        <View style={{ position: 'absolute', left, top, width: cardW }} onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}>
          <Card skin="white" style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Slice name="button/tab-all-on" style={s.badge}>
                <T w="x" size={11} color="#fff">{pos + 1} / {TOUR_STEPS.length}</T>
              </Slice>
              <View style={{ flex: 1 }} />
              <Tap onPress={() => tourActions()?.skip()} hitSlop={10} accessibilityLabel="チュートリアルをとじる">
                <T w="b" size={12} color={C.sub} style={{ textDecorationLine: 'underline' }}>スキップ</T>
              </Tap>
            </View>
            <T w="x" size={17}>{step.title}</T>
            <>
                <T w="b" size={12.5} style={{ lineHeight: 19 }}>{step.detail}</T>
                {step.items?.map((it) => (
                  <View key={it.name} style={s.item}>
                    <Pic name={it.icon} height={44} />
                    <View style={{ flex: 1 }}>
                      <T w="x" size={13}>{it.name}</T>
                      <T w="m" size={11.5} color={C.sub} style={{ lineHeight: 17 }}>{it.text}</T>
                    </View>
                  </View>
                ))}
              </>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <ImgButton skin="ghost-outline" label="もどる" height={42} fontSize={13} disabled={pos === 0} onPress={() => tourActions()?.back()} style={{ flex: 1 }} />
              <ImgButton label={last ? 'はじめる' : 'つぎへ'} height={42} fontSize={13} onPress={goNext} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

// ショップ・お知らせのポップが開いている間は、説明をポップの中に出す（ポップはチュートリアルの暗幕より前に出るため）。
// ポップの中の画面は、全面で受けて操作させない。押せるのは「もどる」「つぎへ」「スキップ」だけ
export function TourCoach({ kind }: { kind: 'shop' | 'notice' }) {
  const p = useTourPopup();
  if (!p || p.kind !== kind) return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="説明を読んでね" />
      <View pointerEvents="box-none" style={s.coach}>
        <Card skin="white" style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Slice name="button/tab-all-on" style={s.badge}>
              <T w="x" size={11} color="#fff">{p.pos} / {p.total}</T>
            </Slice>
            <View style={{ flex: 1 }} />
            <Tap onPress={() => tourActions()?.skip()} hitSlop={10} accessibilityLabel="チュートリアルをとじる">
              <T w="b" size={12} color={C.sub} style={{ textDecorationLine: 'underline' }}>スキップ</T>
            </Tap>
          </View>
          <T w="x" size={17}>{p.title}</T>
          <T w="b" size={12.5} style={{ lineHeight: 19 }}>{p.detail}</T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <ImgButton skin="ghost-outline" label="もどる" height={42} fontSize={13} disabled={!p.canBack} onPress={() => tourActions()?.back()} style={{ flex: 1 }} />
            <ImgButton label={p.last ? 'はじめる' : 'つぎへ'} height={42} fontSize={13} onPress={() => tourActions()?.next()} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 300, elevation: 300 },
  dim: { position: 'absolute' },
  coach: { position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  badge: { minWidth: 60, height: 28, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});

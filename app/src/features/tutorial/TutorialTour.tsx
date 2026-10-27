import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGame } from '../../core/game';
import { C, T } from '../../ui/base';
import { Card, ImgButton, TabKey, Tap } from '../../ui/kit';
import { Pic, Slice, Stretch } from '../../ui/Slice';
import { Rect, measureAnchor } from '../../ui/TourAnchor';
import { TOUR_STEPS } from './steps';
import { onTourEvent, setTourActions, setTourPopup, tourActions, useTourPopup } from './tourStore';

const NAV_ORDER: TabKey[] = ['home', 'deai', 'zukan', 'world'];
// 暗幕は他のモーダルと同じ素材（bg/overlay-dim）を、明るく残す場所の上下左右に4枚敷いて作る
const DIM = 'bg/overlay-dim';

type Phase = 'point' | 'explain' | 'popup'; // 押してもらう／説明する／開いたポップの中で説明する

// 画面を暗くして、光っている場所だけ押せるようにする。押してもらう段は、押すと実際に動き、そのあとで説明する。
// 説明だけの段は、下の画面を操作できない。「もどる」「スキップ」はいつでも使える。
export default function TutorialTour({ bottomInset, onNavigate, onClose, closePopups }: {
  bottomInset: number;
  onNavigate: (t: TabKey) => void;
  onClose: () => void;
  closePopups: () => void; // 開いているショップ・お知らせのポップを、チュートリアルの外から閉じる
}) {
  const { state } = useGame();
  const [pos, setPos] = useState(0);
  const step = TOUR_STEPS[pos];
  const last = pos >= TOUR_STEPS.length - 1;
  const [phase, setPhase] = useState<Phase>(step.expect ? 'point' : 'explain');
  const [target, setTarget] = useState<Rect | null>(null);
  const [frame, setFrame] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [cardH, setCardH] = useState(170);
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const live = useRef({ pos, phase });
  live.current = { pos, phase };
  // 呼び出し元は毎回新しい関数を渡すので、最新のものを参照だけして、効果は作り直さない
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const popupsRef = useRef(closePopups);
  popupsRef.current = closePopups;
  const petBase = useRef(state.petCount);

  // 段が変わったら、押してもらう段は「押す」から、説明の段は「説明」から始める
  useEffect(() => {
    setPhase(step.expect ? 'point' : 'explain');
    petBase.current = state.petCount;
    onNavigate(step.tab);
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  // 猫をなでてもらう段：なでた回数がふえたら説明へ
  useEffect(() => {
    if (phase === 'point' && step.expect === 'pet' && state.petCount > petBase.current) setPhase('explain');
  }, [state.petCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // 画面側で起きたこと（ショップが開いた・ポップが閉じた・タブが変わった）を受け取る
  useEffect(() => {
    return onTourEvent((e) => {
      const { pos: p, phase: ph } = live.current;
      const st = TOUR_STEPS[p];
      if ((e === 'shop' || e === 'notice') && ph === 'point' && st.expect === e) {
        setPhase('popup');
        setTourPopup({ kind: e, pos: p + 1, total: TOUR_STEPS.length, title: st.title, detail: st.detail, canBack: p > 0 });
      } else if (e === 'popup-closed' && ph === 'popup') {
        setTourPopup(null);
        if (p >= TOUR_STEPS.length - 1) closeRef.current();
        else setPos(p + 1);
      } else if (e.startsWith('tab:') && ph === 'point' && st.expect === e.slice(4)) {
        if (p >= TOUR_STEPS.length - 1) closeRef.current();
        else setPos(p + 1);
      }
    });
  }, []);

  // ポップの中の説明の「もどる」「スキップ」
  useEffect(() => {
    setTourActions({
      back: () => {
        popupsRef.current();
        setTourPopup(null);
        setPos((p) => Math.max(0, p - 1));
      },
      skip: () => {
        popupsRef.current();
        setTourPopup(null);
        closeRef.current();
      },
    });
    return () => {
      setTourActions(null);
      setTourPopup(null);
    };
  }, []);

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

  const next = () => (last ? onClose() : setPos(pos + 1));
  const pointing = phase === 'point';
  // 光っている場所だけ押せるのは、押してもらう段で、場所が測れているとき。それ以外は下の画面を全面で止める
  const open = pointing && !!hole;
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
      {open ? (
        // 光っている穴は開けておき、まわりの暗幕だけがタップを止める
        dimRects.map((r, i) => (
          <Pressable key={i} style={[s.dim, r]} accessibilityLabel="光っているところを押してね">
            <Stretch name={DIM} style={StyleSheet.absoluteFill} />
          </Pressable>
        ))
      ) : (
        <>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {hole ? dimRects.map((r, i) => <Stretch key={i} name={DIM} style={[s.dim, r]} />) : <Stretch name={DIM} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />}
          </View>
          {/* 下の画面が反応しないよう、全面でタップを止める（説明は「つぎへ」で進む） */}
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="説明を読んでね" />
        </>
      )}

      {phase !== 'popup' && (
        <View style={{ position: 'absolute', left, top, width: cardW }} onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}>
          <Card skin="white" style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Slice name="button/tab-all-on" style={s.badge}>
                <T w="x" size={11} color="#fff">{pos + 1} / {TOUR_STEPS.length}</T>
              </Slice>
              <View style={{ flex: 1 }} />
              <Tap onPress={onClose} hitSlop={10} accessibilityLabel="チュートリアルをとじる">
                <T w="b" size={12} color={C.sub} style={{ textDecorationLine: 'underline' }}>スキップ</T>
              </Tap>
            </View>
            <T w="x" size={17}>{step.title}</T>
            {pointing ? (
              <T w="x" size={13.5} color={C.accent} style={{ lineHeight: 20 }}>👆 {step.point}</T>
            ) : (
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
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <ImgButton skin="ghost-outline" label="もどる" height={42} fontSize={13} disabled={pos === 0} onPress={() => setPos(pos - 1)} style={{ flex: 1 }} />
              {!pointing && <ImgButton label={last ? 'はじめる' : 'つぎへ'} height={42} fontSize={13} onPress={next} style={{ flex: 1 }} />}
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

// ショップ・お知らせのポップが開いている間は、説明をポップの中に出す（ポップはチュートリアルの暗幕より前に出るため）
export function TourCoach({ kind, close }: { kind: 'shop' | 'notice'; close: () => void }) {
  const p = useTourPopup();
  if (!p || p.kind !== kind) return null;
  return (
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
          <ImgButton label="わかった" height={42} fontSize={13} onPress={close} style={{ flex: 1 }} />
        </View>
      </Card>
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

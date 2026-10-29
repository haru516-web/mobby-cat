import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, Linking, PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATS } from '../../data/catalog';
import { SfxId } from '../../data/audioAssets';
import { playSfx } from '../../services/audio';
import { hapticTap } from '../../services/haptics';
import { notice } from '../../services/dialog';
import { HASHTAG, saveView, shareView, ViewRef } from '../../services/share';
import { homeSlotsOf, useGame } from '../../core/game';
import { CAT_BY_ID, CatImage, T } from '../../ui/base';
import { ImgButton, Tap } from '../../ui/kit';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';
import { UI } from '../../ui/uiAssets';

type Pose = { x: number; y: number; scale: number; rot: number };
const touchInfo = (e: GestureResponderEvent) => {
  const t = e.nativeEvent.touches;
  if (t.length < 2) return null;
  const dx = t[1].pageX - t[0].pageX, dy = t[1].pageY - t[0].pageY;
  return { dist: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
};

// 大きさ・向きは、元（等倍・まっすぐ）の近くまで戻したら、ぴったり元に合わせる（戻しやすくする）
const SNAP_SCALE = 0.08;
const SNAP_ROT = 0.12; // 約7度
const snap = (v: number, to: number, within: number) => (Math.abs(v - to) < within ? to : v);

// 撮影（企画書 8.1 のカメラ合成）。猫はドラッグで移動、2本指で拡大・回転。
// 指は猫の上でなくてもよい（画面のどこでも、猫に効く）。カメラのズームは、右の縦のバーで変える
export default function CameraScreen({ onClose, width, height }: { onClose: () => void; width: number; height: number }) {
  const { state, countPhoto } = useGame();
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const owned = useMemo(() => CATS.filter((c) => state.owned[c.id]), [state.owned]);
  // 最初は、ホームの1番目に置いている猫。置いていなければ、迎えた猫の先頭
  const [catId, setCatId] = useState<string | null>(() => homeSlotsOf(state).find((id) => !!id) ?? owned[0]?.id ?? null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose>({ x: 0, y: height * 0.1, scale: 1, rot: 0 });
  const [moved, setMoved] = useState(false); // 一度でも動かしたら、操作のヒントを消す
  const [zoom, setZoom] = useState(0); // 0 = 等倍
  const cam = useRef<CameraView>(null);
  const shot = useRef<ViewRef>(null);

  const start = useRef<{ pose: Pose; pinch: ReturnType<typeof touchInfo> }>({ pose, pinch: null });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          start.current = { pose: poseRef.current, pinch: touchInfo(e) };
        },
        onPanResponderMove: (e, g) => {
          const p = start.current;
          const now = touchInfo(e);
          setMoved(true);
          if (now) {
            if (!p.pinch) p.pinch = now; // 2本目の指が後から触れたとき
            setPose({
              ...p.pose,
              scale: snap(Math.max(0.3, Math.min(4, (p.pose.scale * now.dist) / p.pinch.dist)), 1, SNAP_SCALE),
              rot: snap(p.pose.rot + (now.angle - p.pinch.angle), 0, SNAP_ROT),
            });
          } else if (!p.pinch) {
            setPose({ ...p.pose, x: p.pose.x + g.dx, y: p.pose.y + g.dy });
          }
        },
        // 2本指から1本に減ったとき、残った指で急に動かないよう、そこから測り直す
        onPanResponderRelease: () => {
          start.current = { pose: poseRef.current, pinch: null };
        },
      }),
    [],
  );
  const poseRef = useRef(pose);
  poseRef.current = pose;

  const size = width * 0.55;
  const cat = catId && (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width / 2 - size / 2,
        top: height / 2 - size / 2,
        transform: [{ translateX: pose.x }, { translateY: pose.y }, { rotate: `${pose.rot}rad` }, { scale: pose.scale }],
      }}
    >
      <Pic name="camera/shadow-soft" width={size} style={{ position: 'absolute', top: size * 0.78 }} />
      <CatImage id={catId} size={size} />
    </View>
  );

  // 撮っているあいだは、シャッターを受け付けない（連打で何枚も撮らない）。撮れなかったときは、理由を伝える
  const shooting = useRef(false);
  const takePhoto = async () => {
    if (shooting.current) return;
    shooting.current = true;
    try {
      const pic = await cam.current?.takePictureAsync({ quality: 0.9, exif: false });
      if (pic?.uri) {
        playSfx('sfx_shutter');
        countPhoto();
        setPhoto(pic.uri);
      } else notice('撮影できませんでした', 'もう一度お試しください');
    } catch {
      notice('撮影できませんでした', 'カメラを準備しています。少し待ってから、もう一度お試しください');
    } finally {
      shooting.current = false;
    }
  };

  if (!perm?.granted) {
    // 一度「許可しない」にすると、iOS は許可の確認を二度と出さない。そのときは設定アプリへ案内する
    const denied = !!perm && !perm.canAskAgain;
    return (
      <View style={[s.fill, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Backdrop name="bg/app-cream" />
        <Pic name="button/camera-round" height={96} />
        <T w="x" size={18} style={{ marginTop: 16, textAlign: 'center' }}>にゃこモビーと写真を撮ろう</T>
        <T w="m" size={13} style={{ marginTop: 8, textAlign: 'center' }}>
          {denied ? 'カメラの許可がオフになっています。設定アプリで、にゃっコレのカメラをオンにしてください' : 'カメラの映像に、迎えた猫を重ねて、一緒に写真を撮れます。猫はドラッグで動かし、2本指で大きさと向きを変えられます。写真は、保存か共有を選んだときだけ端末の外に出ます'}
        </T>
        {denied ? (
          <ImgButton
            label="設定アプリを開く"
            height={50}
            onPress={() => Linking.openSettings().catch(() => notice('設定を開けませんでした', '端末の設定アプリから、にゃっコレのカメラの許可を変えてください'))}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        ) : (
          <ImgButton label="カメラを使う" height={50} onPress={requestPerm} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        )}
        <ImgButton skin="ghost-outline" label="もどる" height={44} onPress={onClose} style={{ marginTop: 10, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View style={s.fill}>
      {/* この View 全体が保存・共有される画像になる */}
      <View ref={shot} collapsable={false} style={s.fill}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          // ズームは端末の最大の半分まで（それ以上は画質が荒れる）
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} flash={flash ? 'on' : 'off'} zoom={zoom * 0.5} />
        )}
        {cat}
      </View>
      {/* 猫の移動・大きさ・向きは、画面のどこを触っても効く（上下のボタンとズームのバーは、この上にある） */}
      {!photo && catId && <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />}

      <Stretch name="camera/topbar-scrim" style={[s.top, { height: 100 + insets.top }]} />
      <View style={[s.topBar, { top: insets.top + 8 }]}>
        <Tap onPress={onClose} accessibilityLabel="閉じる"><Pic name="camera/btn-close" height={44} /></Tap>
        <View style={{ flex: 1 }} />
        {!photo && (
          <>
            <Tap onPress={() => setFlash(!flash)} accessibilityLabel="フラッシュ"><Pic name={flash ? 'camera/btn-flash-on' : 'camera/btn-flash-off'} height={44} /></Tap>
            <Tap onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} accessibilityLabel="カメラ切り替え" style={{ marginLeft: 10 }}>
              <Pic name="camera/btn-flip" height={44} />
            </Tap>
          </>
        )}
      </View>
      {!photo && catId && !moved && (
        <View style={[s.hint, { top: insets.top + 64 }]} pointerEvents="none">
          <Pic name="camera/gesture-hint" width={180} />
        </View>
      )}

      {!photo && <ZoomBar value={zoom} onChange={setZoom} top={insets.top + 130} />}

      <Stretch name="camera/bottombar-scrim" style={[s.bottom, { height: 240 + insets.bottom }]} />
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {photo ? (
          <>
          <T w="b" size={12} color="#fff" style={{ textAlign: 'center' }}>「保存」で写真アプリに入ります。「共有」で友だちに送れます</T>
          <View style={s.actions}>
            <Action icon="camera/btn-retake" label="撮り直す" onPress={() => setPhoto(null)} />
            <Action icon="camera/btn-save" label="保存" sfx="sfx_saved" onPress={() => saveView(shot)} />
            <Action
              icon="camera/btn-share"
              label="共有"
              onPress={() => shareView(shot, `${catId ? CAT_BY_ID[catId].name : 'にゃこモビー'}と写真を撮りました ${HASHTAG}`)}
            />
          </View>
          </>
        ) : (
          <>
            {owned.length > 0 && (
              <T w="b" size={12} color="#fff" style={{ textAlign: 'center', marginBottom: 6 }}>下の猫をタップで切りかえ。ドラッグで移動、2本指で大きさと向き、右のバーでズーム</T>
            )}
            {owned.length > 0 ? (
              <Slice name="camera/cat-tray" style={s.tray}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: 'center' }}>
                  {owned.map((c) => (
                    <Tap key={c.id} onPress={() => setCatId(c.id)} accessibilityLabel={c.name}>
                      <Pic name={catId === c.id ? 'camera/cat-tray-slot-on' : 'camera/cat-tray-slot'} height={60} />
                      <View style={StyleSheet.absoluteFill}><View style={s.slotCat}><CatImage id={c.id} size={50} /></View></View>
                    </Tap>
                  ))}
                </ScrollView>
              </Slice>
            ) : (
              <T w="b" size={13} color="#fff" style={{ textAlign: 'center' }}>猫を迎えると、一緒に写真を撮れます</T>
            )}
            <Tap sfx={null} onPress={takePhoto} accessibilityLabel="撮影" style={{ alignSelf: 'center', marginTop: 12 }}>
              {({ pressed }) => <Pic name={pressed ? 'camera/shutter-pressed' : 'camera/shutter'} height={80} />}
            </Tap>
          </>
        )}
      </View>
    </View>
  );
}

// カメラのズーム。画面の右に縦のバー。触るまでは薄く、触っているあいだははっきり見せる。
// 下の端（等倍）の近くまで下げたら、ぴったり等倍に戻す（ふるえて知らせる）
const BAR_H = 220;
const ZOOM_SNAP = 0.06;
function ZoomBar({ value, onChange, top }: { value: number; onChange: (v: number) => void; top: number }) {
  const [active, setActive] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const from = useRef(0);
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (fade.current) clearTimeout(fade.current);
          from.current = valueRef.current;
          setActive(true);
        },
        onPanResponderMove: (_e, g) => {
          const raw = Math.max(0, Math.min(1, from.current - g.dy / BAR_H));
          const next = raw < ZOOM_SNAP ? 0 : raw;
          if (next === 0 && valueRef.current !== 0) hapticTap();
          onChange(next);
        },
        onPanResponderRelease: () => {
          fade.current = setTimeout(() => setActive(false), 1200);
        },
        onPanResponderTerminate: () => setActive(false),
      }),
    [onChange],
  );
  useEffect(() => () => { if (fade.current) clearTimeout(fade.current); }, []);
  const thumb = 30;
  return (
    <View {...responder.panHandlers} style={[s.zoom, { top, opacity: active ? 1 : 0.4 }]} accessibilityLabel="ズーム" accessibilityRole="adjustable">
      <View style={{ width: 14, height: BAR_H, alignItems: 'center', justifyContent: 'center' }}>
        {UI['camera/zoom-track'] ? (
          <Slice name="camera/zoom-track" style={{ width: 14, height: BAR_H }} />
        ) : (
          // 縦のバーの画像（camera/zoom-track）が届くまでは、横のゲージを縦に回して使う
          <Slice name="gauge/track" style={{ width: BAR_H, height: 14, transform: [{ rotate: '-90deg' }] }}>
            <Slice name="gauge/fill-orange" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(value * BAR_H, 14) }} />
          </Slice>
        )}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 20 + value * (BAR_H - thumb), alignItems: 'center' }}>
        <Pic name={UI['camera/zoom-thumb'] ? 'camera/zoom-thumb' : 'icon/paw'} height={thumb} />
      </View>
      {active && <T w="x" size={11} color="#fff" style={s.zoomLabel}>{value === 0 ? '等倍' : 'ズーム'}</T>}
    </View>
  );
}

function Action({ icon, label, onPress, sfx }: { icon: string; label: string; onPress: () => void; sfx?: SfxId }) {
  return (
    <Tap sfx={sfx} onPress={onPress} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel={label}>
      <Pic name={icon} height={56} />
      <T w="x" size={12} color="#fff">{label}</T>
    </Tap>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  tray: { height: 84, justifyContent: 'center' },
  slotCat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  // 指で触りやすいよう、見えているバーより広く受け付ける
  zoom: { position: 'absolute', right: 4, width: 56, height: BAR_H + 40, paddingVertical: 20, alignItems: 'center' },
  zoomLabel: { position: 'absolute', bottom: -6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
});

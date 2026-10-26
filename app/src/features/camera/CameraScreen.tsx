import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATS } from '../../data/catalog';
import { SfxId } from '../../data/audioAssets';
import { playSfx } from '../../services/audio';
import { HASHTAG, saveView, shareView, ViewRef } from '../../services/share';
import { useGame } from '../../core/game';
import { CAT_BY_ID, CatImage, T } from '../../ui/base';
import { ImgButton, Tap } from '../../ui/kit';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';

type Pose = { x: number; y: number; scale: number; rot: number };
const touchInfo = (e: GestureResponderEvent) => {
  const t = e.nativeEvent.touches;
  if (t.length < 2) return null;
  const dx = t[1].pageX - t[0].pageX, dy = t[1].pageY - t[0].pageY;
  return { dist: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
};

// 撮影（企画書 8.1 のカメラ合成）。猫はドラッグで移動、2本指で拡大・回転
export default function CameraScreen({ onClose, width, height }: { onClose: () => void; width: number; height: number }) {
  const { state, countPhoto } = useGame();
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const owned = useMemo(() => CATS.filter((c) => state.owned[c.id]), [state.owned]);
  const [catId, setCatId] = useState<string | null>(owned[0]?.id ?? null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose>({ x: 0, y: height * 0.1, scale: 1, rot: 0 });
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
          if (now) {
            if (!p.pinch) p.pinch = now; // 2本目の指が後から触れたとき
            setPose({
              ...p.pose,
              scale: Math.max(0.3, Math.min(4, (p.pose.scale * now.dist) / p.pinch.dist)),
              rot: p.pose.rot + (now.angle - p.pinch.angle),
            });
          } else {
            setPose({ ...p.pose, x: p.pose.x + g.dx, y: p.pose.y + g.dy });
          }
        },
      }),
    [],
  );
  const poseRef = useRef(pose);
  poseRef.current = pose;

  const size = width * 0.55;
  const cat = catId && (
    <View
      {...(photo ? {} : responder.panHandlers)}
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

  const takePhoto = async () => {
    try {
      const pic = await cam.current?.takePictureAsync({ quality: 0.9, exif: false });
      if (pic?.uri) {
        playSfx('sfx_shutter');
        countPhoto();
        setPhoto(pic.uri);
      }
    } catch {}
  };

  if (!perm?.granted) {
    return (
      <View style={[s.fill, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Backdrop name="bg/app-cream" />
        <Pic name="button/camera-round" height={96} />
        <T w="x" size={18} style={{ marginTop: 16, textAlign: 'center' }}>猫モビーと写真を撮ろう</T>
        <T w="m" size={13} style={{ marginTop: 8, textAlign: 'center' }}>カメラを使うには許可が必要です。撮った写真は端末の中だけに保存されます</T>
        <ImgButton label="カメラを使う" height={50} onPress={requestPerm} style={{ marginTop: 20, alignSelf: 'stretch' }} />
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
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} flash={flash ? 'on' : 'off'} />
        )}
        {cat}
        {photo && <Pic name="share/watermark" width={120} style={{ position: 'absolute', right: 12, bottom: 12 }} />}
      </View>

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
      {!photo && catId && pose.scale === 1 && pose.rot === 0 && (
        <View style={[s.hint, { top: insets.top + 64 }]} pointerEvents="none">
          <Pic name="camera/gesture-hint" width={180} />
        </View>
      )}

      <Stretch name="camera/bottombar-scrim" style={[s.bottom, { height: 240 + insets.bottom }]} />
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {photo ? (
          <View style={s.actions}>
            <Action icon="camera/btn-retake" label="撮り直す" onPress={() => setPhoto(null)} />
            <Action icon="camera/btn-save" label="保存" sfx="sfx_saved" onPress={() => saveView(shot)} />
            <Action
              icon="camera/btn-share"
              label="共有"
              onPress={() => shareView(shot, `${catId ? CAT_BY_ID[catId].name : '猫モビー'}と写真を撮りました ${HASHTAG}`)}
            />
          </View>
        ) : (
          <>
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
});

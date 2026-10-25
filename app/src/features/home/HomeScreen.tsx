import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CATS } from '../../data/catalog';
import { msUntilNextReveal } from '../../core/encounter';
import { useGame } from '../../core/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { Card, Header, ImgButton, InfoPill, Polaroid, useTabPad } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';
import { ScreenProps } from '../../navigation';

// 部屋の中の猫の置き場所（部屋に対する割合）。手前ほど大きい
const SLOTS = [
  { x: 0.3, y: 0.52, s: 0.4 }, // ラグの上（手前中央）
  { x: 0.62, y: 0.5, s: 0.32 },
  { x: 0.02, y: 0.56, s: 0.34 },
  { x: 0.42, y: 0.3, s: 0.24 }, // ソファ
  { x: 0.08, y: 0.32, s: 0.26 },
  { x: 0.72, y: 0.18, s: 0.22 }, // キャットタワー
];
const MEOW = ['にゃ！', 'ごろごろ…', 'なでて〜', 'うれしい！', 'にゃーん', 'もっと！'];

// 時間帯で変わる「きょうのようす」
function mood(h: number, n: number) {
  if (n === 0) return '部屋はまだしずかです';
  if (h < 6) return 'みんなぐっすり眠っています';
  if (h < 11) return '朝ごはんを待っています';
  if (h < 16) return 'ひなたでのんびりしています';
  if (h < 20) return 'そろそろ新しい出会いの時間…';
  return '夜の運動会がはじまりました';
}

function RoomCat({ id, size, delay, onPet }: { id: string; size: number; delay: number; onPet: () => void }) {
  const hop = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const [line, setLine] = useState<string | null>(null);
  const tap = () => {
    onPet();
    setLine(MEOW[Math.floor(Math.random() * MEOW.length)]);
    hop.setValue(0);
    heart.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
      ]),
      Animated.timing(heart, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setLine(null));
  };
  return (
    <Pressable onPress={tap} accessibilityLabel={`${CAT_BY_ID[id].name}をなでる`}>
      <Pic name="camera/shadow-soft" width={size * 0.9} style={{ position: 'absolute', left: size * 0.05, top: size * 0.82 }} />
      <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.18] }) }] }}>
        <Bobbing delay={delay}>
          <CatImage id={id} size={size} />
        </Bobbing>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[s.heart, { left: size * 0.4, opacity: heart.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: heart.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.5] }) }] }]}
      >
        <Pic name="icon/heart-on" height={size * 0.2} />
      </Animated.View>
      {line && (
        <Slice name="panel/speech-bubble" style={[s.bubble, { left: size * 0.5 - 60 }]}>
          <T w="x" size={12} numberOfLines={1}>{line}</T>
        </Slice>
      )}
    </Pressable>
  );
}

export default function HomeScreen({ go, openShop, openNotice, openCamera, width }: ScreenProps) {
  const { state, now, todayKey, pet } = useGame();
  const pad = useTabPad();

  const ownedIds = useMemo(() => CATS.map((c) => c.id).filter((id) => state.owned[id]), [state.owned]);
  // お気に入り → 最近迎えた順に部屋へ
  const roomCats = useMemo(() => {
    const byRecent = [...ownedIds].sort((a, b) => state.owned[b].firstDay.localeCompare(state.owned[a].firstDay));
    const fav = state.favorites.filter((f) => state.owned[f]);
    return [...fav, ...byRecent.filter((id) => !fav.includes(id))].slice(0, SLOTS.length);
  }, [ownedIds, state.owned, state.favorites]);

  const roomH = width * 1.25;
  const half = (width - 32 - 10) / 2;
  const waiting = state.days[todayKey] && !state.days[todayKey].freePick;
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 + pad }}>
      <Header onShop={openShop} onBell={() => openNotice()} />
      <View style={s.pills}>
        <InfoPill style={{ flex: 1 }} icon="icon/cat-head" label="所持" value={`${ownedIds.length}/${CATS.length}`} onPress={() => go('zukan')} />
        <InfoPill
          style={{ flex: 1.25 }}
          icon="icon/calendar-today"
          label="今日の出会い"
          value={waiting ? '受け取れます' : `あと${Math.floor(mins / 60)}時間`}
          onPress={() => go('deai')}
        />
      </View>

      <View style={{ width, height: roomH, marginTop: -20, overflow: 'hidden' }}>
        <Backdrop name="bg/room-home" />
        {roomCats.length === 0 && (
          <View style={s.empty}>
            <T w="b" size={14} style={{ textAlign: 'center' }}>まだ誰もいません{'\n'}「出会い」から猫モビーを迎えましょう</T>
          </View>
        )}
        {roomCats.map((id, i) => {
          const slot = SLOTS[i];
          return (
            <View key={id} style={{ position: 'absolute', left: width * slot.x, top: roomH * slot.y, zIndex: Math.round(slot.y * 100 + slot.s * 10) }}>
              <RoomCat id={id} size={width * slot.s} delay={i * 260} onPet={pet} />
            </View>
          );
        })}
        <Pressable style={s.camera} onPress={openCamera} accessibilityLabel="さつえい">
          <Pic name="button/camera-round" height={84} />
          <T w="x" size={12} style={s.cameraLabel}>さつえい</T>
        </Pressable>
      </View>

      <View style={s.cards}>
        <Card style={{ width: half, minHeight: 190 }}>
          <Pic name="brand/title-travel" height={30} />
          <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>世界に1匹だけの旅猫が、いつかあなたのもとへ</T>
          <ImgButton label="旅の様子" height={38} onPress={() => go('world')} style={{ marginTop: 'auto', width: 120 }} />
        </Card>
        <Card style={{ width: half, minHeight: 190 }}>
          <Pic name="brand/title-kyou" height={26} />
          <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>{mood(now.getHours(), roomCats.length)}</T>
          {state.petCount > 0 && <T w="b" size={11} style={{ marginTop: 4 }}>なでた回数 {state.petCount}回</T>}
          <Polaroid width={half * 0.48} style={{ alignSelf: 'flex-end', marginTop: 'auto', transform: [{ rotate: '4deg' }] }}>
            {roomCats[0] ? <CatImage id={roomCats[0]} size={half * 0.4} /> : <Pic name="icon/paw" height={30} />}
          </Polaroid>
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, zIndex: 2 },
  empty: { position: 'absolute', left: 0, right: 0, top: '40%', alignItems: 'center' },
  bubble: { position: 'absolute', top: -40, width: 120, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  heart: { position: 'absolute', top: 0 },
  camera: { position: 'absolute', right: 14, bottom: 20, alignItems: 'center', zIndex: 200 },
  cameraLabel: { marginTop: -4, textShadowColor: '#fff', textShadowRadius: 6 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -6 },
});

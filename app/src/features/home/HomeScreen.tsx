import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { upcoming } from '../../core/conditions';
import { daysBetween } from '../../core/dates';
import { homeSlotsOf, useGame } from '../../core/game';
import HomeSelect from './HomeSelect';
import { playSfx } from '../../services/audio';
import { hapticLight } from '../../services/haptics';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { Card, Header, Well, useTabPad, Tap } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';
import { TourAnchor } from '../../ui/TourAnchor';
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

// 旅猫の今いる場所（仮）。あとで「全員共通の静的JSON」を1日1回読む形に置き換える
const TRAVELER = { flag: '📍', country: 'ポルトガル', city: 'リスボン', day: 12 };

function RoomCat({ id, size, delay, onPet }: { id: string; size: number; delay: number; onPet: () => void }) {
  const hop = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const [line, setLine] = useState<string | null>(null);
  const tap = () => {
    onPet();
    playSfx('sfx_pet');
    hapticLight();
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
    <Tap sfx={null} onPress={tap} accessibilityLabel={`${CAT_BY_ID[id].name}をなでる`}>
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
    </Tap>
  );
}

export default function HomeScreen({ go, openShop, openSettings, openLoginRecord, openNotice, openCamera, width }: ScreenProps) {
  const { state, todayKey, pet } = useGame();
  const pad = useTabPad();

  const roomSlots = useMemo(() => homeSlotsOf(state), [state.owned, state.homeSlots]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selecting, setSelecting] = useState(false);

  // 画面が縦に長いときは、カードの下に余白ができないよう部屋を伸ばす（flex で余りを部屋に回す。背景は cover）
  const [roomH, setRoomH] = useState(width * 1.25);
  // 通知の「これから」の、いちばん近い予告（暦や月で決まる特別な猫）
  const next = useMemo(() => upcoming(todayKey, 30, state.birthday)[0], [todayKey, state.birthday]);
  const nextCat = next?.cats[0];
  const nextOwned = !!nextCat && !!state.owned[nextCat.id];
  const nextRare = nextCat ? (CAT_BY_ID[nextCat.id].rarity >= 4 ? 'でんせつの' : CAT_BY_ID[nextCat.id].rarity === 3 ? 'レアな' : '特別な') : '';
  const nextDay = (() => {
    if (!next) return '';
    if (daysBetween(todayKey, next.day) <= 1) return 'あした';
    const [, m, d] = next.day.split('-').map(Number);
    return `${m}/${d}`;
  })();

  return (
    <View style={{ flex: 1 }}>
    <Backdrop name="bg/room-home-full" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + pad }}>
      <View style={{ zIndex: 2 }}>
      <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
      <View style={{ paddingHorizontal: 14, flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
        <Tap style={{ flex: 1 }} onPress={() => go('world')} accessibilityLabel="旅するモビーの様子">
          <Card style={s.travel}>
            <View>
              <Pic name="brand/title-travel" height={24} />
              <T w="m" size={10} color={C.sub} style={{ marginTop: 2 }}>いま、ここにいるよ</T>
            </View>
            <T size={28}>{TRAVELER.flag}</T>
            <View style={{ flex: 1 }}>
              <T w="x" size={15} numberOfLines={1}>{TRAVELER.country}</T>
              <T w="m" size={11} color={C.sub} numberOfLines={1}>{TRAVELER.city}・旅{TRAVELER.day}日目</T>
            </View>
            <Pic name="icon/chevron-right" height={14} />
          </Card>
        </Tap>
        <Tap onPress={() => setSelecting(true)} accessibilityLabel="ホームに出す子をえらぶ">
          <Card style={s.pick}>
            <Pic name="icon/cat-head" height={28} />
            <T w="x" size={10}>ホームの子</T>
          </Card>
        </Tap>
      </View>
      </View>

      <TourAnchor id="home-room" style={{ width, minHeight: width * 1.25, maxHeight: width * 1.6, flexGrow: 1, marginTop: 4, overflow: 'hidden' }} onLayout={(e) => setRoomH(e.nativeEvent.layout.height)}>
        {roomSlots.every((id) => !id) && (
          <View style={s.empty}>
            <T w="b" size={14} style={{ textAlign: 'center' }}>まだ誰もいません{'\n'}「出会い」からにゃこモビーを迎えましょう</T>
          </View>
        )}
        {roomSlots.map((id, i) => {
          if (!id) return null;
          const slot = SLOTS[i];
          return (
            <View key={id} style={{ position: 'absolute', left: width * slot.x, top: roomH * slot.y, zIndex: Math.round(slot.y * 100 + slot.s * 10) }}>
              <RoomCat id={id} size={width * slot.s} delay={i * 260} onPet={pet} />
            </View>
          );
        })}
        <Tap style={s.loginBtn} onPress={openLoginRecord} accessibilityLabel="ログイン記録">
          <Pic name="button/login-record-round" height={52} />
          <T w="x" size={10} style={s.cameraLabel}>ログイン記録</T>
        </Tap>
      </TourAnchor>

      <View style={s.bottom}>
        {/* 通知の「これから」から、いちばん近い予告を1つ。押すと一覧が開く */}
        <Tap style={{ flex: 1 }} onPress={() => openNotice('upcoming')} accessibilityLabel="これから会えるかもしれない猫">
          <Card style={s.upcoming}>
            <Well style={{ width: 64, height: 64 }}>
              {nextCat ? <CatImage id={nextCat.id} size={58} silhouette={!nextOwned} /> : <Pic name="cat/silhouette-locked" width={48} />}
            </Well>
            <View style={{ flex: 1 }}>
              {nextCat ? (
                <T w="x" size={14} style={{ lineHeight: 20 }}>
                  {nextOwned ? `${nextDay}に${CAT_BY_ID[nextCat.id].name}に会えるかも！` : `${nextDay}に出会えるかもしれない${nextRare}にゃこモビー！？`}
                </T>
              ) : (
                <T w="b" size={12} color={C.sub}>30日先までは、特別なにゃこモビーの予告はありません</T>
              )}
            </View>
            <Pic name="icon/chevron-right" height={14} />
          </Card>
        </Tap>
        <Tap style={s.camera} onPress={openCamera} accessibilityLabel="さつえい">
          <Pic name="button/camera-round" height={84} />
          <T w="x" size={12} style={s.cameraLabel}>さつえい</T>
        </Tap>
      </View>
    </ScrollView>
    <HomeSelect visible={selecting} onClose={() => setSelecting(false)} width={width} />
    </View>
  );
}

const s = StyleSheet.create({
  empty: { position: 'absolute', left: 0, right: 0, top: '40%', alignItems: 'center' },
  bubble: { position: 'absolute', top: -40, width: 120, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  heart: { position: 'absolute', top: 0 },
  camera: { alignItems: 'center' },
  loginBtn: { position: 'absolute', right: 14, top: 40, alignItems: 'center', zIndex: 200 },
  cameraLabel: { marginTop: -4, textShadowColor: '#fff', textShadowRadius: 6 },
  pick: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 10, minWidth: 72 },
  travel: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 2 },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 96 },
});

import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { CATS } from '../../data/catalog';
import { msUntilNextReveal } from '../../core/encounter';
import { useGame } from '../../core/game';
import { playSfx } from '../../services/audio';
import { hapticLight } from '../../services/haptics';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { Card, Header, InfoPill, useTabPad, Tap } from '../../ui/kit';
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

export default function HomeScreen({ go, openShop, openSettings, openNotice, openCamera, width }: ScreenProps) {
  const { state, now, todayKey, pet } = useGame();
  const pad = useTabPad();

  const ownedIds = useMemo(() => CATS.map((c) => c.id).filter((id) => state.owned[id]), [state.owned]);
  // お気に入り → 最近迎えた順に部屋へ
  const roomCats = useMemo(() => {
    const byRecent = [...ownedIds].sort((a, b) => state.owned[b].firstDay.localeCompare(state.owned[a].firstDay));
    const fav = state.favorites.filter((f) => state.owned[f]);
    return [...fav, ...byRecent.filter((id) => !fav.includes(id))].slice(0, SLOTS.length);
  }, [ownedIds, state.owned, state.favorites]);

  // 画面が縦に長いときは、カードの下に余白ができないよう部屋を伸ばす（背景は cover なので絵は切れない範囲に抑える）
  const [vh, setVh] = useState(0);
  const [topH, setTopH] = useState(0);
  const CARDS_H = 128 - 6 + 16 + 24; // カードの高さ＋上の食い込み＋カードの下の余白＋下端の余白
  const roomH = Math.min(width * 1.5, Math.max(width * 1.25, vh - pad - topH - CARDS_H + 20));
  const half = (width - 32 - 10) / 2;
  const waiting = state.days[todayKey] && !state.days[todayKey].freePick;
  // 今日の候補に条件を満たした特別な猫がいれば、そのシルエット。いなければふつうの猫のシルエット
  const today = state.days[todayKey];
  const special = today?.candidates.find((id) => today.reasons[id]);
  const shownOwned = !!special && !!state.owned[special];
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);

  return (
    <ScrollView onLayout={(e) => setVh(e.nativeEvent.layout.height)} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 + pad }}>
      <View style={{ zIndex: 2 }} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
      <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
      <View style={s.pills}>
        <InfoPill style={{ flex: 1 }} icon="icon/cat-head" label="所持" value={`${ownedIds.length}/${CATS.length}`} onPress={() => go('zukan')} />
        <TourAnchor id="home-deai" style={{ flex: 1.25 }}>
          <InfoPill
            icon="icon/calendar-today"
            label="今日の出会い"
            value={waiting ? '受け取れます' : `あと${Math.floor(mins / 60)}時間`}
            onPress={() => go('deai')}
          />
        </TourAnchor>
      </View>

      </View>

      <TourAnchor id="home-room" style={{ width, height: roomH, marginTop: -20, overflow: 'hidden' }}>
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
        <Tap style={s.camera} onPress={openCamera} accessibilityLabel="さつえい">
          <Pic name="button/camera-round" height={84} />
          <T w="x" size={12} style={s.cameraLabel}>さつえい</T>
        </Tap>
      </TourAnchor>

      <View style={s.cards}>
        <Tap style={{ width: half }} onPress={() => go('world')} accessibilityLabel="旅するモビーの様子">
          <Card style={s.card}>
            <Pic name="brand/title-travel" height={26} />
            <T w="m" size={11} color={C.sub} style={{ marginTop: 6 }}>いま、ここにいるよ</T>
            <View style={s.where}>
              <T size={30}>{TRAVELER.flag}</T>
              <View style={{ flex: 1 }}>
                <T w="x" size={15} numberOfLines={1}>{TRAVELER.country}</T>
                <T w="m" size={11} color={C.sub} numberOfLines={1}>{TRAVELER.city}・旅{TRAVELER.day}日目</T>
              </View>
            </View>
          </Card>
        </Tap>
        <Tap style={{ width: half }} onPress={() => go('deai')} accessibilityLabel="今日出会えるかもしれない猫">
          <Card style={s.card}>
            <T w="x" size={14}>今日の出会い</T>
            <T w="m" size={11} color={special ? C.accent : C.sub} style={{ marginTop: 6 }}>
              {special ? '✦ とくべつな子が…？' : 'どんな子が来るかな？'}
            </T>
            <View style={s.sil}>
              {special && shownOwned ? <CatImage id={special} size={64} /> : <Pic name="cat/silhouette-locked" width={64} />}
              {special && <T size={16} color={C.accent} style={s.spark}>✦</T>}
            </View>
          </Card>
        </Tap>
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
  card: { height: 128, alignItems: 'flex-start' },
  where: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
  sil: { position: 'absolute', right: 6, bottom: 4 },
  spark: { position: 'absolute', right: -4, top: -4 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -6 },
});

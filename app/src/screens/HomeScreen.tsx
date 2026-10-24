import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CATS } from '../data/catalog';
import { REVEAL_HOUR } from '../lib/encounter';
import { useGame } from '../state/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../ui/base';
import { Card, Header, ImgButton, InfoPill, Polaroid } from '../ui/kit';
import { Pic } from '../ui/Slice';
import { ScreenProps } from './types';

// 部屋の中の猫の置き場所（部屋画像に対する割合）。手前ほど大きい
const SLOTS = [
  { x: 0.26, y: 0.5, s: 0.42 }, // ラグの上（手前中央）
  { x: 0.6, y: 0.52, s: 0.34 }, // クッションの上
  { x: 0.06, y: 0.33, s: 0.3 }, // ソファ
  { x: 0.34, y: 0.28, s: 0.28 }, // 窓辺
  { x: 0.66, y: 0.2, s: 0.24 }, // キャットタワー
  { x: 0.02, y: 0.5, s: 0.3 },
];

export default function HomeScreen({ go, openShop, width }: ScreenProps) {
  const { state } = useGame();
  const [talk, setTalk] = useState<string | null>(null);

  const ownedIds = useMemo(() => CATS.map((c) => c.id).filter((id) => state.owned[id]), [state.owned]);
  // お気に入り → 最近迎えた順に部屋へ
  const roomCats = useMemo(() => {
    const byRecent = [...ownedIds].sort((a, b) => state.owned[b].firstDay.localeCompare(state.owned[a].firstDay));
    const fav = state.favorites.filter((f) => state.owned[f]);
    return [...fav, ...byRecent.filter((id) => !fav.includes(id))].slice(0, SLOTS.length);
  }, [ownedIds, state.owned, state.favorites]);

  const roomH = width * (1900 / 1179);
  const half = (width - 32 - 10) / 2;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header onShop={openShop} onBell={openShop} />
      <View style={s.pills}>
        <InfoPill style={{ flex: 1 }} icon="icon/cat-head" label="所持" value={`${ownedIds.length}/${CATS.length}`} onPress={() => go('zukan')} />
        <InfoPill style={{ flex: 1.25 }} icon="icon/calendar-today" label="今日の出会い" value={`${REVEAL_HOUR}:00`} onPress={() => go('deai')} />
      </View>

      <View style={{ width, height: roomH, marginTop: -20 }}>
        <Pic name="bg/room-home" width={width} style={StyleSheet.absoluteFill} />
        {roomCats.length === 0 && (
          <View style={s.empty}>
            <T w="b" size={14} style={{ textAlign: 'center' }}>まだ誰もいません{'\n'}「出会い」から猫モビーを迎えましょう</T>
          </View>
        )}
        {roomCats.map((id, i) => {
          const slot = SLOTS[i];
          const size = width * slot.s;
          return (
            <Pressable
              key={id}
              style={{ position: 'absolute', left: width * slot.x, top: roomH * slot.y, zIndex: Math.round(slot.y * 100) }}
              onPress={() => setTalk(talk === id ? null : id)}
            >
              <Pic name="camera/shadow-soft" width={size * 0.9} style={{ position: 'absolute', left: size * 0.05, top: size * 0.82 }} />
              <Bobbing delay={i * 260}>
                <CatImage id={id} size={size} />
              </Bobbing>
              {talk === id && (
                <View style={[s.bubble, { left: size * 0.2 }]}>
                  <T w="x" size={12}>{CAT_BY_ID[id].name}「にゃ！」</T>
                </View>
              )}
            </Pressable>
          );
        })}
        <Pressable style={s.camera} onPress={() => Alert.alert('さつえい', '撮影機能は次の段階で実装予定です')}>
          <Pic name="button/camera-round" height={84} />
          <T w="x" size={12} style={s.cameraLabel}>さつえい</T>
        </Pressable>
      </View>

      <View style={s.cards}>
        <Card style={{ width: half, minHeight: 190 }}>
          <Pic name="brand/title-travel" height={30} />
          <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>いろんな場所で{'\n'}新しい出会いが{'\n'}待っています</T>
          <ImgButton label="旅に出る ›" height={38} onPress={() => go('world')} style={{ marginTop: 'auto', width: 120 }} />
        </Card>
        <Card style={{ width: half, minHeight: 190 }}>
          <T w="x" size={17}>きょうのようす</T>
          <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>
            {roomCats.length ? 'みんなのんびりしています' : '部屋はまだしずかです'}
          </T>
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
  bubble: { position: 'absolute', top: -14, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: C.line },
  camera: { position: 'absolute', right: 14, bottom: 20, alignItems: 'center', zIndex: 200 },
  cameraLabel: { marginTop: -4, textShadowColor: '#fff', textShadowRadius: 6 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -6 },
});

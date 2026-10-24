import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATS } from '../data/catalog';
import { useGame } from '../state/game';
import { Bobbing, C, CAT_BY_ID, CatImage } from '../ui';

// 所有猫が暮らす猫部屋。タップでぴょんと反応する。
export default function HomeScreen() {
  const { state } = useGame();
  const ids = useMemo(() => CATS.map((c) => c.id).filter((id) => state.owned[id]), [state.owned]);
  const [msg, setMsg] = useState('');

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>猫部屋</Text>
      <Text style={s.sub}>{ids.length === 0 ? 'まだ誰もいません。「今日の出会い」から迎えましょう' : `${ids.length}種類の猫モビーが暮らしています`}</Text>
      <View style={s.room}>
        {ids.map((id, i) => (
          <Pressable key={id} onPress={() => setMsg(`${CAT_BY_ID[id].name}「にゃ！」×${state.owned[id].count}`)}>
            <Bobbing delay={(i % 5) * 220}>
              <CatImage id={id} size={96} />
            </Bobbing>
          </Pressable>
        ))}
      </View>
      {!!msg && <Text style={s.msg}>{msg}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  sub: { color: C.sub, marginTop: 4, marginBottom: 12 },
  room: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, backgroundColor: '#FDEBD8', borderRadius: 20, padding: 12, minHeight: 240 },
  msg: { textAlign: 'center', color: C.ink, marginTop: 12, fontWeight: '700' },
});

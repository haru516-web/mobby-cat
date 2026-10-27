import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HOME_SLOTS, homeSlotsOf, useGame } from '../../core/game';
import { C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { ImgButton, Tap } from '../../ui/kit';
import { Popup } from '../../ui/Popup';
import { Pic, Slice } from '../../ui/Slice';

// ホームに出す猫を、1〜6番目の場所ごとに選ぶ。1番目が手前の大きい場所。
// 選んでいなければ、入手した順に6体まで（お気に入りは関係しない）
export default function HomeSelect({ visible, onClose, width }: { visible: boolean; onClose: () => void; width: number }) {
  const { state, setHomeSlots } = useGame();
  const slots = homeSlotsOf(state);
  const [sel, setSel] = useState(0); // 選んでいる場所（0〜5）
  const owned = useMemo(() => Object.keys(state.owned), [state.owned]); // 入手した順
  const cell = Math.floor((Math.min(width - 24, 400) - 28 - 3 * 8) / 4);
  const slotW = Math.floor((Math.min(width - 24, 400) - 28 - 5 * 6) / 6);
  const auto = state.homeSlots === null;

  const assign = (id: string) => {
    const next = [...slots];
    const from = next.indexOf(id);
    const old = next[sel];
    if (from >= 0) next[from] = old; // すでに別の場所にいる子は、入れ替える
    next[sel] = id;
    setHomeSlots(next);
    setSel(Math.min(HOME_SLOTS - 1, sel + 1)); // 次の場所へ進む
  };
  const clear = () => {
    const next = [...slots];
    next[sel] = null;
    setHomeSlots(next);
  };

  return (
    <Popup visible={visible} onClose={onClose} maxWidth={400} heightRatio={0.84}>
      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T w="x" size={18} style={{ flex: 1 }}>ホームに出す子</T>
          <Tap onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Tap>
        </View>
        <T w="m" size={11} color={C.sub}>
          場所の番号を選んで、下の子をタップします。1番は手前の大きい場所です。{auto ? '（いまは、入手した順に出しています）' : ''}
        </T>

        {/* 1〜6番目の場所 */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {slots.map((id, i) => (
            <Tap key={i} style={{ width: slotW, alignItems: 'center' }} onPress={() => setSel(i)} accessibilityLabel={`${i + 1}番目の場所`}>
              <View style={{ width: slotW, height: slotW }}>
                <Pic name={sel === i ? 'panel/card-selected' : 'panel/photo-well'} width={slotW} style={StyleSheet.absoluteFill} />
                <View style={s.center}>{id ? <CatImage id={id} size={slotW - 8} /> : <T w="m" size={11} color={C.sub}>なし</T>}</View>
              </View>
              <T w="x" size={12} color={sel === i ? C.accent : C.sub}>{i + 1}</T>
            </Tap>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ImgButton skin="ghost-outline" label={`${sel + 1}番を空ける`} height={36} fontSize={12} disabled={!slots[sel]} onPress={clear} style={{ flex: 1 }} />
          <ImgButton skin="ghost-outline" label="入手した順にもどす" height={36} fontSize={12} disabled={auto} onPress={() => setHomeSlots(null)} style={{ flex: 1 }} />
        </View>

        {/* 持っている子（入手した順）。いまの場所の番号が付く */}
        <T w="x" size={13} style={{ marginTop: 2 }}>{sel + 1}番に置く子をえらんでね</T>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
          {owned.map((id) => {
            const at = slots.indexOf(id);
            return (
              <Tap key={id} style={{ width: cell }} onPress={() => assign(id)} accessibilityLabel={CAT_BY_ID[id].name}>
                <View style={{ width: cell, height: cell }}>
                  <Pic name={at === sel ? 'panel/card-selected' : 'panel/photo-well'} width={cell} style={StyleSheet.absoluteFill} />
                  <View style={s.center}><CatImage id={id} size={cell - 10} /></View>
                  {at >= 0 && (
                    <Slice name="badge/owned-count" style={s.no}>
                      <T w="x" size={10} color={C.accent}>{at + 1}番</T>
                    </Slice>
                  )}
                </View>
              </Tap>
            );
          })}
        </ScrollView>
      </View>
    </Popup>
  );
}

const s = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  no: { position: 'absolute', right: 2, top: 2, height: 18, minWidth: 34, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});

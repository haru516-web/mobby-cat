import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { disableDailyNotification, enableDailyNotification } from '../lib/notify';
import { useGame } from '../state/game';
import { Btn, C } from '../ui';

// 価格は設計書の仮値。実課金（StoreKit/RevenueCat等）は未接続で、購入ボタンは開発用の無料付与。
const ITEMS = [
  { key: 'ticket', n: 1, name: 'お迎え券 1枚', price: '¥160', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket', n: 3, name: 'お迎え券 3枚', price: '¥320', desc: 'まとめ買い' },
  { key: 'ticket', n: 10, name: 'お迎え券 10枚', price: '¥800', desc: 'お得なまとめ買い' },
  { key: 'matatabi', n: 1, name: 'またたび 1個', price: '¥120', desc: '今日の出会いの候補が1匹増えます（最大6匹）' },
] as const;

export default function ShopScreen() {
  const g = useGame();
  const { state } = g;

  const toggleNotify = async (v: boolean) => {
    if (v) {
      const ok = await enableDailyNotification();
      if (!ok) return Alert.alert('通知が許可されていません', '通知なしでもアプリ内から出会えます');
      g.setNotify(true);
    } else {
      await disableDailyNotification();
      g.setNotify(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>ショップ</Text>
      <Text style={s.sub}>お迎え券 {state.tickets}枚 ／ またたび {state.matatabi}個</Text>

      {ITEMS.map((it) => (
        <View key={it.name} style={s.item}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{it.name}</Text>
            <Text style={s.desc}>{it.desc}</Text>
          </View>
          <View style={{ width: 120 }}>
            <Btn label={`${it.price}（テスト）`} onPress={() => g.grant(it.key, it.n)} />
          </View>
        </View>
      ))}
      <Text style={s.note}>※ 実際の課金は未接続です。ボタンは開発用に無料で付与します。</Text>

      <Text style={s.h2}>設定</Text>
      <View style={s.item}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>毎日20:00に通知</Text>
          <Text style={s.desc}>通知なしでもアプリ内から受け取れます</Text>
        </View>
        <Switch value={state.notifyEnabled} onValueChange={toggleNotify} />
      </View>

      <Text style={s.h2}>開発用</Text>
      <View style={{ gap: 8 }}>
        <Btn kind="ghost" label={`日付を1日進める（+${state.debugOffsetDays}日）`} onPress={() => g.shiftDays(1)} />
        <Btn kind="ghost" label="日付をリセット" onPress={() => g.shiftDays(-state.debugOffsetDays)} />
        <Btn kind="ghost" label="全データを初期化" onPress={() => Alert.alert('初期化', 'すべての猫と所持品が消えます', [{ text: 'キャンセル', style: 'cancel' }, { text: '初期化', style: 'destructive', onPress: g.reset }])} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  h2: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 8 },
  sub: { color: C.sub, marginTop: 4, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 8 },
  name: { fontWeight: '800', color: C.ink },
  desc: { color: C.sub, fontSize: 12, marginTop: 2 },
  note: { color: C.sub, fontSize: 11 },
});

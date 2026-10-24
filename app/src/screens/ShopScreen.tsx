import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { disableDailyNotification, enableDailyNotification } from '../lib/notify';
import { useGame } from '../state/game';
import { C, T } from '../ui/base';
import { Card, Icon, ImgButton } from '../ui/kit';

// 価格は設計書の仮値。実課金（StoreKit 等）は未接続で、購入ボタンは開発用の無料付与。
const ITEMS = [
  { key: 'ticket', n: 1, icon: 'icon/ticket-paw', name: 'お迎え券 1枚', price: '¥160', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket', n: 3, icon: 'icon/ticket-paw', name: 'お迎え券 3枚', price: '¥320', desc: 'まとめ買い' },
  { key: 'ticket', n: 10, icon: 'icon/ticket-paw', name: 'お迎え券 10枚', price: '¥800', desc: 'お得なまとめ買い' },
  { key: 'matatabi', n: 1, icon: 'icon/matatabi-leaf', name: 'またたび 1個', price: '¥120', desc: '今日の出会いの候補が1匹増えます（最大6匹）' },
] as const;

export default function ShopScreen({ onClose }: { onClose: () => void }) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T w="x" size={26} style={{ flex: 1 }}>ショップ</T>
        <ImgButton skin="ghost-outline" label="閉じる" height={38} onPress={onClose} style={{ width: 100 }} />
      </View>
      <T w="b" size={13} color={C.sub} style={{ marginTop: 4, marginBottom: 12 }}>お迎え券 {state.tickets}枚 ／ またたび {state.matatabi}個</T>

      {ITEMS.map((it) => (
        <Card key={it.name} style={s.item}>
          <Icon name={it.icon} size={40} />
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>{it.name}</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>{it.desc}</T>
          </View>
          <ImgButton label={it.price} height={40} onPress={() => g.grant(it.key, it.n)} style={{ width: 100 }} />
        </Card>
      ))}
      <T w="m" size={11} color={C.sub}>※ テスト版：実際の課金は未接続です。価格のボタンを押すと開発用に無料で付与します。</T>

      <T w="x" size={18} style={s.h2}>設定</T>
      <Card style={s.item}>
        <View style={{ flex: 1 }}>
          <T w="x" size={14}>毎日20:00に通知</T>
          <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>通知なしでもアプリ内から受け取れます</T>
        </View>
        <Switch value={state.notifyEnabled} onValueChange={toggleNotify} />
      </Card>

      <T w="x" size={18} style={s.h2}>開発用</T>
      <View style={{ gap: 8 }}>
        <ImgButton skin="ghost-outline" label={`日付を1日進める（+${state.debugOffsetDays}日）`} height={44} onPress={() => g.shiftDays(1)} />
        <ImgButton skin="ghost-outline" label="日付をリセット" height={44} onPress={() => g.shiftDays(-state.debugOffsetDays)} />
        <ImgButton
          skin="ghost-outline"
          label="全データを初期化"
          height={44}
          onPress={() => Alert.alert('初期化', 'すべての猫と所持品が消えます', [{ text: 'キャンセル', style: 'cancel' }, { text: '初期化', style: 'destructive', onPress: g.reset }])}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h2: { marginTop: 24, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
});

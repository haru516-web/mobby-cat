import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { notice } from '../../services/dialog';
import { useGame } from '../../core/game';
import { C, T } from '../../ui/base';
import { Card, Icon, ImgButton, Tap, withSfx } from '../../ui/kit';
import { Backdrop, Pic } from '../../ui/Slice';

// 価格は設計書の仮値。実課金（StoreKit 等）は未接続で、購入ボタンは開発用の無料付与。
const ITEMS = [
  { key: 'ticket', n: 1, icon: 'icon/ticket-paw', name: 'お迎え券 1枚', price: '¥160', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket', n: 3, icon: 'icon/ticket-paw', name: 'お迎え券 3枚', price: '¥320', desc: 'まとめ買い' },
  { key: 'ticket', n: 10, icon: 'icon/ticket-paw', name: 'お迎え券 10枚', price: '¥800', desc: 'お得なまとめ買い' },
  { key: 'matatabi', n: 1, icon: 'icon/matatabi-leaf', name: 'またたび 1個', price: '¥120', desc: '今日の候補が1匹ふえます（最大6匹）。またたびパス加入中は、はじめから6匹です' },
] as const;

const PASS_BONUS_LABEL = 3;

export default function ShopScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { state } = g;
  const [odds, setOdds] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-shop" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pic name="brand/title-shop" height={40} />
          <View style={{ flex: 1 }} />
          <Tap onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Tap>
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
        <Card style={[s.item, { alignItems: 'flex-start' }]}>
          <Icon name="icon/matatabi-bag" size={44} />
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>またたびパス（月額 ¥480）</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>
              加入中は毎日の候補が3匹から{3 + PASS_BONUS_LABEL}匹にふえて、毎月お迎え券が3枚届きます。いつでも解約でき、解約後も迎えた猫はそのまま残ります
            </T>
          </View>
          <ImgButton
            skin={state.pass.active ? 'ghost-outline' : 'primary-green'}
            label={state.pass.active ? '加入中' : '加入'}
            height={40}
            onPress={() => g.setPass(!state.pass.active)}
            style={{ width: 84 }}
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ImgButton skin="ghost-outline" label="出会いの仕組み" height={40} fontSize={13} onPress={() => setOdds(true)} style={{ flex: 1 }} />
          <ImgButton
            skin="ghost-outline"
            label="購入を復元"
            height={40}
            fontSize={13}
            onPress={() => notice('購入の復元', 'テスト版では実際の購入がないため、復元するものはありません')}
            style={{ flex: 1 }}
          />
        </View>
        {odds && (
          <Card skin="white" style={{ marginTop: 8, gap: 6 }}>
            <T w="x" size={13}>またたびで増える候補について</T>
            <T w="m" size={11} color={C.sub}>
              今日の候補は、その日に出会いの条件がすべてそろった猫だけです。またたびやお迎え券で、条件を飛ばして猫を迎えることはできません。またたびは、条件がそろった猫が多い日に、隠れていた候補を見せます（最大6匹）。
            </T>
            <T w="b" size={11} color={C.accent} onPress={withSfx(() => setOdds(false))}>閉じる</T>
          </Card>
        )}
        <T w="m" size={11} color={C.sub} style={{ marginTop: 8 }}>※ テスト版：実際の課金は未接続です。価格のボタンを押すと無料で付与します。</T>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
});

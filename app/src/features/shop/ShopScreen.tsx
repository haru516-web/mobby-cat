import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { rarityOdds } from '../../core/encounter';
import { disableDailyNotification, enableDailyNotification } from '../../services/notify';
import { useGame } from '../../core/game';
import { C, T } from '../../ui/base';
import { Card, Icon, ImgButton, Toggle } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';

// 価格は設計書の仮値。実課金（StoreKit 等）は未接続で、購入ボタンは開発用の無料付与。
const ITEMS = [
  { key: 'ticket', n: 1, icon: 'icon/ticket-paw', name: 'お迎え券 1枚', price: '¥160', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket', n: 3, icon: 'icon/ticket-paw', name: 'お迎え券 3枚', price: '¥320', desc: 'まとめ買い' },
  { key: 'ticket', n: 10, icon: 'icon/ticket-paw', name: 'お迎え券 10枚', price: '¥800', desc: 'お得なまとめ買い' },
  { key: 'matatabi', n: 1, icon: 'icon/matatabi-leaf', name: 'またたび 1個', price: '¥120', desc: '今日の出会いの候補が1匹増えます（最大6匹）' },
] as const;

const PASS_BONUS_LABEL = 3;
const RARITY_NAME: Record<number, string> = { 1: 'ノーマル', 2: 'ノーマル+', 3: 'レア', 4: 'でんせつ' };
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DAYS_IN =[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function ShopScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { state } = g;
  const bd = state.birthday;
  const [odds, setOdds] = useState(false);

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

  // 誕生日は月・日だけを端末内に保存する（年は持たない）
  const stepBirthday = (part: 'm' | 'd', delta: number) => {
    const cur = bd ?? { m: 1, d: 1 };
    let m = cur.m, d = cur.d;
    if (part === 'm') m = ((m - 1 + delta + 12) % 12) + 1;
    else d = ((d - 1 + delta + DAYS_IN[m - 1]) % DAYS_IN[m - 1]) + 1;
    g.setBirthday({ m, d: Math.min(d, DAYS_IN[m - 1]) });
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-shop" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pic name="brand/title-shop" height={40} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Pressable>
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
              加入中は毎日の出会いが{PASS_BONUS_LABEL}匹ふえて、毎月お迎え券が3枚届きます。いつでも解約でき、解約後も迎えた猫はそのまま残ります
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
          <ImgButton skin="ghost-outline" label="出現確率" height={40} fontSize={13} onPress={() => setOdds(true)} style={{ flex: 1 }} />
          <ImgButton
            skin="ghost-outline"
            label="購入を復元"
            height={40}
            fontSize={13}
            onPress={() => Alert.alert('購入の復元', 'テスト版では実際の購入がないため、復元するものはありません')}
            style={{ flex: 1 }}
          />
        </View>
        {odds && (
          <Card skin="white" style={{ marginTop: 8, gap: 6 }}>
            <T w="x" size={13}>毎日の出会い・またたびで増える候補の出現確率</T>
            {rarityOdds().map((o) => (
              <View key={o.rarity} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T w="b" size={12}>{RARITY_NAME[o.rarity]}（{o.count}種）</T>
                <T w="x" size={12}>{o.pct.toFixed(1)}%</T>
              </View>
            ))}
            <T w="m" size={10} color={C.sub}>
              同じレア度の中ではどの子も同じ確率です。まだ持っていない子は1.5倍出やすくなります。条件で出会う「限定」の猫は抽選ではなく、条件を満たした日に必ず候補に入ります。
            </T>
            <T w="b" size={11} color={C.accent} onPress={() => setOdds(false)}>閉じる</T>
          </Card>
        )}
        <T w="m" size={11} color={C.sub} style={{ marginTop: 8 }}>※ テスト版：実際の課金は未接続です。価格のボタンを押すと無料で付与します。</T>

        <Pic name="brand/title-settings" height={32} style={s.h2} />
        <Card style={s.item}>
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>毎日20:00に通知</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>通知なしでもアプリ内から受け取れます</T>
          </View>
          <Toggle value={state.notifyEnabled} onChange={toggleNotify} />
        </Card>
        <Card style={s.item}>
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>誕生日</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>その日に特別な猫が来ます。端末の中だけに保存します</T>
          </View>
          {bd ? (
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Stepper label={`${bd.m}月`} onMinus={() => stepBirthday('m', -1)} onPlus={() => stepBirthday('m', 1)} />
              <Stepper label={`${bd.d}日`} onMinus={() => stepBirthday('d', -1)} onPlus={() => stepBirthday('d', 1)} />
              <T w="b" size={11} color={C.sub} onPress={() => g.setBirthday(null)}>登録をやめる</T>
            </View>
          ) : (
            <ImgButton skin="ghost-outline" label="登録する" height={36} fontSize={12} onPress={() => g.setBirthday({ m: 1, d: 1 })} style={{ width: 100 }} />
          )}
        </Card>

        <Card skin="white" style={{ marginTop: 8, gap: 4 }}>
          <T w="x" size={13}>データとプライバシー</T>
          <T w="m" size={11} color={C.sub}>
            歩数・電池の状態・誕生日・撮った写真は、猫との出会いの判定にだけ使い、この端末の中に保存します。外部に送信しません。
          </T>
          <T w="m" size={10} color={C.sub} style={{ marginTop: 4 }}>バージョン {APP_VERSION}</T>
        </Card>

        {__DEV__ && <T w="x" size={16} style={s.h2}>開発用</T>}
        {__DEV__ && <View style={{ gap: 8 }}>
          <ImgButton skin="ghost-outline" label={`日付を1日進める（+${state.debugOffsetDays}日）`} height={44} onPress={() => g.shiftDays(1)} />
          <ImgButton skin="ghost-outline" label="日付をリセット" height={44} onPress={() => g.shiftDays(-state.debugOffsetDays)} />
          <ImgButton skin="ghost-outline" label="全キャラを開放" height={44} onPress={g.unlockAll} />
          <ImgButton
            skin="ghost-outline"
            label="全データを初期化"
            height={44}
            onPress={() => Alert.alert('初期化', 'すべての猫と所持品が消えます', [{ text: 'キャンセル', style: 'cancel' }, { text: '初期化', style: 'destructive', onPress: g.reset }])}
          />
        </View>}
      </ScrollView>
    </View>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <ImgButton skin="ghost-outline" label="−" height={28} fontSize={14} onPress={onMinus} style={{ width: 36 }} />
      <Slice name="button/tab-normal" style={s.stepValue}><T w="x" size={13}>{label}</T></Slice>
      <ImgButton skin="ghost-outline" label="＋" height={28} fontSize={14} onPress={onPlus} style={{ width: 36 }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h2: { marginTop: 24, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepValue: { height: 28, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
});

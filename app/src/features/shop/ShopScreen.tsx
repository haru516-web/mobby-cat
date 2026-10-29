import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAccount } from '../../core/account';
import { matatabiOf, ticketsOf, useGame } from '../../core/game';
import { notice } from '../../services/dialog';
import type { AgeGroup, BuyOutcome } from '../../services/account/purchase';
import { PRODUCTS, type ProductKey } from '../../services/account/products';
import { C, T } from '../../ui/base';
import { useConfirm } from '../../ui/ConfirmPopup';
import { Card, Icon, ImgButton, Tap, withSfx } from '../../ui/kit';
import { Pic } from '../../ui/Slice';
import { AgePopup } from './AgePopup';

// 売る商品。価格は設計書（docs/game-design.md 4.3）のとおり。実際に請求される金額は、App Store が表示する価格。
// またたびは5個セットだけを売る。
const ITEMS: { key: ProductKey; icon: string; name: string; yen: string; desc: string }[] = [
  { key: 'ticket1', icon: 'icon/ticket-paw', name: 'お迎え券 1枚', yen: '¥200', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket6', icon: 'icon/ticket-paw', name: 'お迎え券 6枚', yen: '¥1,000', desc: 'まとめ買い（5枚＋おまけ1枚）' },
  { key: 'matatabi5', icon: 'icon/matatabi-leaf', name: 'またたび 5個セット', yen: '¥300', desc: '1個で今日の候補が1匹ふえます（最大6匹）。またたびパス加入中は、はじめから6匹です' },
];

const PASS_BONUS_LABEL = 3;

// 購入が終わらなかったときに、利用者へ伝える文。取り消し（cancelled）は何も出さない
function failureText(outcome: Extract<BuyOutcome, { ok: false }>): string | null {
  switch (outcome.reason) {
    case 'cancelled':
      return null;
    case 'offline':
      return 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。購入はされていません。';
    case 'verify_failed':
      return '購入の確認ができませんでした。Appleでの支払いが完了している場合もあります。アプリを開き直すと、自動でやり直します。';
    case 'restricted':
      return '返金が続いたため、このアカウントでは、いまは購入をお受けできません。心当たりがない場合は、サポートまでご連絡ください。';
    case 'limit':
      return `今月の購入の上限（${outcome.capYen.toLocaleString('ja-JP')}円）まで、あと${outcome.remainingYen.toLocaleString('ja-JP')}円です。この商品は上限を超えるため、購入できません。上限は、毎月1日にリセットされます。`;
    case 'unavailable':
      return outcome.detail === 'store_module_missing'
        ? 'この環境では購入できません。'
        : 'ストアに接続できませんでした。しばらくしてから、もう一度お試しください。';
    default:
      return '購入できませんでした。もう一度お試しください。';
  }
}

export default function ShopScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const acc = useAccount();
  const { state } = g;
  const [odds, setOdds] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askAge, setAskAge] = useState<ProductKey | null>(null);
  const [confirm, confirmEl] = useConfirm();

  useEffect(() => {
    void acc.loadPrices();
    void acc.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceOf = (key: ProductKey, fallback: string) => acc.prices[PRODUCTS[key].sku] ?? fallback;

  // 購入の前に、Apple 連携と年齢の区分が要る。足りなければ、そこを済ませてから、もう一度購入に進む
  const purchase = async (key: ProductKey): Promise<void> => {
    if (busy) return;
    setBusy(true);
    let outcome: BuyOutcome;
    try {
      outcome = await acc.buy(key);
    } finally {
      setBusy(false);
    }
    if (outcome.ok) {
      notice('購入しました', key === 'pass' ? 'またたびパスに加入しました。' : 'ありがとうございます。');
      return;
    }
    if (outcome.reason === 'apple_needed') {
      confirm(
        'Appleでサインインしてください',
        '購入するには、Appleでのサインインが必要です。サインインすると、購入したものと記録を、機種変更しても引き継げます。名前やメールアドレスは受け取りません。',
        'Appleでサインイン',
        async () => {
          const result = await acc.linkApple();
          if (result === 'ok') return purchase(key);
          if (result === 'in_use') {
            notice('このApple IDは、すでに使われています', '別の記録と結びついています。設定の「アカウント」から、その記録を引き継いでください。');
          } else if (result === 'unavailable') notice('この環境ではサインインできません', 'iPhoneの実機で、Appleにサインインしている状態でお試しください。');
          else if (result === 'offline') notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
          else if (result === 'failed') notice('サインインできませんでした', 'もう一度お試しください。');
        },
        { skin: 'primary-green', cancelLabel: 'やめる' },
      );
      return;
    }
    if (outcome.reason === 'age_needed') {
      setAskAge(key);
      return;
    }
    const text = failureText(outcome);
    if (text) notice('購入できませんでした', text);
  };

  const pickAge = async (group: AgeGroup) => {
    const key = askAge;
    setAskAge(null);
    if (!key) return;
    if (!(await acc.setAge(group))) return notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
    void purchase(key);
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await acc.restorePurchases();
      if (result.kind === 'offline') notice('購入の復元', 'つながりませんでした。電波のよいところで、もう一度お試しください。');
      else if (result.credited > 0) notice('購入の復元', `${result.credited}件の購入を確認しました。`);
      else if (result.otherAccount > 0) notice('購入の復元', 'この購入は、別の記録と結びついています。設定の「アカウント」から、その記録を引き継いでください。');
      else notice('購入の復元', '復元できる購入は見つかりませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const passPrice = priceOf('pass', '¥1,500');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pic name="brand/title-shop" height={40} />
          <View style={{ flex: 1 }} />
          <Tap onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Tap>
        </View>
        <T w="b" size={13} color={C.sub} style={{ marginTop: 4, marginBottom: 12 }}>お迎え券 {ticketsOf(state)}枚 ／ またたび {matatabiOf(state)}個</T>

        {ITEMS.map((it) => (
          <Card key={it.key} style={s.item}>
            <Icon name={it.icon} size={40} />
            <View style={{ flex: 1 }}>
              <T w="x" size={14}>{it.name}</T>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>{it.desc}</T>
            </View>
            <ImgButton
              label={priceOf(it.key, it.yen)}
              height={40}
              disabled={busy}
              onPress={() => confirm(`${it.name}を購入しますか？`, `${priceOf(it.key, it.yen)}です。`, '購入する', () => void purchase(it.key))}
              style={{ width: 100 }}
            />
          </Card>
        ))}
        <Card style={[s.item, { alignItems: 'flex-start' }]}>
          <Icon name="icon/matatabi-bag" size={44} />
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>またたびパス（月額 {passPrice}）</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>
              加入中は毎日の候補が3匹から{3 + PASS_BONUS_LABEL}匹にふえて、毎月お迎え券が8枚届きます。1か月ごとに自動で更新され、いつでも解約できます。解約後も迎えた猫はそのまま残ります
            </T>
          </View>
          <ImgButton
            skin={state.pass.active ? 'ghost-outline' : 'primary-green'}
            label={state.pass.active ? '加入中' : '加入'}
            height={40}
            disabled={busy || state.pass.active}
            onPress={() => confirm(
              'またたびパスに加入しますか？',
              `月額 ${passPrice}です。毎日の候補が${3 + PASS_BONUS_LABEL}匹になり、毎月お迎え券が8枚届きます。期間が終わる24時間前までに解約しない限り、1か月ごとに自動で更新され、Apple Accountに請求されます。解約は、iPhoneの「設定」→ 上部の名前 →「サブスクリプション」から、いつでもできます。`,
              '加入する',
              () => void purchase('pass'),
              { skin: 'primary-green' },
            )}
            style={{ width: 84 }}
          />
        </Card>
        {state.pass.active && (
          <T w="m" size={11} color={C.sub} style={{ marginBottom: 8 }}>解約は、iPhoneの「設定」→ 上部の名前 →「サブスクリプション」から行えます。</T>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ImgButton skin="ghost-outline" label="出会いの仕組み" height={40} fontSize={13} onPress={() => setOdds(true)} style={{ flex: 1 }} />
          <ImgButton skin="ghost-outline" label="購入を復元" height={40} fontSize={13} disabled={busy} onPress={restore} style={{ flex: 1 }} />
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
        {!acc.storeAvailable && (
          <T w="m" size={11} color={C.sub} style={{ marginTop: 8 }}>※ この環境（Webや開発用）では、購入できません。iPhoneの実機で、ご利用ください。</T>
        )}
        {__DEV__ && (
          <T w="b" size={11} color={C.sub} style={{ marginTop: 8 }} onPress={withSfx(() => g.grant('ticket', 1))}>（開発用）お迎え券を1枚、無料で足す</T>
        )}
      </ScrollView>
      <AgePopup visible={!!askAge} onPick={pickAge} onClose={() => setAskAge(null)} />
      {confirmEl}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
});

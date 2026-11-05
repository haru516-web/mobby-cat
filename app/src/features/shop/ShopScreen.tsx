import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useAccount } from '../../core/account';
import { matatabiOf, ticketsOf, useGame } from '../../core/game';
import { EULA_URL, PRIVACY_URL } from '../../data/appInfo';
import { notice } from '../../services/dialog';
import type { AgeGroup, BuyOutcome } from '../../services/account/purchase';
import { PRODUCTS, type ProductKey } from '../../services/account/products';
import { C, T } from '../../ui/base';
import { useConfirm } from '../../ui/ConfirmPopup';
import { Card, Icon, ImgButton, Tap, withSfx } from '../../ui/kit';
import { Popup } from '../../ui/Popup';
import { Pic } from '../../ui/Slice';
import { AgePopup } from './AgePopup';

// 売る商品。価格は設計書（docs/game-design.md 4.3）のとおり。実際に請求される金額は、App Store が表示する価格。
// またたびの商品情報は残す。新しい出会いの仕組みに合わせて、ショップでは一時的に非表示にする。
const ITEMS: { key: ProductKey; icon: string; name: string; yen: string; desc: string }[] = [
  { key: 'ticket1', icon: 'icon/ticket-paw', name: 'お迎え券 1枚', yen: '¥200', desc: '今日の候補から好きな猫を1匹、確実に追加で迎えます' },
  { key: 'ticket6', icon: 'icon/ticket-paw', name: 'お迎え券 6枚', yen: '¥1,000', desc: 'まとめ買い（5枚＋おまけ1枚）' },
  { key: 'matatabi5', icon: 'icon/matatabi-leaf', name: 'またたび 5個セット', yen: '¥300', desc: '準備中です。所持中のまたたびは、そのまま残ります。' },
];

const openLink = (url: string) => Linking.openURL(url).catch(() => notice('ページを開けませんでした', url));

// 購入が終わらなかったときに、利用者へ伝える文。取り消し（cancelled）は何も出さない
function failureText(outcome: Extract<BuyOutcome, { ok: false }>): string | null {
  switch (outcome.reason) {
    case 'cancelled':
      return null;
    case 'offline':
      return 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。購入はされていません。';
    case 'verify_failed':
      return '購入の確認ができませんでした。Appleでの支払いが完了している場合もあります。アプリを開き直すと、自動でやり直します。';
    case 'already_subscribed':
      return 'このApple IDは、すでにまたたびパスに加入しています。新しく請求はされません。ショップの「購入を復元」を押すと、この端末で使えるようになります。';
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

  // 購入の前に、年齢の区分が要る。足りなければ、そこを済ませてから、もう一度購入に進む。Apple 連携は任意で、購入のあとに案内する
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
      const thanks = key === 'pass' ? 'またたびパスに加入しました。' : 'ありがとうございます。';
      if (acc.linked === true) return notice('購入しました', thanks);
      confirm(
        '購入しました',
        `${thanks}機種変更やアプリの削除に備えて、Appleでサインインしておくと安心です（任意です）。迎えた猫と遊んだ記録も、購入したものも、新しいiPhoneで戻せます。名前やメールアドレスは受け取りません。サインインしない場合、迎えた猫と記録は端末の中だけにあるので、機種変更やアプリの削除で消えます。購入したお迎え券・またたびは、設定の「アカウント」で発行する引継ぎコードで戻せますが、引き継げるのは課金したアイテムだけで、所持しているにゃこモビーは引き継がれません。`,
        'Appleでサインイン',
        async () => {
          const result = await acc.linkApple();
          if (result === 'ok') return notice('サインインしました', '機種変更をしても、購入したものと記録を引き継げます。');
          if (result === 'ok_unsaved') return notice('サインインしました', '購入したものは引き継げます。記録はまだクラウドに預けられていません。電波のよいところで、自動で預け直します。');
          if (result === 'in_use') {
            notice('このApple IDは、すでに使われています', '別の記録と結びついています。設定の「アカウント」から、その記録を引き継いでください。');
          } else if (result === 'unavailable') notice('この環境ではサインインできません', 'iPhoneの実機で、Appleにサインインしている状態でお試しください。');
          else if (result === 'offline') notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
          else if (result === 'failed') notice('サインインできませんでした', 'もう一度お試しください。');
        },
        { skin: 'primary-green', cancelLabel: 'あとで' },
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

  const [transferCode, setTransferCode] = useState('');
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await acc.restorePurchases(transferCode.trim());
      if (result.kind === 'offline') notice('購入の復元', 'つながりませんでした。電波のよいところで、もう一度お試しください。');
      else if (result.kind === 'store_error') notice('購入の復元', 'App Storeにつながりませんでした。しばらくしてから、もう一度お試しください。');
      else if (result.familyShared) notice('購入の復元', 'このパスは、ファミリー共有で見えているものです。パスを購入した方のApple IDで、その方のiPhoneから、復元してください。');
      else if (result.planMoved) notice('購入の復元', 'またたびパスを、この端末で使えるようにしました。次の更新からも、この端末に届きます。お迎え券・またたびの残高を戻すには、前の端末で発行した引継ぎコードが必要です。');
      else if (result.localBlocked) notice('購入の復元', 'この端末のアカウントに購入したものがあるため、引継ぎコードは使いませんでした。コードは、まだ使えます。アカウントをまとめたい場合は、サポートまでご連絡ください。');
      else if (result.recovered && result.credited === 0) notice('購入の復元', 'アカウントを、この端末に引き継ぎました。前の端末では、使えなくなります。持っているものは、この画面の表示で確かめてください。');
      else if (result.incomplete) notice('購入の復元', `一部の購入を、App Storeから読み取れませんでした（確認できた購入: ${result.credited}件）。しばらくしてから、もう一度お試しください。`);
      else if (result.credited > 0) notice('購入の復元', result.recovered ? `別の端末で購入した記録を、この端末に引き継ぎました（${result.credited}件の購入を確認）。前の端末では、使えなくなります。` : `${result.credited}件の購入を確認しました。`);
      else if (result.proofUsed) notice('購入の復元', '引継ぎコードが違うか、期限切れ、または別の端末で使用済みです。前の端末でAppleにサインインして連携できる場合は、設定から引き継いでください。できない場合は、サポートへご連絡ください。');
      else if (result.otherAccount > 0) notice('購入の復元', 'この購入は、別の記録と結びついています。その記録でAppleにサインインしていた場合は、設定の「アカウント」から引き継いでください。');
      else if (result.failed > 0) notice('購入の復元', '購入を確認できませんでした。しばらくしてから、もう一度お試しください。続く場合は、サポートまでご連絡ください。');
      else notice('購入の復元', '復元できる購入は見つかりませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const passPrice = priceOf('pass', '¥1,500');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pic name="brand/title-shop" height={40} />
          <View style={{ flex: 1 }} />
          <Tap onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Tap>
        </View>
        <T w="b" size={13} color={C.sub} style={{ marginTop: 4, marginBottom: 12 }}>お迎え券 {ticketsOf(state)}枚 ／ またたび {matatabiOf(state)}個</T>

        {ITEMS.filter((it) => it.key !== 'matatabi5').map((it) => (
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
            <T w="x" size={14}>{state.pass.active ? `またたびパス（月額 ${passPrice}）` : 'またたびパス'}</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>
              {state.pass.active
                ? '加入中です。毎月お迎え券が8枚届きます。解約はiPhoneの「設定」→ 上部の名前 →「サブスクリプション」から行えます。'
                : '準備中です。新しい出会いの仕組みに合わせて内容を見直しています。新規加入は一時的に停止しています。'}
            </T>
          </View>
          {state.pass.active && <T w="x" size={12} color={C.green}>加入中</T>}
        </Card>
        {state.pass.active && (
          <T w="m" size={11} color={C.sub} style={{ marginBottom: 8 }}>解約は、iPhoneの「設定」→ 上部の名前 →「サブスクリプション」から行えます。</T>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ImgButton skin="ghost-outline" label="出会いの仕組み" height={40} fontSize={13} onPress={() => setOdds(true)} style={{ flex: 1 }} />
          <ImgButton skin="ghost-outline" label="購入を復元" height={40} fontSize={13} disabled={busy} onPress={() => confirm('購入を復元しますか？', '加入中のまたたびパスは、そのまま復元できます。お迎え券・またたびを別の端末から引き継ぐには、引継ぎコードが必要で、前の端末ではそのアカウントを使えなくなります。所持しているにゃこモビーと遊んだ記録は、コードでは引き継がれません。引き継ぐには、Appleでサインインします。', '復元する', () => { void restore(); }, { cancelLabel: 'やめておく' })} style={{ flex: 1 }} />
        </View>
        <Card skin="white" style={{ gap: 6, marginTop: 8 }}>
          <T w="b" size={12}>別の端末の購入を引き継ぐ場合</T>
          <T w="m" size={11} color={C.sub}>またたびパスは、コードなしで「購入を復元」を押すと戻せます。お迎え券・またたびは、前の端末の「設定 → アカウント」で発行した引継ぎコードを入力して、「購入を復元」を押してください。コードで引き継げるのは、課金したアイテム（お迎え券・またたび）だけです。所持しているにゃこモビーと遊んだ記録は、引き継がれません。猫も引き継ぐには、設定からAppleでサインインします。</T>
          <TextInput value={transferCode} onChangeText={setTransferCode} accessibilityLabel="引継ぎコード" placeholder="引継ぎコード" autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={160} style={{ color: C.ink, borderWidth: 1, borderColor: C.sub, borderRadius: 8, padding: 12, minHeight: 44 }} />
        </Card>
        {/* 自動更新のサブスクがあるので、購入の画面に利用規約とプライバシーポリシーを置く */}
        <View style={s.legal}>
          <T w="b" size={12} color={C.accent} style={s.link} onPress={withSfx(() => openLink(EULA_URL))} accessibilityRole="link">利用規約（EULA）</T>
          <T w="b" size={12} color={C.accent} style={s.link} onPress={withSfx(() => openLink(PRIVACY_URL))} accessibilityRole="link">プライバシーポリシー</T>
        </View>
        {/* 購入を復元の確認と同じく、ポップで見せる（ポップは OverlayHost に出るので、ここに置いてよい） */}
        <Popup visible={odds} onClose={() => setOdds(false)} maxWidth={340} heightRatio={0.7}>
          <View style={{ flex: 1, padding: 18, gap: 8 }}>
            <T w="x" size={16} style={{ textAlign: 'center', marginTop: 4 }}>出会いの仕組み</T>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <T w="m" size={12} color={C.sub} style={{ lineHeight: 18 }}>
              毎晩20時に、その日の出会いの条件をすべて満たした猫が候補に並びます。{'\n'}
              条件をすべて満たしたら、その日の候補に必ず出ます。候補の数を抽選でしぼることはありません。候補は届いた時点ですべて見え、同じ日・同じ状態なら顔ぶれも同じです。{'\n'}
              ノーマルの猫には、歩数・天気・起動した時間帯・月の状態・曜日・電池・コレクションなど、その日の自分に合わせた条件があります。毎日1匹のノーマルは、日付で決まる軽い条件を満たして候補に加わります。そのため、候補が0匹の日はありません。{'\n'}
              お迎え券を使うと、候補の中からもう1匹を選んで迎えられます。条件を満たした猫は、みんな候補に出ます。
              </T>
            </ScrollView>
            <ImgButton skin="ghost-outline" label="閉じる" height={48} fontSize={13} onPress={() => setOdds(false)} />
          </View>
        </Popup>
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
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  link: { textDecorationLine: 'underline' },
});

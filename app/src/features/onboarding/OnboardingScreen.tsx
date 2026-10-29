import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { REVEAL_HOUR } from '../../core/encounter';
import { useAccount } from '../../core/account';
import { STARTER_REROLLS, useGame } from '../../core/game';
import { notice } from '../../services/dialog';
import { requestStepAccess } from '../../services/signals';
import { requestWeatherAccess } from '../../services/weather';
import { enableDailyNotification } from '../../services/notify';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { useConfirm } from '../../ui/ConfirmPopup';
import { Popup } from '../../ui/Popup';
import { Card, ImgButton, Tap, withSfx } from '../../ui/kit';
import { Backdrop, Pic } from '../../ui/Slice';
import { playSfx } from '../../services/audio';

// 相棒を決めたあとに、1項目ずつポップで見せる。最後の「はじめる」で、歩数・位置・通知の許可を求めて始まる
const TIPS = [
  { icon: 'icon/calendar-today', title: '毎日の出会い', text: `毎日${REVEAL_HOUR}時に、その日の条件がそろったにゃこモビー（最大3匹）と出会えます。1匹は無料でお迎え` },
  { icon: 'icon/sun', title: '会える猫が変わる', text: '歩いた日、雨の日、満月の夜、スマホの電池が1%の日…あなたの毎日によって、会える猫が変わります' },
  { icon: 'icon/book', title: '秘密の条件', text: '条件は世界中のみんなと共通。図鑑のヒントを手がかりに、秘密の条件を見つけよう' },
  { icon: 'icon/paw', title: '歩数・天気・通知の許可', text: `歩数と位置情報（天気）を許可しないと、ほとんどの猫に会えません。通知を許可すると、毎日${REVEAL_HOUR}時の出会いをお知らせします。次に出る画面で「許可」を選んでね` },
];

// 初回起動：相棒を1匹選んでもらい、毎日の出会いのしくみを体験で伝える
export default function OnboardingScreen({ width }: { width: number }) {
  const { chooseStarter, rerollStarter, reset, setNotify, state } = useGame();
  const acc = useAccount();
  const [restoring, setRestoring] = useState(false);
  // 以前のiPhoneの記録を、Appleでサインインして戻す（記録が戻ると、この画面は閉じる）
  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const r = await acc.restoreWithApple();
      if (r === 'nothing') notice('記録が見つかりません', 'このApple IDで預けた記録はありません。');
      else if (r === 'offline') notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
      else if (r === 'unavailable') notice('この環境ではサインインできません', 'iPhoneの実機で、Appleにサインインしている状態でお試しください。');
      else if (r === 'failed') notice('引き継げませんでした', 'もう一度お試しください。');
    } finally {
      setRestoring(false);
    }
  };
  const offer = state.starterOffer ?? [];
  const left = Math.max(0, STARTER_REROLLS - (state.starterRerolls ?? 0));
  const [confirm, confirmEl] = useConfirm(); // 相棒は、大きく見せるポップで最終決定する
  const [sel, setSel] = useState<string | null>(null);
  // 引き直したら、いま見えていない子の選択は外す
  useEffect(() => {
    if (sel && !offer.includes(sel)) setSel(null);
  }, [offer, sel]);
  const [step, setStep] = useState<'pick' | 'how'>('pick');
  const [starting, setStarting] = useState(false);
  const [tip, setTip] = useState(0); // 説明のポップの番号（1項目ずつ、連続して出す）
  const colW = (width - 32 - 16) / 3;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/app-cream" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <Pic name="brand/logo-nekomobby" height={56} style={{ alignSelf: 'center' }} />
        {step === 'pick' ? (
          <>
            <T w="x" size={20} style={s.title}>最初の相棒を選んでね</T>
            <T w="m" size={13} color={C.sub} style={s.lead}>選んだ子は、今日からあなたの猫部屋で暮らします</T>
            <View style={s.row}>
              {offer.map((id, i) => (
                <Tap key={id} style={{ width: colW, alignItems: 'center' }} onPress={() => setSel(id)} accessibilityLabel={CAT_BY_ID[id].name}>
                  {sel === id && <Pic name="cat/halo-select" width={colW * 1.1} style={{ position: 'absolute', top: colW * 0.05 }} />}
                  <Bobbing delay={i * 200}><CatImage id={id} size={colW} /></Bobbing>
                  <Card skin={sel === id ? 'selected' : 'white'} style={s.nameCard}>
                    {/* 「ブリティッシュショートヘア」のような長い名前も切れずに読めるよう3行まで */}
                    <T w="x" size={10} numberOfLines={3} style={{ textAlign: 'center' }}>{CAT_BY_ID[id].name}</T>
                  </Card>
                </Tap>
              ))}
            </View>
            {/* 引き直しは最大3回。残りの回数を見せる。回数は端末に保存され、アプリを閉じても増えない */}
            <ImgButton
              skin="ghost-outline"
              label={left > 0 ? `ほかの子も見る（あと${left}回）` : 'もう引き直せません'}
              height={44}
              fontSize={13}
              disabled={left <= 0}
              onPress={rerollStarter}
              style={{ marginTop: 14 }}
            />
            <ImgButton
              label={sel ? 'この子を確認する' : '気になる子をタップしてね'}
              icon="icon/paw"
              height={54}
              disabled={!sel}
              onPress={() => confirm(
                `${CAT_BY_ID[sel!].name}を相棒にしますか？`,
                '選んだ子は、今日からあなたの猫部屋で暮らします。決めたあとは変えられません。',
                '相棒にする',
                () => { setTip(0); setStep('how'); },
                { catId: sel!, cancelLabel: 'もどる' },
              )}
              style={{ marginTop: 12 }}
            />
            <T w="b" size={12} color={C.accent} style={{ textAlign: 'center', marginTop: 16 }} onPress={withSfx(restore)}>
              以前のiPhoneの記録を引き継ぐ（Appleでサインイン）
            </T>
            {/* 開発ビルドだけ：引き直しの回数を使い切っても、ここから最初に戻して何度でも試せる */}
            {__DEV__ && (
              <T w="b" size={11} color={C.sub} style={{ textAlign: 'center', marginTop: 16 }} onPress={withSfx(reset)}>（開発用）引き直しの回数をもどす</T>
            )}
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Bobbing><CatImage id={sel!} size={160} /></Bobbing>
            </View>
            <T w="x" size={20} style={s.title}>{CAT_BY_ID[sel!].name}がやってきた！</T>
          </>
        )}
      </ScrollView>
      <Popup visible={step === 'how'} onClose={() => {}} maxWidth={340} heightRatio={0.5}>
        <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <T w="m" size={12} color={C.sub}>{tip + 1} / {TIPS.length}</T>
          <Pic name={TIPS[tip].icon} height={72} />
          <T w="x" size={18} style={{ textAlign: 'center' }}>{TIPS[tip].title}</T>
          <T w="b" size={13} style={{ textAlign: 'center', lineHeight: 20 }}>{TIPS[tip].text}</T>
          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 12 }}>
            {tip > 0 && <ImgButton skin="ghost-outline" label="まえへ" height={48} fontSize={13} onPress={() => setTip(tip - 1)} style={{ flex: 1 }} />}
            <ImgButton
              label={tip < TIPS.length - 1 ? 'つぎへ' : 'はじめる'}
              icon="icon/paw"
              height={48}
              fontSize={14}
              disabled={starting}
              onPress={async () => {
                if (tip < TIPS.length - 1) return setTip(tip + 1);
                // 歩数の条件を説明したあとで許可を求める。断られても遊べる
                setStarting(true);
                await requestStepAccess();
                await requestWeatherAccess();
                // 毎日の出会いのお知らせ。断られても、アプリを開けば出会える
                if (await enableDailyNotification()) setNotify(true);
                chooseStarter(sel!);
                playSfx('sfx_welcome');
              }}
              style={{ flex: 1.6 }}
            />
          </View>
        </View>
      </Popup>
      {confirmEl}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 32, paddingBottom: 40 },
  title: { textAlign: 'center', marginTop: 16 },
  lead: { textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 20 },
  nameCard: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: -6 },
});

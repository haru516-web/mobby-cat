import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useAccount } from '../../core/account';
import { useGame } from '../../core/game';
import { INFO_BODY, INFO_TITLE, InfoKind, PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../../data/appInfo';
import { setAudioSettings, useAudioSettings } from '../../services/audio';
import { notice } from '../../services/dialog';
import { useConfirm } from '../../ui/ConfirmPopup';
import { hasStepAccess } from '../../services/signals';
import { hasLocationAccess } from '../../services/weather';
import { disableDailyNotification, enableDailyNotification, hasNotifyAccess } from '../../services/notify';
import { C, T } from '../../ui/base';
import { Card, ImgButton, Toggle, Tap, withSfx } from '../../ui/kit';
import { Popup } from '../../ui/Popup';
import { Pic, Slice } from '../../ui/Slice';
import { AGE_LABEL, AgePopup } from '../shop/AgePopup';
import type { AgeGroup } from '../../services/account/purchase';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type Category = 'permission' | 'notify' | 'sound' | 'support' | 'about' | 'account' | 'data' | 'dev';
// 内容の量に合わせたポップの高さ（画面の高さに対する割合）
const POP_H: Record<Category, number> = { permission: 0.5, notify: 0.5, sound: 0.46, support: 0.4, about: 0.46, account: 0.7, data: 0.38, dev: 0.42 };
const CATEGORIES: { key: Category; title: string; desc: string; icon: string; dev?: boolean }[] = [
  { key: 'permission', title: '歩数と天気の許可', desc: '出会いの条件に使う許可の状態', icon: 'icon/shield-check' },
  { key: 'notify', title: '通知と誕生日', desc: '毎日20時の通知、誕生日の登録', icon: 'icon/calendar-today' },
  { key: 'sound', title: '音とバイブ', desc: 'BGM・効果音・バイブ', icon: 'icon/heart-on' },
  { key: 'support', title: '使い方とサポート', desc: 'チュートリアル、お問い合わせ', icon: 'icon/megaphone' },
  { key: 'about', title: 'このアプリについて', desc: '規約・プライバシー・クレジット', icon: 'icon/paw' },
  { key: 'account', title: 'アカウント', desc: 'Appleでサインイン・記録の引き継ぎ・削除', icon: 'icon/key' },
  { key: 'data', title: 'データ', desc: '記録の保存と消去', icon: 'icon/cloud' },
  { key: 'dev', title: '開発用', desc: '日付を進める・全キャラ開放', icon: 'icon/key', dev: true },
];

// 設定の入口は、種類ごとのボタンだけを並べたポップ。ボタンを押すと、その上に内容のポップが重なる
export default function SettingsScreen({ onClose, onTutorial }: { onClose: () => void; onTutorial: () => void }) {
  const g = useGame();
  const { state } = g;
  const bd = state.birthday;
  const audio = useAudioSettings();
  const [category, setCategory] = useState<Category | null>(null);
  const [info, setInfo] = useState<InfoKind | null>(null);
  const [confirm, confirmEl] = useConfirm();
  const acc = useAccount();
  const [busy, setBusy] = useState(false);
  const [lowerAge, setLowerAge] = useState(false);

  // 通信を待つ操作は、続けて押せないようにする
  const run = async (job: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await job(); } finally { setBusy(false); }
  };
  const doLink = () => run(async () => {
    const r = await acc.linkApple();
    if (r === 'ok') notice('Appleでサインインしました', '記録をクラウドに預けました。機種変更のときは、新しいiPhoneで「別のiPhoneの記録を引き継ぐ」から戻せます。');
    else if (r === 'ok_unsaved') notice('Appleでサインインしました', '記録は、まだクラウドに預けられていません。電波のよいところで、自動で預け直します。「アカウント」から、すぐに預け直すこともできます。');
    else if (r === 'in_use') notice('このApple IDは、すでに使われています', 'すでに別の記録と結びついています。「別のiPhoneの記録を引き継ぐ」を押すと、その記録に切り替えられます。');
    else if (r === 'unavailable') notice('この環境ではサインインできません', 'iPhoneの実機で、Appleにサインインしている状態でお試しください。');
    else if (r === 'offline') notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
    else if (r === 'failed') notice('サインインできませんでした', 'もう一度お試しください。');
  });
  const doRestore = () => run(async () => {
    const r = await acc.restoreWithApple();
    if (r === 'restored') notice('引き継ぎました', '預けてあった記録と、購入したものを戻しました。');
    else if (r === 'choose') notice('記録が食い違っています', 'この端末の記録と、クラウドの記録の、どちらを使うか選んでください。');
    else if (r === 'nothing') notice('記録が見つかりません', 'このApple IDで預けた記録はありません。');
    else if (r === 'unavailable') notice('この環境ではサインインできません', 'iPhoneの実機で、Appleにサインインしている状態でお試しください。');
    else if (r === 'offline') notice('つながりませんでした', '電波のよいところで、もう一度お試しください。');
    else if (r === 'failed') notice('引き継げませんでした', 'もう一度お試しください。');
  });
  const doResolve = (choice: 'local' | 'cloud') => run(async () => {
    if (!(await acc.resolveCloud(choice))) notice('記録を預けられませんでした', '電波のよいところで、自動で預け直します。');
  });
  const doRetry = () => run(async () => {
    if (await acc.retryCloud()) notice('記録を預けました', 'クラウドの記録が、いまの記録になりました。');
    else if (acc.pendingCloud) notice('記録が食い違っています', 'この端末の記録と、クラウドの記録の、どちらを使うか選んでください。');
    else notice('記録を預けられませんでした', '電波のよいところで、もう一度お試しください。');
  });
  const pickLowerAge = (group: AgeGroup) => {
    setLowerAge(false);
    void run(async () => {
      if (await acc.setAge(group)) notice('年齢の区分を変えました', `${AGE_LABEL[group]}になりました。`);
      else notice('変えられませんでした', '電波のよいところで、もう一度お試しください。');
    });
  };
  const savedAt = acc.cloudSavedAt ? new Date(acc.cloudSavedAt) : null;
  const savedText = savedAt ? `${savedAt.getMonth() + 1}月${savedAt.getDate()}日 ${savedAt.getHours()}:${String(savedAt.getMinutes()).padStart(2, '0')}` : '';
  const cloudText =
    acc.cloud === 'saving' ? 'いま、記録を預けています…'
    : acc.cloud === 'failed' ? 'さいごに預けようとしたとき、つながりませんでした。電波のよいところで、自動で預け直します。'
    : savedAt ? `記録をクラウドに預けています（さいごに預けたのは ${savedText}）。`
    : 'まだ記録を預けていません。少しすると、自動で預けます。';

  const doDelete = () => run(async () => {
    const r = await acc.deleteAccount();
    if (r === 'deleted') notice('削除しました', 'アカウントと、サーバーの記録を削除しました。');
    else if (r === 'offline') notice('つながりませんでした', '削除はできていません。電波のよいところで、もう一度お試しください。');
    else if (r === 'apple_needed') notice('Appleでのサインインが必要です', '削除の確認のため、もう一度Appleでサインインしてください。削除はできていません。');
    else if (r === 'apple_mismatch') notice('別のApple IDです', 'このアカウントと結びついているApple IDで、サインインしてください。削除はできていません。');
    else if (r === 'signed_out') notice('この端末のアカウントが受け付けられません', '下の「Appleでサインインし直す」から、アカウントを戻してください。削除はできていません。');
    else notice('削除できませんでした', 'しばらくしてから、もう一度お試しください。続く場合は、サポートまでご連絡ください。');
  });

  const toggleNotify = async (v: boolean) => {
    if (v) {
      const ok = await enableDailyNotification();
      if (!ok) return notice('通知が許可されていません', '通知なしでもアプリ内から出会えます');
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

  const [perm, setPerm] = useState({ steps: false, location: false });
  // 開いたときと、設定アプリから戻ったときに、許可を確かめ直す。通知を端末の設定で切っていたら、こちらもオフにする
  useEffect(() => {
    const check = () => {
      void Promise.all([hasStepAccess(), hasLocationAccess()]).then(([steps, location]) => setPerm({ steps, location }));
      void hasNotifyAccess().then((granted) => { if (!granted) g.setNotify(false); });
    };
    check();
    const sub = AppState.addEventListener('change', (next) => { if (next === 'active') check(); });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = (v: number, delta: number) => Math.round(Math.min(1, Math.max(0, v + delta)) * 10) / 10;

  const contact = () => {
    if (!SUPPORT_EMAIL) return notice('お問い合わせ', '窓口は準備中です');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`にゃっコレ ${APP_VERSION}`)}`).catch(() =>
      notice('メールを開けませんでした', SUPPORT_EMAIL),
    );
  };
  const openLegal = (kind: 'privacy' | 'terms') => {
    const url = kind === 'privacy' ? PRIVACY_URL : TERMS_URL;
    if (url) Linking.openURL(url).catch(() => setInfo(kind));
    else setInfo(kind);
  };

  const head = (title: string, onBack: () => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6 }}>
      {title === '設定' ? <Pic name="brand/title-settings" height={36} /> : <T w="x" size={18}>{title}</T>}
      <View style={{ flex: 1 }} />
      <Tap onPress={onBack} accessibilityLabel="閉じる">
        <Pic name="button/close-round" height={40} />
      </Tap>
    </View>
  );

  const catTitle = CATEGORIES.find((c) => c.key === category)?.title ?? '';

  return (
    <View style={{ flex: 1 }}>
      {/* 入口：種類別のボタン */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        {head('設定', onClose)}

        {!!g.corruptBackup && (
          <Card skin="selected" style={{ marginTop: 8, gap: 6 }}>
            <T w="x" size={13}>読み込めなかった記録があります</T>
            <T w="m" size={11} color={C.sub}>
              以前の記録の全部、または一部を読み込めなかったため、元の記録を端末の中に取っておいてあります。お問い合わせのときに書き出してお送りいただければ、復旧できるかもしれません。
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ImgButton skin="ghost-outline" label="書き出す" height={36} fontSize={12} onPress={() => Share.share({ message: g.corruptBackup ?? '' }).catch(() => {})} style={{ flex: 1 }} />
              <ImgButton
                skin="ghost-outline"
                label="削除する"
                height={36}
                fontSize={12}
                onPress={() => confirm('取っておいた記録を削除しますか？', '削除すると元に戻せません。', '削除する', g.discardBackup)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
        {g.saveBlocked && (
          <Card skin="selected" style={{ marginTop: 8 }}>
            <T w="x" size={13}>記録を保存できません</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>端末の保存領域を読めなかったため、いまの記録を守るために保存を止めています。アプリを閉じて開き直してください。</T>
          </Card>
        )}

        <View style={{ gap: 8, marginTop: 8 }}>
          {CATEGORIES.filter((c) => !c.dev || __DEV__).map((c) => (
            <Tap key={c.key} onPress={() => setCategory(c.key)} accessibilityLabel={c.title}>
              <Card style={s.cat}>
                <Pic name={c.icon} height={32} />
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>{c.title}</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 1 }}>{c.desc}</T>
                </View>
                <Pic name="icon/chevron-right" height={14} />
              </Card>
            </Tap>
          ))}
        </View>
        <T w="m" size={10} color={C.sub} style={{ marginTop: 10, textAlign: 'center' }}>バージョン {APP_VERSION}</T>
      </ScrollView>

      {/* 種類ごとの内容：設定のポップの上に重なる */}
      <Popup visible={!!category} onClose={() => setCategory(null)} maxWidth={380} heightRatio={category ? POP_H[category] : 0.4}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
          {head(catTitle, () => setCategory(null))}

          {category === 'permission' && (
            <Card style={{ gap: 6, marginTop: 8 }}>
              <T w="m" size={11} color={C.sub}>
                猫の出会いの条件には、歩数と天気（位置情報）が使われています。許可しないと、ほとんどの猫に会えません。位置はおおまかな場所だけを使い、保存しません。許可を変えたときは、次の出会い（20時）の候補から反映されます。
              </T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T w="x" size={13}>歩数（モーションとフィットネス）</T>
                <T w="x" size={13} color={perm.steps ? C.ok : C.accent}>{perm.steps ? '許可ずみ' : '未許可'}</T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T w="x" size={13}>位置情報（天気）</T>
                <T w="x" size={13} color={perm.location ? C.ok : C.accent}>{perm.location ? '許可ずみ' : '未許可'}</T>
              </View>
              {(!perm.steps || !perm.location) && (
                <ImgButton skin="ghost-outline" label="設定アプリを開く" height={38} fontSize={12} onPress={() => Linking.openSettings().catch(() => notice('設定を開けませんでした', '端末の設定アプリから、にゃっコレの許可を変えてください'))} style={{ marginTop: 4 }} />
              )}
            </Card>
          )}

          {category === 'notify' && (
            <View style={{ marginTop: 8 }}>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>毎日20:00に通知</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>通知なしでもアプリ内から受け取れます</T>
                </View>
                <Toggle label="毎日の出会いの通知" value={state.notifyEnabled} onChange={toggleNotify} />
              </Card>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>誕生日</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>誕生日の出会いに、特別な猫が来ることがあります。候補は20時にできるので、その前に登録してください。端末の中だけに保存します</T>
                </View>
                {bd ? (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Stepper label={`${bd.m}月`} onMinus={() => stepBirthday('m', -1)} onPlus={() => stepBirthday('m', 1)} />
                    <Stepper label={`${bd.d}日`} onMinus={() => stepBirthday('d', -1)} onPlus={() => stepBirthday('d', 1)} />
                    <T w="b" size={11} color={C.sub} onPress={withSfx(() => g.setBirthday(null))}>登録をやめる</T>
                  </View>
                ) : (
                  <ImgButton skin="ghost-outline" label="登録する" height={36} fontSize={12} onPress={() => g.setBirthday({ m: 1, d: 1 })} style={{ width: 100 }} />
                )}
              </Card>
            </View>
          )}

          {category === 'sound' && (
            <View style={{ marginTop: 8 }}>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>BGM</T>
                  {audio.bgmEnabled && (
                    <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                      <Stepper
                        label={`${Math.round(audio.bgmVolume * 100)}%`}
                        onMinus={() => setAudioSettings({ bgmVolume: step(audio.bgmVolume, -0.1) })}
                        onPlus={() => setAudioSettings({ bgmVolume: step(audio.bgmVolume, 0.1) })}
                      />
                    </View>
                  )}
                </View>
                <Toggle label="BGM" value={audio.bgmEnabled} onChange={(v) => setAudioSettings({ bgmEnabled: v })} />
              </Card>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>効果音</T>
                  {audio.sfxEnabled && (
                    <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                      <Stepper
                        label={`${Math.round(audio.sfxVolume * 100)}%`}
                        onMinus={() => setAudioSettings({ sfxVolume: step(audio.sfxVolume, -0.1) })}
                        onPlus={() => setAudioSettings({ sfxVolume: step(audio.sfxVolume, 0.1) })}
                      />
                    </View>
                  )}
                </View>
                <Toggle label="効果音" value={audio.sfxEnabled} onChange={(v) => setAudioSettings({ sfxEnabled: v })} />
              </Card>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>バイブ</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>なでる・お迎えのときに、ふるえて知らせます</T>
                </View>
                <Toggle label="バイブ" value={audio.hapticsEnabled} onChange={(v) => setAudioSettings({ hapticsEnabled: v })} />
              </Card>
            </View>
          )}

          {category === 'support' && (
            <View style={{ marginTop: 8 }}>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>使い方</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>はじめに見たチュートリアルを、もう一度見られます</T>
                </View>
                <ImgButton skin="ghost-outline" label="見る" height={36} fontSize={12} onPress={onTutorial} style={{ width: 100 }} />
              </Card>
              <Card style={s.item}>
                <View style={{ flex: 1 }}>
                  <T w="x" size={14}>お問い合わせ</T>
                  <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>不具合やご意見をお送りください</T>
                </View>
                <ImgButton skin="ghost-outline" label="送る" height={36} fontSize={12} onPress={contact} style={{ width: 100 }} />
              </Card>
            </View>
          )}

          {category === 'about' && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <ImgButton skin="ghost-outline" label="プライバシーポリシー" height={44} onPress={() => openLegal('privacy')} />
              <ImgButton skin="ghost-outline" label="利用規約" height={44} onPress={() => openLegal('terms')} />
              <ImgButton skin="ghost-outline" label="クレジット" height={44} onPress={() => setInfo('credits')} />
              <T w="m" size={10} color={C.sub} style={{ textAlign: 'center', marginTop: 4 }}>バージョン {APP_VERSION}</T>
            </View>
          )}

          {category === 'account' && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {acc.signedOut ? (
                <Card skin="selected" style={{ gap: 6 }}>
                  <T w="x" size={13}>この端末のアカウントが使えません</T>
                  <T w="m" size={11} color={C.sub}>別のiPhoneが引き継いだか、サーバーにアカウントが見つかりません。Appleでサインインし直すと、元の記録に戻れます。</T>
                  <ImgButton label="Appleでサインインし直す" height={44} disabled={busy} onPress={doRestore} />
                  <ImgButton
                    skin="ghost-outline"
                    label="新しく始める"
                    height={40}
                    fontSize={12}
                    disabled={busy}
                    onPress={() => confirm('新しく始めますか？', 'この端末のアカウントを捨てて、新しいアカウントで始めます。元のアカウントの購入は、この端末から使えなくなります。', '新しく始める', () => void acc.startOver(), { cancelLabel: 'やめる' })}
                  />
                </Card>
              ) : acc.linked === true ? (
                <Card skin="white" style={{ gap: 4 }}>
                  <T w="x" size={13}>Appleでサインイン済み</T>
                  <T w="m" size={11} color={acc.cloud === 'failed' ? C.accent : C.sub}>{cloudText}</T>
                  <T w="m" size={11} color={C.sub}>機種変更のときは、新しいiPhoneで「別のiPhoneの記録を引き継ぐ」から戻せます。購入したお迎え券・またたび・またたびパスも、同じApple IDで引き継げます。</T>
                  {(acc.cloud === 'failed' || !savedAt) && acc.cloud !== 'saving' && (
                    <ImgButton skin="ghost-outline" label="いま預ける" height={38} fontSize={12} disabled={busy} onPress={doRetry} style={{ marginTop: 4 }} />
                  )}
                </Card>
              ) : (
                <Card skin="white" style={{ gap: 6 }}>
                  <T w="x" size={13}>Appleでサインインしていません</T>
                  <T w="m" size={11} color={C.sub}>サインインすると、記録をクラウドに預けて、機種変更でも引き継げます。サインインは任意で、しなくても購入できます。名前やメールアドレスは受け取りません。</T>
                  <ImgButton label="Appleでサインイン" height={44} disabled={busy} onPress={doLink} />
                </Card>
              )}

              {acc.pendingCloud && (
                <Card skin="selected" style={{ gap: 6 }}>
                  <T w="x" size={13}>記録が食い違っています</T>
                  <T w="m" size={11} color={C.sub}>この端末の記録と、クラウドの記録が違います。どちらを使いますか？（選ばなかった方は、置き換わります）</T>
                  <ImgButton label="クラウドの記録を使う" height={44} disabled={busy} onPress={() => confirm('クラウドの記録を使いますか？', 'この端末の記録は、クラウドの記録に置き換わります。元に戻せません。', '使う', () => void doResolve('cloud'), { cancelLabel: 'やめる' })} />
                  <ImgButton skin="ghost-outline" label="この端末の記録を使う" height={44} disabled={busy} onPress={() => confirm('この端末の記録を使いますか？', 'クラウドの記録は、この端末の記録に置き換わります。元に戻せません。', '使う', () => void doResolve('local'), { cancelLabel: 'やめる' })} />
                </Card>
              )}

              {!acc.signedOut && (
                <ImgButton skin="ghost-outline" label="別のiPhoneの記録を引き継ぐ" height={44} disabled={busy} onPress={() => confirm('記録を引き継ぎますか？', '以前のiPhoneでAppleにサインインしたときの記録を、この端末に戻します。この端末に記録があるときは、どちらを使うか選べます。', 'Appleでサインイン', () => void doRestore(), { cancelLabel: 'やめる' })} />
              )}

              {!acc.signedOut && acc.ageGroup && (
                <Card skin="white" style={{ gap: 4 }}>
                  <T w="x" size={13}>年齢の区分：{AGE_LABEL[acc.ageGroup]}</T>
                  <T w="m" size={11} color={C.sub}>毎月の購入の上限に使います（15歳以下は5,000円、16〜19歳は10,000円まで）。間違えて選んだときは、小さい区分に変えられます。大きい区分には変えられません。</T>
                  {acc.ageGroup !== 'under16' && (
                    <ImgButton skin="ghost-outline" label="小さい区分に変える" height={38} fontSize={12} disabled={busy} onPress={() => setLowerAge(true)} style={{ marginTop: 4 }} />
                  )}
                </Card>
              )}

              {/* Apple に連携していない（匿名の）アカウントも、ここから削除できる。サーバーにアカウントが無ければ、端末の記録だけを消す */}
              <Card skin="white" style={{ gap: 4 }}>
                  <T w="x" size={13}>アカウントの削除</T>
                  <T w="m" size={11} color={C.sub}>アカウントと、サーバーに預けた記録・購入の記録を、すべて削除します。残っているお迎え券とまたたびは、失われます。またたびパスは、自動では解約されません。解約は、iPhoneの「設定」→ 上部の名前 →「サブスクリプション」から行ってください。</T>
                  <T w="b" size={11} color={C.accent} style={{ marginTop: 4 }} onPress={withSfx(() => confirm('アカウントを削除しますか？', 'サーバーの記録と購入の記録を削除し、この端末の記録も消します。元に戻せません。', '削除する', () => void doDelete(), { cancelLabel: 'やめる' }))}>
                    アカウントを削除する
                  </T>
                </Card>
            </View>
          )}

          {category === 'data' && (
            <Card skin="white" style={{ marginTop: 8, gap: 4 }}>
              <T w="x" size={13}>データについて</T>
              <T w="m" size={11} color={C.sub}>
                記録は、この端末の中に保存されます。Appleでサインインすると、クラウドにも預けて、機種変更で引き継げます（「アカウント」から）。
              </T>
              <T w="b" size={11} color={C.accent} style={{ marginTop: 4 }} onPress={withSfx(() => confirm('すべての記録を消しますか？', '迎えた猫・お迎え券・設定がすべて消えます。元に戻せません。', 'すべて消す', () => { void disableDailyNotification(); g.reset(); }, { cancelLabel: 'やめておく' }))}>
                すべての記録を消して、はじめから
              </T>
            </Card>
          )}

          {category === 'dev' && __DEV__ && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <ImgButton skin="ghost-outline" label={`日付を1日進める（+${state.debugOffsetDays}日）`} height={44} onPress={() => g.shiftDays(1)} />
              <ImgButton skin="ghost-outline" label="日付をリセット" height={44} onPress={() => g.shiftDays(-state.debugOffsetDays)} />
              <ImgButton skin="ghost-outline" label="全キャラを開放" height={44} onPress={g.unlockAll} />
              <ImgButton skin="ghost-outline" label="今日の候補を試験用に作る（6匹）" height={44} onPress={g.devFillToday} />
              <ImgButton skin="ghost-outline" label="相棒選びからやり直す（記録を消す）" height={44} onPress={() => confirm('相棒選びからやり直しますか？', '記録がすべて消えて、相棒選び（引き直し3回）から始まります。開発用です。', 'やり直す', g.reset, { cancelLabel: 'やめる' })} />
            </View>
          )}
        </ScrollView>
      </Popup>

      {confirmEl}
      <AgePopup visible={lowerAge} below={acc.ageGroup ?? undefined} onPick={pickLowerAge} onClose={() => setLowerAge(false)} />

      {/* 規約・プライバシー・クレジットの本文：さらにその上に重なる */}
      <Popup visible={!!info} onClose={() => setInfo(null)} maxWidth={380} heightRatio={0.74}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
          {head(info ? INFO_TITLE[info] : '', () => setInfo(null))}
          {info && (
            <Card skin="white" style={{ gap: 12, marginTop: 8 }}>
              {INFO_BODY[info].split('\n\n').map((p, i) => (
                <T key={i} w="m" size={12} style={{ lineHeight: 19 }}>{p}</T>
              ))}
              {__DEV__ && info !== 'credits' && <T w="m" size={10} color={C.sub}>※ 開発ビルドのみ表示：公開前に文面を見直します</T>}
            </Card>
          )}
        </ScrollView>
      </Popup>
    </View>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <ImgButton skin="ghost-outline" label="−" height={28} fontSize={14} onPress={onMinus} style={{ width: 48 }} />
      <Slice name="button/tab-normal" style={s.stepValue}><T w="x" size={13}>{label}</T></Slice>
      <ImgButton skin="ghost-outline" label="+" height={28} fontSize={14} onPress={onPlus} style={{ width: 48 }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 14, paddingBottom: 24 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepValue: { height: 28, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
});

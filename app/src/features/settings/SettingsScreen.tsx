import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useGame } from '../../core/game';
import { INFO_BODY, INFO_TITLE, InfoKind, PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../../data/appInfo';
import { setAudioSettings, useAudioSettings } from '../../services/audio';
import { confirmAction, notice } from '../../services/dialog';
import { hasStepAccess } from '../../services/signals';
import { hasLocationAccess } from '../../services/weather';
import { disableDailyNotification, enableDailyNotification } from '../../services/notify';
import { C, T } from '../../ui/base';
import { Card, ImgButton, Toggle, Tap, withSfx } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function SettingsScreen({ onClose, onTutorial }: { onClose: () => void; onTutorial: () => void }) {
  const g = useGame();
  const { state } = g;
  const bd = state.birthday;
  const audio = useAudioSettings();
  const [info, setInfo] = useState<InfoKind | null>(null);

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
  useEffect(() => {
    Promise.all([hasStepAccess(), hasLocationAccess()]).then(([steps, location]) => setPerm({ steps, location }));
  }, []);

  const step = (v: number, delta: number) => Math.round(Math.min(1, Math.max(0, v + delta)) * 10) / 10;

  const contact = () => {
    if (!SUPPORT_EMAIL) return notice('お問い合わせ', '窓口は準備中です');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`猫モビー ${APP_VERSION}`)}`).catch(() =>
      notice('メールを開けませんでした', SUPPORT_EMAIL),
    );
  };
  const openLegal = (kind: 'privacy' | 'terms') => {
    const url = kind === 'privacy' ? PRIVACY_URL : TERMS_URL;
    if (url) Linking.openURL(url).catch(() => setInfo(kind));
    else setInfo(kind);
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pic name="brand/title-settings" height={36} />
      <View style={{ flex: 1 }} />
      <Tap onPress={info ? () => setInfo(null) : onClose} accessibilityLabel="閉じる">
        <Pic name="button/close-round" height={40} />
      </Tap>
    </View>
  );

  if (info) {
    return (
      <View style={{ flex: 1 }}>
        <Backdrop name="bg/screen-shop" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
          {header}
          <T w="x" size={16} style={{ marginTop: 12, marginBottom: 8 }}>{INFO_TITLE[info]}</T>
          <Card skin="white" style={{ gap: 12 }}>
            {INFO_BODY[info].split('\n\n').map((p, i) => (
              <T key={i} w="m" size={12} style={{ lineHeight: 19 }}>{p}</T>
            ))}
            {__DEV__ && info !== 'credits' && <T w="m" size={10} color={C.sub}>※ 開発ビルドのみ表示：公開前に文面を見直します</T>}
          </Card>
          <ImgButton skin="ghost-outline" label="もどる" height={44} onPress={() => setInfo(null)} style={{ marginTop: 12 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-shop" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        {header}

        {!!g.corruptBackup && (
          <Card skin="selected" style={{ marginTop: 12, gap: 6 }}>
            <T w="x" size={13}>読み込めなかった記録があります</T>
            <T w="m" size={11} color={C.sub}>
              以前の記録を読み込めなかったため、端末の中に取っておいてあります。お問い合わせのときに書き出してお送りいただければ、復旧できるかもしれません。
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ImgButton skin="ghost-outline" label="書き出す" height={36} fontSize={12} onPress={() => Share.share({ message: g.corruptBackup ?? '' }).catch(() => {})} style={{ flex: 1 }} />
              <ImgButton
                skin="ghost-outline"
                label="削除する"
                height={36}
                fontSize={12}
                onPress={() => confirmAction('取っておいた記録を削除', '削除すると元に戻せません', '削除', g.discardBackup)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
        {g.saveBlocked && (
          <Card skin="selected" style={{ marginTop: 12 }}>
            <T w="x" size={13}>記録を保存できません</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>端末の保存領域を読めなかったため、いまの記録を守るために保存を止めています。アプリを閉じて開き直してください。</T>
          </Card>
        )}

        <Section title="歩数と天気の許可" />
        <Card style={{ gap: 6 }}>
          <T w="m" size={11} color={C.sub}>
            猫の出会いの条件には、歩数と天気（位置情報）が使われています。許可しないと、ほとんどの猫に会えません。位置はおおまかな場所だけを使い、保存しません。
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
            <ImgButton skin="ghost-outline" label="設定アプリを開く" height={38} fontSize={12} onPress={() => Linking.openSettings().catch(() => notice('設定を開けませんでした', '端末の設定アプリから、猫モビーの許可を変えてください'))} style={{ marginTop: 4 }} />
          )}
        </Card>

        <Section title="通知と誕生日" />
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
              <T w="b" size={11} color={C.sub} onPress={withSfx(() => g.setBirthday(null))}>登録をやめる</T>
            </View>
          ) : (
            <ImgButton skin="ghost-outline" label="登録する" height={36} fontSize={12} onPress={() => g.setBirthday({ m: 1, d: 1 })} style={{ width: 100 }} />
          )}
        </Card>

        <Section title="音とバイブ" />
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
          <Toggle value={audio.bgmEnabled} onChange={(v) => setAudioSettings({ bgmEnabled: v })} />
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
          <Toggle value={audio.sfxEnabled} onChange={(v) => setAudioSettings({ sfxEnabled: v })} />
        </Card>
        <Card style={s.item}>
          <View style={{ flex: 1 }}>
            <T w="x" size={14}>バイブ</T>
            <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>なでる・お迎えのときに、ふるえて知らせます</T>
          </View>
          <Toggle value={audio.hapticsEnabled} onChange={(v) => setAudioSettings({ hapticsEnabled: v })} />
        </Card>

        <Section title="使い方とサポート" />
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

        <Section title="このアプリについて" />
        <View style={{ gap: 8 }}>
          <ImgButton skin="ghost-outline" label="プライバシーポリシー" height={44} onPress={() => openLegal('privacy')} />
          <ImgButton skin="ghost-outline" label="利用規約" height={44} onPress={() => openLegal('terms')} />
          <ImgButton skin="ghost-outline" label="クレジット" height={44} onPress={() => setInfo('credits')} />
        </View>
        <Card skin="white" style={{ marginTop: 8, gap: 4 }}>
          <T w="x" size={13}>データについて</T>
          <T w="m" size={11} color={C.sub}>
            記録はこの端末の中だけに保存されます。機種変更のときの引き継ぎには、まだ対応していません。
          </T>
          <T w="b" size={11} color={C.accent} style={{ marginTop: 4 }} onPress={withSfx(() => confirmAction('すべての記録を消す', '迎えた猫・お迎え券・設定がすべて消えます。元に戻せません', '消す', g.reset))}>
            すべての記録を消して、はじめから
          </T>
          <T w="m" size={10} color={C.sub} style={{ marginTop: 4 }}>バージョン {APP_VERSION}</T>
        </Card>

        {__DEV__ && <Section title="開発用" />}
        {__DEV__ && (
          <View style={{ gap: 8 }}>
            <ImgButton skin="ghost-outline" label={`日付を1日進める（+${state.debugOffsetDays}日）`} height={44} onPress={() => g.shiftDays(1)} />
            <ImgButton skin="ghost-outline" label="日付をリセット" height={44} onPress={() => g.shiftDays(-state.debugOffsetDays)} />
            <ImgButton skin="ghost-outline" label="全キャラを開放" height={44} onPress={g.unlockAll} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <T w="x" size={15} style={s.h2}>{title}</T>;
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
  wrap: { padding: 16, paddingBottom: 40 },
  h2: { marginTop: 22, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepValue: { height: 28, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
});

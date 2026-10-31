import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Bobbing, C, CatImage, T } from './base';
import { ImgButton, Tap } from './kit';
import { Popup } from './Popup';
import { Pic } from './Slice';

// 取り消せない操作の最終確認。ポップの中央に対象（猫など）を大きく見せて、そこで決める。
// 迎える・使う・加入する・消す、すべてこのポップを基準にする（ブラウザ標準のダイアログは使わない）
export type ConfirmOpts = {
  catId?: string; // 対象の猫を大きく見せる
  catIds?: string[]; // 複数（まとめて迎えるとき）。先頭の3匹まで並べる
  silhouette?: boolean; // 猫の形だけ見せる
  pic?: string; // 猫の代わりに見せる画像（まだひらいていない候補の、共通のシルエットなど）
  picCount?: number; // その画像を並べる数（まとめてひらくとき。先頭の3匹まで）
  skin?: 'primary-orange' | 'primary-green'; // 決定ボタンの色
  cancelLabel?: string;
};
type Spec = { title: string; message?: string; okLabel: string; onOk: () => void } & ConfirmOpts;

// 使う画面の中に element を置く。ポップは OverlayHost に、開いた順に重なって出る（ほかのポップの上にも出る）
export function useConfirm() {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [last, setLast] = useState<Spec | null>(null);
  if (spec && spec !== last) setLast(spec); // 閉じるときの暗転のあいだも、文面を保つ
  const shown = spec ?? last;
  const close = () => setSpec(null);

  const confirm = (title: string, message: string | undefined, okLabel: string, onOk: () => void, opts: ConfirmOpts = {}) =>
    setSpec({ title, message, okLabel, onOk, ...opts });

  const cats = shown?.catIds?.slice(0, 3) ?? (shown?.catId ? [shown.catId] : []);
  const big = cats.length === 1;
  const pic = shown?.pic && !cats.length ? shown.pic : undefined;
  const hasPic = !!pic;
  const withArt = !!cats.length || hasPic;
  const art = shown && (
    <>
      {!!cats.length && (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {cats.map((id, i) => (
            <Bobbing key={id} delay={i * 200} style={{ marginLeft: i ? -14 : 0 }}>
              <CatImage id={id} size={big ? 190 : 104} silhouette={shown.silhouette} />
            </Bobbing>
          ))}
        </View>
      )}
      {pic && (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {Array.from({ length: Math.min(3, shown.picCount ?? 1) }, (_, i) => (
            <Bobbing key={i} delay={i * 200} style={{ marginLeft: i ? -18 : 0 }}>
              <Pic name={pic} height={(shown.picCount ?? 1) > 1 ? 112 : 170} />
            </Bobbing>
          ))}
        </View>
      )}
    </>
  );
  const element = (
    <Popup visible={!!spec} onClose={close} maxWidth={340} heightRatio={cats.length || hasPic ? 0.64 : 0.5}>
      {shown && (
        <View style={{ flex: 1, padding: 18, alignItems: 'center', justifyContent: withArt ? 'flex-start' : 'center', gap: 8 }}>
          <Tap onPress={close} accessibilityLabel="閉じる" style={{ position: 'absolute', right: 10, top: 10, zIndex: 2 }}>
            <Pic name="button/close-round" height={36} />
          </Tap>
          {/* 猫（や画像）は、見出しとボタンのあいだの空きの中央に置く。カード全体の中央に見える */}
          {withArt && <T w="x" size={18} style={{ textAlign: 'center', marginTop: 22 }}>{shown.title}</T>}
          {withArt && <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>{art}</View>}
          {withArt && !!shown.message && (
            <ScrollView style={{ flexGrow: 0, flexShrink: 1, maxHeight: 96, alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
              <T w="m" size={12} color={C.sub} style={{ textAlign: 'center', lineHeight: 18 }}>{shown.message}</T>
            </ScrollView>
          )}
          {!withArt && <T w="x" size={18} style={{ textAlign: 'center' }}>{shown.title}</T>}
          {!withArt && !!shown.message && (
            // 長い説明（自動更新の案内など）は、中でスクロールできる。ボタンは、いつも見える
            <ScrollView style={{ flexShrink: 1, alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
              <T w="m" size={12} color={C.sub} style={{ textAlign: 'center', lineHeight: 18 }}>{shown.message}</T>
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 10 }}>
            <ImgButton skin="ghost-outline" label={shown.cancelLabel ?? 'やめる'} height={48} fontSize={13} onPress={close} style={{ flex: 1 }} />
            <ImgButton
              skin={shown.skin ?? 'primary-orange'}
              label={shown.okLabel}
              height={48}
              fontSize={13}
              onPress={() => {
                close();
                shown.onOk();
              }}
              style={{ flex: 1.6 }}
            />
          </View>
        </View>
      )}
    </Popup>
  );
  return [confirm, element] as const;
}

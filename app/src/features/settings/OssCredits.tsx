import { useState } from 'react';
import notices from '../../data/ossNotices.json';
import { C, T } from '../../ui/base';
import { Card, Tap } from '../../ui/kit';

export function OssCredits() {
  const [selected, setSelected] = useState<string | null>(null);
  const licenses = [...new Set(notices.packages.map(p => p.license))].sort();
  return (
    <Card skin="white" style={{ gap: 12, marginTop: 8 }}>
      <T w="b" size={13}>オープンソースの通知</T>
      <T w="m" size={11} color={C.sub}>ライセンス名を押すと、パッケージ名・版・著作権表示・本文を読めます。開発用の道具を含め、依存情報から集めた通知です。</T>
      {licenses.map(license => {
        const packages = notices.packages.filter(p => p.license === license);
        const ids = new Set(packages.flatMap(p => p.documents.map(d => d.id)));
        return <Card key={license} skin="white" style={{ gap: 8 }}>
          <Tap onPress={() => setSelected(selected === license ? null : license)} accessibilityRole="button" accessibilityLabel={`${license}、${packages.length}件`}>
            <T w="b" size={12} color={C.accent}>{selected === license ? '閉じる' : 'ひらく'}　{license}（{packages.length}件）</T>
          </Tap>
          {selected === license && <>
            {packages.map(p => <T key={p.name + p.version} w="m" size={11} selectable>{p.name}　{p.version}{'\n'}{p.copyrights.length ? p.copyrights.join('\n') : '著作権表示は収集ファイルに見つかりませんでした。'}{p.documents.length ? '' : '\nルートのライセンスファイルは見つかりませんでした。'}</T>)}
            {notices.texts.filter(t => ids.has(t.id)).map(t => <T key={t.id} w="m" size={10} selectable style={{ lineHeight: 16 }}>{t.text}</T>)}
          </>}
        </Card>;
      })}
    </Card>
  );
}

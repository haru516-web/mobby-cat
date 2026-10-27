import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { C, CatImage, T } from '../../ui/base';
import { Card, Gauge, Header, Icon, ImgButton, Polaroid, Well, useTabPad, Tap } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';
import { ScreenProps } from '../../navigation';

// 旅猫・世界ミッションはバックエンド未接続のため、表示はすべてサンプル
const SAMPLE = {
  now: { key: 'japan', name: '日本' },
  visited: [
    { key: 'kenya', name: 'ケニア' },
    { key: 'france', name: 'フランス' },
    { key: 'japan', name: '日本' },
    { key: 'korea', name: '韓国' },
  ],
  mission: { value: 27, max: 30 },
  news: [
    { thumb: 'bg/news-thumb-1', title: '韓国で最初のユーザーが誕生！', body: 'つながりの輪が世界に広がっています。', date: '2026/10/12' },
    { thumb: 'bg/news-thumb-2', title: '旅猫が新しい国に到着！', body: '旅するモビーがフランスに到着しました。', date: '2026/10/08' },
    { thumb: 'bg/news-thumb-3', title: 'フランス限定モビー配布中！', body: '街をイメージした特別なねこモビーを期間限定でプレゼント。', date: '2026/10/05' },
  ],
};

const VIEWS = [
  { key: 'travel', label: '旅するモビー' }, { key: 'record', label: '記録' }, { key: 'news', label: 'お知らせ' },
] as const;

// 旅の記録（サンプル）。訪問者が残した定型スタンプと、滞在日数
const JOURNEY = [
  { key: 'kenya', name: 'ケニア', days: 6, stamp: 'あついね！', date: '9/18' },
  { key: 'france', name: 'フランス', days: 9, stamp: 'またきてね', date: '9/24' },
  { key: 'korea', name: '韓国', days: 5, stamp: 'ありがとう', date: '10/3' },
  { key: 'japan', name: '日本', days: 3, stamp: 'いらっしゃい', date: '10/8' },
];

export default function WorldScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const inner = width - 32;
  const pad = useTabPad();
  const stampW = (inner - 28 - 3 * 8) / 4;
  const [sheet, setSheet] = useState<'travel' | 'news' | null>(null);
  const [view, setView] = useState<'travel' | 'record' | 'news'>('travel'); // 1画面を短く保つため、内容を3つに分ける
  const soon = () => setSheet('travel');
  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-world" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 + pad }}>
        <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Slice name="badge/sample" style={s.sample}><T w="b" size={10} color="#fff">サンプル表示（サーバー未接続）</T></Slice>

          <View style={s.tabs}>
            {VIEWS.map((v) => (
              <Tap key={v.key} style={{ flex: 1 }} onPress={() => setView(v.key)}>
                <Slice name={view === v.key ? 'button/tab-all-on' : 'button/tab-normal'} style={s.tab}>
                  <T w="x" size={13} color={view === v.key ? '#fff' : C.ink}>{v.label}</T>
                </Slice>
              </Tap>
            ))}
          </View>

          {view === 'travel' && (<>
          <Card style={{ padding: 6 }}>
            <Well style={{ height: (inner - 12) * (900 / 1179) }}>
              <Pic name="bg/world-hero" width={inner - 12} style={StyleSheet.absoluteFill} />
              <View style={s.heroText}>
                <Pic name="brand/title-travel" height={44} />
                <Card skin="white" style={s.heroCopy}>
                  <T w="b" size={12}>ねこモビーたちといっしょに、{'\n'}世界中のすてきな場所をめぐりましょう！</T>
                </Card>
                <ImgButton label="旅の様子をみる" height={40} onPress={soon} style={{ width: 170, marginTop: 10 }} />
              </View>
              <View style={s.heroCat}><CatImage id="traveling-mobby" size={inner * 0.42} /></View>
            </Well>
          </Card>

          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="icon/pin" size={28} />
                <View style={{ marginLeft: 6 }}>
                  <T w="b" size={11} color={C.sub}>いまは</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pic name={`illust/flag-${SAMPLE.now.key}`} height={18} />
                    <T w="x" size={22}>{SAMPLE.now.name}</T>
                  </View>
                </View>
              </View>
              <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>
                ねこモビーたちが{SAMPLE.now.name}を旅しています。すてきな出会いを探し中…！
              </T>
            </View>
            <Polaroid width={104} style={{ marginLeft: 8, transform: [{ rotate: '4deg' }] }}>
              <Pic name="bg/photo-japan" width={104} />
            </Polaroid>
            <Pic name="illust/stamp-japan" height={56} style={{ position: 'absolute', right: 2, top: -6, opacity: 0.85 }} />
          </Card>

          </>)}

          {view === 'record' && (<>
          <Card>
            <Pic name="brand/title-visited" height={26} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {SAMPLE.visited.map((v) => (
                <View key={v.key} style={{ width: stampW, alignItems: 'center' }}>
                  <Pic name={`bg/stamp-photo-${v.key}`} width={stampW} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <Pic name={`illust/flag-${v.key}`} height={12} />
                    <T w="x" size={11}>{v.name}</T>
                  </View>
                </View>
              ))}
            </View>
            <Pic name="illust/dotted-route" width={inner - 28} style={{ marginTop: 6 }} />
          </Card>

          <Card>
            <Pic name="brand/title-world-mission" height={30} />
            <T w="m" size={12} color={C.sub} style={{ marginTop: 4 }}>みんなの力で、ねこモビーを{'\n'}世界のすべての国に連れていこう！</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}><Gauge value={SAMPLE.mission.value} max={SAMPLE.mission.max} color="yellow" height={18} /></View>
              {/* 数字と単位は縮めない（狭い幅で「か国」が2行に割れないように）。縮むのはゲージだけ */}
              <T w="x" size={20} color={C.accent} style={{ flexShrink: 0 }}>{SAMPLE.mission.value}/{SAMPLE.mission.max}</T>
              <T w="b" size={12} style={{ flexShrink: 0, marginLeft: -6 }}>か国</T>
            </View>
            <Pic name="illust/world-map" width={inner * 0.42} style={{ position: 'absolute', right: 8, top: 8, opacity: 0.9 }} />
          </Card>

          </>)}

          {view === 'news' && (<>
          <Pic name="brand/title-news" height={30} />
          {SAMPLE.news.map((n) => (
            <NewsCard key={n.title} n={n} full />
          ))}
          </>)}
        </View>
      </ScrollView>

      <Modal visible={!!sheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Backdrop name="bg/screen-world" />
          <View style={{ flex: 1, width }}>
            <View style={s.sheetHead}>
              <Pic name={sheet === 'news' ? 'brand/title-news' : 'brand/title-travel'} height={34} />
              <View style={{ flex: 1 }} />
              <Tap onPress={() => setSheet(null)} accessibilityLabel="閉じる"><Pic name="button/close-round" height={40} /></Tap>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
              <Slice name="badge/sample" style={s.sample}><T w="b" size={10} color="#fff">サンプル表示（サーバー未接続）</T></Slice>
              {sheet === 'news' ? (
                SAMPLE.news.map((n) => <NewsCard key={n.title} n={n} full />)
              ) : (
                <>
                  <Card style={{ alignItems: 'center' }}>
                    <CatImage id="traveling-mobby" size={140} />
                    <T w="x" size={16}>旅するモビー</T>
                    <T w="m" size={12} color={C.sub} style={{ textAlign: 'center', marginTop: 4 }}>
                      世界に1匹だけの旅猫。訪れた人が残したスタンプが、旅の記録になっていきます
                    </T>
                    <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
                      <Stat label="訪れた国" value={`${JOURNEY.length}か国`} />
                      <Stat label="旅した日数" value={`${JOURNEY.reduce((a, j) => a + j.days, 0)}日`} />
                    </View>
                  </Card>
                  {JOURNEY.map((j, i) => (
                    <Card key={j.key} skin="white" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                      <Pic name={`bg/stamp-photo-${j.key}`} width={84} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pic name={`illust/flag-${j.key}`} height={14} />
                          <T w="x" size={14}>{j.name}</T>
                          <T w="m" size={11} color={C.sub}>{j.date}〜 {j.days}日間</T>
                        </View>
                        <Slice name="panel/speech-bubble" style={s.stamp}><T w="b" size={12}>「{j.stamp}」</T></Slice>
                      </View>
                      {i === JOURNEY.length - 1 && <Pic name="icon/pin" height={26} />}
                    </Card>
                  ))}
                  <T w="m" size={11} color={C.sub}>
                    本番では、訪問者が定型のスタンプを1つだけ残せます。住所や細かな位置は公開しません（企画書 6.3）
                  </T>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type News = (typeof SAMPLE.news)[number];
function NewsCard({ n, full, onPress }: { n: News; full?: boolean; onPress?: () => void }) {
  return (
    <Tap onPress={onPress} disabled={!onPress}>
      <Card skin="white" style={{ flexDirection: 'row', gap: 10, padding: 10 }}>
        <Well style={{ width: 76, height: 76 }}><Pic name={n.thumb} height={72} /></Well>
        <View style={{ flex: 1 }}>
          <T w="x" size={13} numberOfLines={full ? undefined : 1}>{n.title}</T>
          <T w="m" size={11} color={C.sub} style={{ marginTop: 3 }} numberOfLines={full ? undefined : 2}>{n.body}</T>
          <T w="m" size={10} color={C.sub} style={{ marginTop: 'auto', textAlign: 'right' }}>{n.date}</T>
        </View>
      </Card>
    </Tap>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T w="m" size={11} color={C.sub}>{label}</T>
      <T w="x" size={18} color={C.accent}>{value}</T>
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { height: 38, alignItems: 'center', justifyContent: 'center' },
  sample: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 12, top: 12, right: 12 },
  heroCopy: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12 },
  heroCat: { position: 'absolute', right: -6, bottom: -10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  stamp: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 },
});

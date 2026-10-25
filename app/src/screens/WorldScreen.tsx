import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { C, CatImage, T } from '../ui/base';
import { Card, Gauge, Header, Icon, ImgButton, Polaroid, Well } from '../ui/kit';
import { Backdrop, Pic, Slice } from '../ui/Slice';
import { ScreenProps } from './types';

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

const soon = () => Alert.alert('旅するモビー', '旅猫の機能はサーバー接続後に公開予定です');

export default function WorldScreen({ openShop, width }: ScreenProps) {
  const inner = width - 32;
  const stampW = (inner - 28 - 3 * 8) / 4;
  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-world" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Header onShop={openShop} onBell={openShop} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Slice name="badge/sample" style={s.sample}><T w="b" size={10} color="#fff">サンプル表示（サーバー未接続）</T></Slice>

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
                ねこモビーたちが{SAMPLE.now.name}を旅しています{'\n'}すてきな出会いを探し中…！
              </T>
            </View>
            <Polaroid width={104} style={{ marginLeft: 8, transform: [{ rotate: '4deg' }] }}>
              <Pic name="bg/photo-japan" width={104} />
            </Polaroid>
            <Pic name="illust/stamp-japan" height={56} style={{ position: 'absolute', right: 2, top: -6, opacity: 0.85 }} />
          </Card>

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
              <T w="x" size={20} color={C.accent}>{SAMPLE.mission.value}/{SAMPLE.mission.max}</T>
              <T w="b" size={12}>か国</T>
            </View>
            <Pic name="illust/world-map" width={inner * 0.42} style={{ position: 'absolute', right: 8, top: 8, opacity: 0.9 }} />
          </Card>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pic name="brand/title-news" height={30} />
            <T w="b" size={12} color={C.sub} onPress={soon}>すべて見る</T>
          </View>
          {SAMPLE.news.map((n) => (
            <Card key={n.title} skin="white" style={{ flexDirection: 'row', gap: 10, padding: 10 }}>
              <Well style={{ width: 76, height: 76 }}><Pic name={n.thumb} height={72} /></Well>
              <View style={{ flex: 1 }}>
                <T w="x" size={13} numberOfLines={1}>{n.title}</T>
                <T w="m" size={11} color={C.sub} style={{ marginTop: 3 }} numberOfLines={2}>{n.body}</T>
                <T w="m" size={10} color={C.sub} style={{ marginTop: 'auto', textAlign: 'right' }}>{n.date}</T>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sample: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 12, top: 12, right: 12 },
  heroCopy: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12 },
  heroCat: { position: 'absolute', right: -6, bottom: -10 },
});

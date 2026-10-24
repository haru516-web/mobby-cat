import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { C, T } from '../ui/base';
import { Card, Gauge, Header, Icon, ImgButton, Polaroid } from '../ui/kit';
import { Pic } from '../ui/Slice';
import { ScreenProps } from './types';

// 旅猫・世界ミッションはバックエンド未接続のため、表示はすべてサンプル
const SAMPLE = {
  now: { flag: '🇯🇵', name: '日本' },
  visited: [
    { key: 'kenya', flag: '🇰🇪', name: 'ケニア' },
    { key: 'france', flag: '🇫🇷', name: 'フランス' },
    { key: 'japan', flag: '🇯🇵', name: '日本' },
    { key: 'korea', flag: '🇰🇷', name: '韓国' },
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
  const stampW = (width - 32 - 28 - 3 * 8) / 4;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header onShop={openShop} onBell={openShop} />
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={s.sample}><T w="b" size={10} color="#fff">サンプル表示（サーバー未接続）</T></View>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Pic name="bg/world-hero" width={width - 32} />
          <View style={s.heroText}>
            <Pic name="brand/title-travel" height={44} fallback={<T w="x" size={26}>旅するモビー</T>} />
            <T w="b" size={12} style={{ marginTop: 6, textShadowColor: '#fff', textShadowRadius: 6 }}>
              ねこモビーたちといっしょに、{'\n'}世界中のすてきな場所をめぐりましょう！
            </T>
            <ImgButton label="旅の様子をみる ›" height={40} onPress={soon} style={{ width: 170, marginTop: 10 }} />
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="icon/pin" size={28} />
              <View style={{ marginLeft: 6 }}>
                <T w="b" size={11} color={C.sub}>いまは</T>
                <T w="x" size={22}>{SAMPLE.now.flag} {SAMPLE.now.name}</T>
              </View>
            </View>
            <T w="m" size={12} color={C.sub} style={{ marginTop: 6 }}>
              ねこモビーたちが{SAMPLE.now.name}を旅しています{'\n'}すてきな出会いを探し中…！
            </T>
          </View>
          <Polaroid width={104} style={{ marginLeft: 8, transform: [{ rotate: '4deg' }] }}>
            <Pic name="bg/photo-japan" width={104} />
          </Polaroid>
          <Pic name="illust/stamp-japan" height={60} style={{ position: 'absolute', right: 6, top: 4, opacity: 0.8 }} />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="icon/flag" size={18} />
            <T w="x" size={14} style={{ marginLeft: 6 }}>これまでに訪れた国</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {SAMPLE.visited.map((v) => (
              <View key={v.key} style={{ width: stampW, alignItems: 'center' }}>
                <Pic name={`bg/stamp-photo-${v.key}`} width={stampW} />
                <T w="x" size={11} style={{ marginTop: 4 }}>{v.flag} {v.name}</T>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Pic name="brand/title-world-mission" height={30} fallback={<T w="x" size={18}>世界ミッション</T>} />
          <T w="m" size={12} color={C.sub} style={{ marginTop: 4 }}>みんなの力で、ねこモビーを{'\n'}世界のすべての国に連れていこう！</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}><Gauge value={SAMPLE.mission.value} max={SAMPLE.mission.max} color="yellow" height={18} /></View>
            <T w="x" size={20} color={C.accent}>{SAMPLE.mission.value}/{SAMPLE.mission.max}</T>
            <T w="b" size={12}>か国</T>
          </View>
          <Pic name="illust/world-map" width={(width - 32) * 0.45} style={{ position: 'absolute', right: 8, top: 8, opacity: 0.9 }} />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pic name="brand/title-news" height={30} fallback={<T w="x" size={18}>世界のニュース</T>} />
          <T w="b" size={12} color={C.sub} onPress={soon}>すべて見る ›</T>
        </View>
        {SAMPLE.news.map((n) => (
          <Card key={n.title} skin="white" style={{ flexDirection: 'row', gap: 10, padding: 10 }}>
            <Pic name={n.thumb} height={76} />
            <View style={{ flex: 1 }}>
              <T w="x" size={13} numberOfLines={1}>{n.title}</T>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 3 }} numberOfLines={2}>{n.body}</T>
              <T w="m" size={10} color={C.sub} style={{ marginTop: 'auto', textAlign: 'right' }}>{n.date}</T>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  sample: { alignSelf: 'flex-start', backgroundColor: '#B9A08B', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  heroText: { position: 'absolute', left: 14, top: 14, right: 14 },
});

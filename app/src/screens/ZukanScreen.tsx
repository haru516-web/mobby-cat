import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATS, CatDef } from '../data/catalog';
import { CONDITION_HINTS } from '../lib/encounter';
import { useGame } from '../state/game';
import { C, CatImage, FONT, T, catNo } from '../ui/base';
import { Card, Gauge, Header, Icon, ImgButton, RarityBadge } from '../ui/kit';
import { Pic, Slice } from '../ui/Slice';
import { ScreenProps } from './types';

type Filter = 'all' | 'normal' | 'rare' | 'limited';
const FILTERS: { key: Filter; label: string; skin: string; color: string }[] = [
  { key: 'all', label: 'すべて', skin: 'button/tab-all-on', color: '#fff' },
  { key: 'normal', label: 'ノーマル', skin: 'button/tab-normal', color: C.ink },
  { key: 'rare', label: 'レア', skin: 'button/tab-rare', color: '#2F5DA8' },
  { key: 'limited', label: '限定', skin: 'button/tab-limited', color: '#6A4FB0' },
];

const isLimited = (c: CatDef) => !!CONDITION_HINTS[c.id];
const match = (c: CatDef, f: Filter) =>
  f === 'all' ? true : f === 'limited' ? isLimited(c) : f === 'rare' ? !isLimited(c) && c.rarity >= 3 : !isLimited(c) && c.rarity <= 2;

export default function ZukanScreen({ openShop, width }: ScreenProps) {
  const { state, toggleFavorite } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  const have = CATS.filter((c) => state.owned[c.id]).length;
  const list = useMemo(
    () => CATS.filter((c) => match(c, filter) && (!q || (state.owned[c.id] && c.name.includes(q)))),
    [filter, q, state.owned],
  );
  const cellW = (width - 32 - 3 * 8) / 4;
  const cat = sel ? CATS.find((c) => c.id === sel) : undefined;
  const o = sel ? state.owned[sel] : undefined;
  const fav = !!sel && state.favorites.includes(sel);
  const mascot = CATS.find((c) => state.owned[c.id]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: cat ? 300 : 24 }}>
        <Header onShop={openShop} onBell={openShop} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Card style={s.collection}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pic name="brand/title-collection" height={30} fallback={<T w="x" size={16}>コレクション</T>} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 }}>
                  <T w="x" size={26}>{have}</T>
                  <T w="b" size={14} color={C.sub} style={{ marginBottom: 3 }}>/{CATS.length}</T>
                </View>
              </View>
              <View style={{ marginTop: 8 }}><Gauge value={have} max={CATS.length} /></View>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 6 }}>たくさんのねこモビーに出会いましょう！</T>
            </View>
            {mascot && <CatImage id={mascot.id} size={72} />}
          </Card>

          <Slice name="button/search-bar" style={s.search} fallback={{ borderRadius: 25 }}>
            <View>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="ねこモビーを検索"
                placeholderTextColor="#B4A596"
                style={[s.searchInput, { fontFamily: FONT.b }]}
              />
            </View>
          </Slice>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTERS.map((f) => {
              const on = filter === f.key;
              const skin = f.key === 'all' && !on ? 'button/tab-normal' : f.skin;
              return (
                <Pressable key={f.key} style={{ flex: 1, opacity: on || f.key === 'all' ? 1 : 0.72, transform: [{ scale: on ? 1.04 : 1 }] }} onPress={() => setFilter(f.key)}>
                  <Slice name={skin} style={s.filter} fallback={{ borderRadius: 20 }}>
                    <T w="x" size={13} color={f.key === 'all' && !on ? C.ink : f.color}>{f.label}</T>
                  </Slice>
                </Pressable>
              );
            })}
          </View>

          <View style={s.grid}>
            {list.map((c) => {
              const own = state.owned[c.id];
              const on = sel === c.id;
              return (
                <Pressable key={c.id} style={{ width: cellW }} onPress={() => setSel(on ? null : c.id)}>
                  <Card skin={on ? 'selected' : 'white'} style={{ padding: 4 }}>
                    {own ? (
                      <View style={[s.photo, { height: cellW - 8 }]}><CatImage id={c.id} size={cellW - 8} /></View>
                    ) : (
                      <Pic name="panel/card-locked" width={cellW - 8} fallback={<View style={[s.photo, { height: cellW - 8 }]}><CatImage id={c.id} size={cellW - 12} silhouette /></View>} />
                    )}
                    <View style={{ paddingHorizontal: 4, paddingTop: 3 }}>
                      <T w="m" size={9} color={C.sub}>No.{catNo(c.id)}</T>
                      <T w="x" size={10} numberOfLines={1}>{own ? c.name : '???'}</T>
                    </View>
                    {own && own.count > 1 && <T w="x" size={10} color={C.accent} style={s.count}>×{own.count}</T>}
                    {state.favorites.includes(c.id) && <View style={s.favMark}><Icon name="icon/heart-on" size={14} /></View>}
                  </Card>
                </Pressable>
              );
            })}
          </View>
          {list.length === 0 && <T w="b" size={13} color={C.sub} style={{ textAlign: 'center' }}>見つかりませんでした</T>}
        </View>
      </ScrollView>

      {cat && (
        <Card style={s.sheet}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={s.bigPhoto}>
              <CatImage id={cat.id} size={130} silhouette={!o} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="m" size={11} color={C.sub}>No.{catNo(cat.id)}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <T w="x" size={20}>{o ? cat.name : '???'}</T>
                <RarityBadge cat={cat} limited={isLimited(cat)} height={20} />
              </View>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 4 }}>
                {o ? (o.firstReason ? `「${o.firstReason}」に出会った子` : 'ふらりと遊びに来てくれた子') : CONDITION_HINTS[cat.id] ?? 'まだ出会っていません。いつかの出会いを待とう'}
              </T>
              {o && (
                <View style={s.table}>
                  <Row k="出会った日" v={o.firstDay.replace(/-/g, '/')} />
                  <Row k="所持数" v={`${o.count}`} />
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {o && (
              <Pressable style={{ flex: 1 }} onPress={() => toggleFavorite(cat.id)}>
                <Slice name={fav ? 'button/chip-favorite-on' : 'button/chip-favorite-off'} style={s.favBtn} fallback={{ borderRadius: 22 }}>
                  <T w="x" size={13} style={{ marginLeft: 26 }}>{fav ? 'お気に入り中' : 'お気に入り'}</T>
                </Slice>
              </Pressable>
            )}
            <ImgButton label="閉じる" height={44} onPress={() => setSel(null)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <T w="m" size={11} color={C.sub}>{k}</T>
      <T w="b" size={12}>{v}</T>
    </View>
  );
}

const s = StyleSheet.create({
  collection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  vline: { width: 1, alignSelf: 'stretch', backgroundColor: C.line },
  search: { height: 48, justifyContent: 'center' },
  searchInput: { marginLeft: 88, marginRight: 44, fontSize: 14, color: C.ink, height: 44 } as never,
  filter: { height: 38, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { backgroundColor: '#F7EDE1', borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  count: { position: 'absolute', top: 6, right: 8 },
  favMark: { position: 'absolute', top: 4, left: 4 },
  sheet: { position: 'absolute', left: 10, right: 10, bottom: 8 },
  bigPhoto: { width: 130, height: 130, borderRadius: 16, backgroundColor: '#F7EDE1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  table: { marginTop: 6, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  favBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
});

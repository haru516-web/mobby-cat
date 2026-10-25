import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATS, CatDef } from '../../data/catalog';
import { HINTS, PENDING, TRAVEL_HINT, WORLD_HINT } from '../../core/conditions';
import { useGame } from '../../core/game';
import { C, CatImage, FONT, T, catNo } from '../../ui/base';
import { Card, Gauge, Header, Icon, ImgButton, RarityBadge, Well, useTabPad, Tap } from '../../ui/kit';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';
import { ScreenProps } from '../../navigation';

type Filter = 'all' | 'normal' | 'rare' | 'limited';
const FILTERS: { key: Filter; label: string; skin: string; color: string }[] = [
  { key: 'all', label: 'すべて', skin: 'button/tab-all-on', color: '#fff' },
  { key: 'normal', label: 'ノーマル', skin: 'button/tab-normal', color: C.ink },
  { key: 'rare', label: 'レア', skin: 'button/tab-rare', color: '#2F5DA8' },
  { key: 'limited', label: '限定', skin: 'button/tab-limited', color: '#6A4FB0' },
];

// 「限定」= 条件で出会う猫と世界の猫。ノーマル / レア は毎日の抽選に入る猫
const isLimited = (c: CatDef) => c.kind !== 'breed' && c.kind !== 'series';
const match = (c: CatDef, f: Filter) =>
  f === 'all' ? true : f === 'limited' ? isLimited(c) : f === 'rare' ? !isLimited(c) && c.rarity >= 3 : !isLimited(c) && c.rarity <= 2;

function hint(c: CatDef) {
  if (c.kind === 'world') return WORLD_HINT;
  if (c.kind === 'travel') return TRAVEL_HINT;
  if (PENDING[c.id]) return `${HINTS[c.id] ?? ''}（${PENDING[c.id]}）`;
  return HINTS[c.id] ?? 'まだ出会っていません。いつかの出会いを待とう';
}

export default function ZukanScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const { state, toggleFavorite } = useGame();
  const pad = useTabPad();
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
      <Backdrop name="bg/screen-zukan" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (cat ? 300 : 24) + pad }}>
        <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Card style={s.collection}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pic name="brand/title-collection" height={width < 360 ? 24 : 30} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 }}>
                  <T w="x" size={26}>{have}</T>
                  <T w="b" size={14} color={C.sub} style={{ marginBottom: 3 }}>/{CATS.length}</T>
                </View>
              </View>
              <View style={{ marginTop: 8 }}><Gauge value={have} max={CATS.length} /></View>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 6 }}>たくさんのねこモビーに出会いましょう！</T>
            </View>
            {mascot && <CatImage id={mascot.id} size={width < 360 ? 52 : 72} />}
          </Card>

          <Slice name="button/search-bar" style={s.search}>
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
                <Tap key={f.key} style={{ flex: 1, opacity: on || f.key === 'all' ? 1 : 0.72, transform: [{ scale: on ? 1.04 : 1 }] }} onPress={() => setFilter(f.key)}>
                  <Slice name={skin} style={s.filter}>
                    <T w="x" size={13} color={f.key === 'all' && !on ? C.ink : f.color}>{f.label}</T>
                  </Slice>
                </Tap>
              );
            })}
          </View>

          {/* 1マス = 正方形の画像1〜2枚＋文字。数が多いのでマスごとの9スライスは使わず、一覧全体を1枚のパネルに載せる */}
          <Card style={[s.grid, { marginHorizontal: -6, paddingHorizontal: 6 }]}>
            {list.map((c) => {
              const own = state.owned[c.id];
              const on = sel === c.id;
              return (
                <Tap key={c.id} style={{ width: cellW }} onPress={() => setSel(on ? null : c.id)}>
                  <View style={{ width: cellW, height: cellW }}>
                    <Pic
                      name={on ? 'panel/card-selected' : own ? 'panel/photo-well' : 'panel/card-locked'}
                      width={cellW}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={s.cellCat}>
                      {own ? <CatImage id={c.id} size={cellW - 10} /> : <Icon name="icon/lock" size={cellW * 0.34} />}
                    </View>
                    {!!own && own.count > 1 && (
                      <Slice name="badge/owned-count" style={s.count}><T w="x" size={10} color={C.accent}>×{own.count}</T></Slice>
                    )}
                    {state.favorites.includes(c.id) && <Icon name="icon/heart-on" size={16} style={s.favMark} />}
                  </View>
                  <T w="m" size={9} color={C.sub} style={{ marginTop: 3 }}>No.{catNo(c.id)}</T>
                  <T w="x" size={10} numberOfLines={1}>{own ? c.name : '???'}</T>
                </Tap>
              );
            })}
          </Card>
          {list.length === 0 && <T w="b" size={13} color={C.sub} style={{ textAlign: 'center' }}>見つかりませんでした</T>}
        </View>
      </ScrollView>

      {cat && (
        // 下端が開いたシートを画面の下端まで伸ばし、ナビバーの後ろから出てくるように見せる
        <Slice name="panel/sheet-detail" style={[s.sheet, { paddingBottom: pad + 14 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Well style={s.bigPhoto}>
              {o ? <CatImage id={cat.id} size={124} /> : <Pic name="cat/silhouette-locked" width={124} />}
            </Well>
            <View style={{ flex: 1 }}>
              <T w="m" size={11} color={C.sub}>No.{catNo(cat.id)}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <T w="x" size={20}>{o ? cat.name : '???'}</T>
                <RarityBadge cat={cat} height={20} />
              </View>
              <T w="m" size={11} color={C.sub} style={{ marginTop: 4 }}>
                {o ? (o.firstReason ? `「${o.firstReason}」に出会った子` : 'ふらりと遊びに来てくれた子') : hint(cat)}
              </T>
              {o && (
                <Slice name="panel/info-table" style={s.table}>
                  <Row icon="icon/calendar-small" k="出会った日" v={o.firstDay.replace(/-/g, '/')} />
                  <Stretch name="panel/divider-h" style={{ height: 4 }} />
                  <Row icon="icon/box" k="所持数" v={`${o.count}`} />
                </Slice>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {o && (
              <Tap style={{ flex: 1 }} onPress={() => toggleFavorite(cat.id)}>
                <Slice name={fav ? 'button/chip-favorite-on' : 'button/chip-favorite-off'} style={s.favBtn}>
                  <T w="x" size={13} style={{ marginLeft: 26 }}>{fav ? 'お気に入り中' : 'お気に入り'}</T>
                </Slice>
              </Tap>
            )}
            <ImgButton label="閉じる" height={44} onPress={() => setSel(null)} style={{ flex: 1 }} />
          </View>
        </Slice>
      )}
    </View>
  );
}

function Row({ icon, k, v }: { icon: string; k: string; v: string }) {
  return (
    <View style={s.row}>
      <Icon name={icon} size={16} />
      <T w="m" size={11} color={C.sub} style={{ marginLeft: 6, flex: 1 }}>{k}</T>
      <T w="b" size={12}>{v}</T>
    </View>
  );
}

const s = StyleSheet.create({
  collection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  search: { height: 48, justifyContent: 'center' },
  searchInput: { marginLeft: 64, marginRight: 30, fontSize: 14, color: C.ink, height: 44 } as never,
  filter: { height: 38, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cellCat: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', top: 2, right: 2, height: 18, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  favMark: { position: 'absolute', top: 2, left: 2 },
  // 上の 40pt は角丸とつまみ、左右の 30pt は縁取り（9スライスの端）
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 34, paddingHorizontal: 24 },
  bigPhoto: { width: 130, height: 130 },
  table: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  favBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
});

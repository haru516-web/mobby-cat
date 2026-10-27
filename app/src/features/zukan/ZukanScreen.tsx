import { ComponentRef, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATS, CatDef } from '../../data/catalog';
import { HINTS, PENDING, TRAVEL_HINT, WORLD_HINT } from '../../core/conditions';
import { recipeOf, shownRarity } from '../../core/recipes';
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

// 「限定」= 世界の猫と旅猫。それ以外は、出会う条件の数と難しさで決まるレア度で分ける
const isLimited = (c: CatDef) => c.kind === 'world' || c.kind === 'travel';
const match = (c: CatDef, f: Filter) =>
  f === 'all' ? true : f === 'limited' ? isLimited(c) : f === 'rare' ? !isLimited(c) && shownRarity(c) >= 3 : !isLimited(c) && shownRarity(c) <= 2;

function hint(c: CatDef) {
  if (c.kind === 'world') return WORLD_HINT;
  if (c.kind === 'travel') return TRAVEL_HINT;
  if (PENDING[c.id]) return `${HINTS[c.id] ?? ''}（${PENDING[c.id]}）`;
  // 簡単な条件はそのまま見せる。個性のある猫の難しい条件は、ヒントだけ
  const rec = recipeOf(c);
  if (!rec) return HINTS[c.id] ?? 'まだ出会っていません。いつかの出会いを待とう';
  const lines = rec.atoms.map((a) => `・${a.label}`);
  if (rec.signature) lines.push(`・${HINTS[c.id] ?? '？？？'}`);
  return ['出会う条件（すべてそろうと会えます）', ...lines].join('\n');
}

export default function ZukanScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const { state, toggleFavorite } = useGame();
  const pad = useTabPad();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [showTop, setShowTop] = useState(false); // 下までスクロールしたら「トップへ」を出す

  const have = CATS.filter((c) => state.owned[c.id]).length;
  const list = useMemo(
    () => CATS.filter((c) => match(c, filter) && (!q || (state.owned[c.id] && c.name.includes(q)))),
    [filter, q, state.owned],
  );
  const cellW = Math.floor((width - 42 - 3 * 8) / 4);
  const cat = sel ? CATS.find((c) => c.id === sel) : undefined;
  const o = sel ? state.owned[sel] : undefined;
  const fav = !!sel && state.favorites.includes(sel);
  const mascot = CATS.find((c) => state.owned[c.id]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-zukan" />
      <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
      {/* 上の集計・検索・絞り込みは固定して、猫の一覧だけスクロールする */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Card style={s.collection}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pic name="brand/title-collection" height={width < 360 ? 24 : 30} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 }}>
                  <T w="x" size={26}>{have}</T>
                  <T w="b" size={14} color={C.sub} style={{ marginBottom: 3 }}>/{CATS.length}</T>
                </View>
              </View>
              <View style={{ marginTop: 6 }}><Gauge value={have} max={CATS.length} /></View>
            </View>
            {mascot && <CatImage id={mascot.id} size={width < 360 ? 52 : 72} />}
          </Card>

          <Slice name="button/search-bar" style={s.search}>
            <View>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="にゃこモビーを検索"
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

        </View>
      {/* 一覧のパネル（丸い角）は固定して、中の猫だけがスクロールする */}
      <View style={{ flex: 1, paddingHorizontal: 10, marginTop: 10, marginBottom: pad - 6 }}>
          {/* 1マス = 正方形の画像1〜2枚＋文字。数が多いのでマスごとの9スライスは使わず、一覧全体を1枚のパネルに載せる */}
          <Card style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 8, overflow: 'hidden' }}>
            <ScrollView ref={listRef} scrollEventThrottle={64} onScroll={(e) => setShowTop(e.nativeEvent.contentOffset.y > 400)} showsVerticalScrollIndicator={false} contentContainerStyle={[s.grid, { paddingHorizontal: 4, paddingVertical: 6, paddingBottom: cat ? 290 : 10 }]}>
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
                      <CatImage id={c.id} size={cellW - 10} silhouette={!own} />
                    </View>
                    {!!own && own.count > 1 && (
                      <Slice name="badge/owned-count" style={s.count}><T w="x" size={10} color={C.accent}>×{own.count}</T></Slice>
                    )}
                    {state.favorites.includes(c.id) && <Icon name="icon/heart-on" size={16} style={s.favMark} />}
                  </View>
                  <T w="m" size={9} color={C.sub} style={{ marginTop: 3 }}>No.{catNo(c.id)}</T>
                  <T w="x" size={9} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 11, minHeight: 22 }}>{own ? c.name : '???'}</T>
                </Tap>
              );
            })}
            {list.length === 0 && <T w="b" size={13} color={C.sub} style={{ textAlign: 'center', width: '100%', marginTop: 20 }}>見つかりませんでした</T>}
            </ScrollView>
            {showTop && (
              <Tap style={s.toTop} onPress={() => listRef.current?.scrollTo({ y: 0, animated: true })} accessibilityLabel="トップにもどる">
                <Pic name="login/arrow-next" height={46} style={{ transform: [{ rotate: '-90deg' }] }} />
              </Tap>
            )}
          </Card>
      </View>

      {cat && (
        // 下端が開いたシートを画面の下端まで伸ばし、ナビバーの後ろから出てくるように見せる
        <Slice name="panel/sheet-detail" style={[s.sheet, { paddingBottom: pad + 14 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Well style={s.bigPhoto}>
              <CatImage id={cat.id} size={124} silhouette={!o} />
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
  toTop: { position: 'absolute', right: 10, bottom: 10, zIndex: 5 },
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

import { ComponentRef, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATS, CatDef } from '../../data/catalog';
import { HINTS, PENDING, TRAVEL_HINT, WORLD_HINT } from '../../core/conditions';
import { recipeOf, shownRarity } from '../../core/recipes';
import { homeSlotsOf, useGame } from '../../core/game';
import { C, CatImage, FONT, T, catNo } from '../../ui/base';
import { Gauge, Header, Icon, ImgButton, RarityBadge, useTabPad, Tap, WORLD_ON } from '../../ui/kit';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';
import { ScreenProps } from '../../navigation';

type Filter = 'normal' | 'rare' | 'fav';
const FILTERS: { key: Filter; label: string; icon?: string }[] = [
  { key: 'normal', label: 'ノーマル' },
  { key: 'rare', label: 'レア', icon: 'icon/sparkle-rare' },
  { key: 'fav', label: 'お気に入り', icon: 'icon/star-fav' },
];

const isLimited = (c: CatDef) => c.kind === 'world' || c.kind === 'travel';
const ZUKAN_CATS = CATS.filter((c) => WORLD_ON || !isLimited(c));

// Match width variants, hiragana and katakana without changing the displayed name.
function searchKey(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function hint(c: CatDef) {
  if (c.kind === 'world') return WORLD_HINT;
  if (c.kind === 'travel') return TRAVEL_HINT;
  if (PENDING[c.id]) return `${HINTS[c.id] ?? ''}（${PENDING[c.id]}）`;
  const rec = recipeOf(c);
  if (!rec) return HINTS[c.id] ?? 'まだ出会っていません。いつかの出会いを待とう';
  const lines = rec.atoms.map((a) => `・${a.label}`);
  if (rec.signature) lines.push(`・${HINTS[c.id] ?? '？？？'}`);
  return ['出会う条件（すべてそろうと会えます）', ...lines].join('\n');
}

export default function ZukanScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const { state, toggleFavorite } = useGame();
  const pad = useTabPad();
  const [filter, setFilter] = useState<Filter>('normal');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [showTop, setShowTop] = useState(false);

  const have = ZUKAN_CATS.filter((c) => state.owned[c.id]).length;
  const list = useMemo(() => {
    const query = searchKey(q);
    return ZUKAN_CATS.filter((cat) => {
      if (filter === 'fav' && !state.favorites.includes(cat.id)) return false;
      if (!query) return filter === 'fav' || (shownRarity(cat) >= 3) === (filter === 'rare');
      return searchKey(cat.name).includes(query);
    });
  }, [filter, q, state.favorites]);

  const cellW = Math.floor((width - 54) / 4);
  const cellH = cellW * (570 / 480);
  const cat = sel ? CATS.find((c) => c.id === sel) : undefined;
  const o = sel ? state.owned[sel] : undefined;
  const fav = !!sel && state.favorites.includes(sel);
  const mascot = homeSlotsOf(state).find((id): id is string => !!id);

  const titleWidth = Math.min(width - 72, 286);
  const titleHeight = titleWidth / 3;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-zukan" bleed />
      <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />

      <View style={[s.titleWrap, { height: titleHeight }]}>
        <View style={{ width: titleWidth, height: titleHeight }}>
          <Pic name="brand/title-collection" width={titleWidth} />
        <View pointerEvents="none" style={[s.titleText, { top: titleHeight * 0.39, bottom: titleHeight * 0.16 }]}>
          <T w="x" size={21} numberOfLines={1} adjustsFontSizeToFit color="#FFF0CA" style={s.titleMain}>コレクション</T>
          <T w="b" size={12} numberOfLines={1} adjustsFontSizeToFit color="#FFF0CA" style={s.titleSub}>にゃこモビー図鑑</T>
        </View>
        </View>
        <Pic name="illust/maneki-neko" height={34} style={s.maneki} />
      </View>

      <View style={s.topContent}>
        <Slice name="panel/card-parchment" style={s.progressCard}>
          <View style={s.progressBody}>
            <T w="x" size={12} style={{ textAlign: 'center' }}>図鑑達成率</T>
            <View style={s.progressCount}>
              <Pic name="icon/laurel-left" height={30} />
              <T w="x" size={26}>{have}</T>
              <T w="b" size={13} color={C.sub}>/ {ZUKAN_CATS.length}</T>
              <Pic name="icon/laurel-right" height={30} />
            </View>
            <View style={s.gauge}><Gauge value={have} max={ZUKAN_CATS.length} height={12} /></View>
          </View>
          <View style={s.progressRight}>
            {mascot ? <CatImage id={mascot} size={60} /> : <Pic name="illust/maneki-neko" height={44} />}
            {have === ZUKAN_CATS.length && (
              <View style={s.completeRibbon}>
                <Pic name="badge/complete-ribbon" width={100} />
                <T w="x" size={9} style={s.completeText}>コンプリート！</T>
              </View>
            )}
          </View>
        </Slice>

        <Slice name="button/search-bar" style={s.search}>
          <TextInput
            value={q}
            onChangeText={(value) => {
              setQ(value);
              setSel(null);
              listRef.current?.scrollTo({ y: 0, animated: false });
            }}
            placeholder="にゃこモビーを検索"
            placeholderTextColor="#705B49"
            accessibilityLabel="にゃこモビーを検索"
            returnKeyType="search"
            style={[s.searchInput, { fontFamily: FONT.b }]}
          />
        </Slice>

        <View style={s.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Tap
                key={f.key}
                style={s.actionFlex}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                accessibilityState={{ selected: on }}
              >
                <Slice name={on ? 'button/chip-on' : 'button/chip'} style={s.filterChip}>
                  {f.icon && <Icon name={f.icon} size={14} style={s.chipIcon} />}
                  <T w="x" size={13} color={on ? '#fff' : C.ink} style={f.icon ? s.chipLabelWithIcon : undefined}>{f.label}</T>
                </Slice>
              </Tap>
            );
          })}
        </View>
      </View>

      <View style={[s.listWrap, { marginBottom: pad + 6 }]}>
        <Slice name="panel/card-parchment" style={StyleSheet.absoluteFill} />
        <ScrollView
          ref={listRef}
          scrollEventThrottle={64}
          onScroll={(e) => setShowTop(e.nativeEvent.contentOffset.y > 400)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.grid}
        >
          {list.map((c) => {
            const own = state.owned[c.id];
            const on = sel === c.id;
            const isFav = state.favorites.includes(c.id);
            return (
              <View key={c.id} style={{ width: cellW, height: cellH }}>
                <Tap
                  onPress={() => setSel(on ? null : c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${own ? c.name : '未所持のにゃこモビー'}, No.${catNo(c.id)}${own ? '' : '、未所持'}`}
                  accessibilityState={{ selected: on }}
                  style={StyleSheet.absoluteFill}
                >
                  <Slice name={on ? 'panel/card-cat-selected' : own ? 'panel/card-cat' : 'panel/card-cat-locked'} style={s.catCard}>
                    <View style={s.catPicture}>
                      <CatImage id={c.id} size={cellW - 18} silhouette={!own} />
                    </View>
                    {!!own && own.count > 1 && (
                      <Slice name="badge/owned-count" style={s.count}><T w="x" size={9} color={C.accent}>×{own.count}</T></Slice>
                    )}
                    <View style={s.cardCaption}>
                      <T w="m" size={8} color={C.sub}>No.{catNo(c.id)}</T>
                      <T w="x" size={9} numberOfLines={2} style={s.catName}>{own ? c.name : '???'}</T>
                    </View>
                  </Slice>
                </Tap>
                <Tap
                  onPress={() => toggleFavorite(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${isFav ? 'お気に入りを解除' : 'お気に入りに追加'}: ${own ? c.name : `No.${catNo(c.id)}`}`}
                  accessibilityState={{ selected: isFav }}
                  style={s.heartButton}
                >
                  <Icon name={isFav ? 'icon/heart-on' : 'icon/heart-off'} size={18} />
                </Tap>
              </View>
            );
          })}
          {list.length === 0 && (
            <T w="b" size={13} color={C.sub} style={s.emptyMessage}>
              {filter === 'fav' && !q ? 'お気に入りの子がいません' : '見つかりませんでした'}
            </T>
          )}
        </ScrollView>
        {showTop && (
          <Tap style={s.toTop} onPress={() => listRef.current?.scrollTo({ y: 0, animated: true })} accessibilityLabel="トップにもどる">
            <Pic name="login/arrow-next" height={42} style={{ transform: [{ rotate: '-90deg' }] }} />
          </Tap>
        )}
      </View>


      {cat && (
        <Slice name="panel/sheet-detail" style={[s.sheet, { paddingBottom: pad + 14 }]}>
          <View style={s.detailRow}>
            <View style={s.bigPhoto}>
              <Slice name="panel/photo-well" style={StyleSheet.absoluteFill} />
              <CatImage id={cat.id} size={116} silhouette={!o} />
            </View>
            <View style={s.detailText}>
              <T w="m" size={11} color={C.sub}>No.{catNo(cat.id)}</T>
              <View style={s.detailTitle}>
                <T w="x" size={19}>{o ? cat.name : '???'}</T>
                <RarityBadge cat={cat} height={20} />
              </View>
              <T w="m" size={11} color={C.sub} style={s.detailHint}>
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
          <View style={s.detailActions}>
            {o && (
              <Tap style={s.actionFlex} onPress={() => toggleFavorite(cat.id)}>
                <Slice name={fav ? 'button/chip-favorite-on' : 'button/chip-favorite-off'} style={s.favBtn}>
                  <T w="x" size={12} style={s.favText}>{fav ? 'お気に入り中' : 'お気に入り'}</T>
                </Slice>
              </Tap>
            )}
            <ImgButton label="閉じる" height={42} onPress={() => setSel(null)} style={s.actionFlex} />
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
      <T w="m" size={11} color={C.sub} style={s.rowKey}>{k}</T>
      <T w="b" size={12}>{v}</T>
    </View>
  );
}

const s = StyleSheet.create({
  titleWrap: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
  titleText: { position: 'absolute', left: '14%', right: '14%', alignItems: 'center', justifyContent: 'center' },
  titleMain: { textAlign: 'center', lineHeight: 25, includeFontPadding: false },
  titleSub: { textAlign: 'center', lineHeight: 15, includeFontPadding: false },
  maneki: { position: 'absolute', right: 0, bottom: 0 },
  topContent: { paddingHorizontal: 12, gap: 7 },
  progressCard: { height: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 9 },
  progressBody: { flex: 1, alignItems: 'center', gap: 1 },
  progressCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gauge: { alignSelf: 'stretch', marginHorizontal: 12, marginTop: 3 },
  progressRight: { width: 90, height: 72, alignItems: 'center', justifyContent: 'center' },
  completeRibbon: { position: 'absolute', bottom: -2, alignItems: 'center', justifyContent: 'center' },
  completeText: { position: 'absolute', top: 2, color: '#fff', fontSize: 8 },
  search: { height: 42, justifyContent: 'center' },
  searchInput: { marginLeft: 56, marginRight: 20, fontSize: 15, color: C.ink, height: 38, paddingVertical: 0 } as never,
  filters: { flexDirection: 'row', gap: 5, paddingRight: 2 },
  filterChip: { height: 34, minWidth: 58, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  chipIcon: { position: 'absolute', left: 8 },
  chipLabelWithIcon: { marginLeft: 12 },
  listWrap: { flex: 1, marginHorizontal: 10, marginTop: 7, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 12, justifyContent: 'flex-start' },
  catCard: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  catPicture: { position: 'absolute', top: 5, left: 0, right: 0, height: '66%', alignItems: 'center', justifyContent: 'center' },
  cardCaption: { position: 'absolute', left: 4, right: 4, bottom: 5, alignItems: 'center', justifyContent: 'center' },
  catName: { textAlign: 'center', lineHeight: 11, minHeight: 22 },
  count: { position: 'absolute', right: 3, bottom: 31, height: 17, minWidth: 24, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  heartButton: { position: 'absolute', top: 2, right: 2, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  emptyMessage: { width: '100%', textAlign: 'center', marginTop: 22 },
  toTop: { position: 'absolute', right: 8, bottom: 8, zIndex: 5 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: 20 },
  detailRow: { flexDirection: 'row', gap: 10 },
  bigPhoto: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  detailText: { flex: 1 },
  detailTitle: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  detailHint: { marginTop: 4 },
  table: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4 },
  detailActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionFlex: { flex: 1 },
  favBtn: { height: 42, alignItems: 'center', justifyContent: 'center' },
  favText: { marginLeft: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  rowKey: { marginLeft: 6, flex: 1 },
});

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MAX_CANDIDATES, REVEAL_HOUR, msUntilNextReveal } from '../lib/encounter';
import { useGame, visibleCount } from '../state/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T, catNo } from '../ui/base';
import { Card, Header, Icon, ImgButton, InfoPill, Polaroid, RarityBadge } from '../ui/kit';
import { Pic, Slice } from '../ui/Slice';
import { ScreenProps } from './types';

export default function DeaiScreen({ openShop, width }: ScreenProps) {
  const g = useGame();
  const { state, availableDays, todayKey, now } = g;
  const [day, setDay] = useState(todayKey);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    setDay(todayKey);
    setSel(null);
  }, [todayKey]);

  const rec = state.days[day];
  if (!rec) return null;

  const visible = rec.candidates.slice(0, visibleCount(rec));
  const isPicked = (id: string) => rec.freePick === id || rec.extraPicks.includes(id);
  const hasFree = !!rec.freePick;
  const rest = visible.filter((id) => !isPicked(id));
  const [, m, d] = day.split('-').map(Number);
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);
  const cols = visible.length <= 3 ? visible.length : 3;
  const colW = (width - 32 - (cols - 1) * 8) / cols;
  const selCat = sel ? CAT_BY_ID[sel] : null;

  const pickSelected = () => {
    if (!sel) return;
    if (!hasFree) g.pickFree(day, sel);
    else g.pickExtra(day, sel);
    setSel(null);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="brand/title-deai" onShop={openShop} onBell={openShop} />
      <View style={s.pills}>
        <InfoPill style={{ flex: 1.5 }} icon="icon/calendar-today" label="" value={`${m}/${d} ${REVEAL_HOUR}:00更新`} />
        <InfoPill style={{ flex: 1 }} icon="icon/ticket-paw" label="お迎え券" value={`${state.tickets}枚`} onPress={openShop} />
      </View>

      <View style={{ marginTop: 6, overflow: 'hidden', paddingBottom: 4 }}>
        <Pic name="bg/room-deai" width={width} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />
        <View style={s.hero}>
          {!hasFree ? (
            <Pic name="brand/title-free-pick" width={Math.min(width - 32, 360)} fallback={<T w="x" size={22}>3匹の中から1匹を無料でお迎え</T>} />
          ) : (
            <T w="x" size={20}>無料のお迎えが完了しました</T>
          )}
          <T w="b" size={12} color={C.sub} style={{ marginTop: 4 }}>
            {hasFree ? '気になる子はお迎え券で追加できます' : '気になる子を選んで、家族に迎えましょう'}
          </T>
          <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>
            次の出会いまで あと{Math.floor(mins / 60)}時間{mins % 60}分
          </T>
        </View>

        {availableDays.length > 1 && (
          <View style={s.dayTabs}>
            {availableDays.map((k) => (
              <Pressable key={k} onPress={() => { setDay(k); setSel(null); }}>
                <Slice name={day === k ? 'button/tab-all-on' : 'button/tab-normal'} style={s.dayTab} fallback={{ borderRadius: 18, backgroundColor: day === k ? C.accent : C.card }}>
                  <T w="x" size={12} color={day === k ? '#fff' : C.ink}>
                    {k === todayKey ? '今日' : 'きのう（受け取り期限まもなく）'}{state.days[k] && !state.days[k].freePick ? ' ●' : ''}
                  </T>
                </Slice>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.grid}>
          {visible.map((id, i) => {
            const cat = CAT_BY_ID[id];
            const picked = isPicked(id);
            const reason = rec.reasons[id];
            const owned = state.owned[id];
            return (
              <Pressable key={id} style={{ width: colW, opacity: picked ? 0.6 : 1 }} disabled={picked} onPress={() => setSel(sel === id ? null : id)}>
                <View style={{ alignItems: 'center', height: colW * 0.95, justifyContent: 'flex-end', zIndex: 2 }}>
                  {sel === id && <Pic name="cat/halo-select" width={colW * 1.1} style={{ position: 'absolute', bottom: -colW * 0.08 }} />}
                  <Bobbing delay={i * 180}>
                    <CatImage id={id} size={colW * 1.02} />
                  </Bobbing>
                </View>
                <View style={s.badgeRow}><RarityBadge cat={cat} limited={!!reason} /></View>
                <Card skin={sel === id ? 'selected' : 'white'} style={s.candCard}>
                  <T w="x" size={13} numberOfLines={1}>{cat.name}</T>
                  <T w="m" size={10} color={reason ? '#C9822B' : C.sub} style={{ textAlign: 'center', marginTop: 2, minHeight: 28 }} numberOfLines={2}>
                    {picked ? 'お迎え済み' : reason ? `✨ ${reason}に出会えた子` : owned ? `おうちに ${owned.count}匹いる子` : 'はじめて会う子'}
                  </T>
                  <Pressable onPress={() => setDetail(id)} style={{ alignSelf: 'stretch', marginTop: 6 }}>
                    <Slice name="button/chip-detail" style={s.chip} fallback={{ borderRadius: 16 }}>
                      <T w="b" size={11} style={{ marginLeft: 14 }}>くわしく見る ›</T>
                    </Slice>
                  </Pressable>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 12 }}>
        {!hasFree && (
          <ImgButton
            label={selCat ? `${selCat.name}を無料でお迎え` : '迎えたい子をタップしてね'}
            disabled={!selCat}
            height={54}
            icon="icon/paw"
            onPress={pickSelected}
          />
        )}

        {!hasFree && (
          <Card>
            <Pic name="brand/title-matatabi" height={26} fallback={<T w="x" size={17}>またたびで もっと出会える！</T>} />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <T w="m" size={12} color={C.sub}>またたびを使うと、今日の候補が追加されます{'\n'}最大{MAX_CANDIDATES}匹まで表示されます</T>
                <T w="b" size={12} style={{ marginTop: 8 }}>現在 {visible.length}匹 / 最大 {MAX_CANDIDATES}匹</T>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                  {Array.from({ length: MAX_CANDIDATES }, (_, i) => (
                    <Pic
                      key={i}
                      name={i < visible.length ? 'gauge/cat-dot-on' : 'gauge/cat-dot-off'}
                      height={20}
                      fallback={<View style={[s.dot, { backgroundColor: i < visible.length ? '#B27A4F' : '#EADBC8' }]} />}
                    />
                  ))}
                </View>
              </View>
              <View style={{ width: 156, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Pic name="icon/matatabi-bag" height={56} />
                <ImgButton
                  skin="primary-green"
                  label="またたびを使う"
                  icon="icon/matatabi-leaf"
                  height={42}
                  fontSize={13}
                  disabled={state.matatabi < 1 || visible.length >= rec.candidates.length}
                  onPress={() => g.useMatatabi(day)}
                  style={{ alignSelf: 'stretch', marginTop: 4 }}
                />
                <T w="b" size={11} color={C.sub} style={{ marginTop: 4 }}>所持 {state.matatabi}個</T>
              </View>
            </View>
          </Card>
        )}

        {hasFree && rest.length > 0 && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="icon/paw" size={22} />
              <T w="x" size={17} style={{ marginLeft: 6 }}>この子たちも迎える</T>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <T w="m" size={12} color={C.sub}>残りの{rest.length}匹もお迎え券を使って家族に迎えることができます</T>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {rest.slice(0, 3).map((id, i) => (
                    <Polaroid key={id} width={56} style={{ marginLeft: i ? -10 : 0, transform: [{ rotate: `${(i - 1) * 5}deg` }] }}>
                      <CatImage id={id} size={48} />
                    </Polaroid>
                  ))}
                </View>
              </View>
              <View style={{ width: 184, gap: 8, justifyContent: 'center' }}>
                <ImgButton
                  label={selCat ? `${selCat.name}を迎える` : 'お迎え券を使う'}
                  badge={`${state.tickets}枚`}
                  height={44}
                  fontSize={13}
                  disabled={!selCat || state.tickets < 1}
                  onPress={pickSelected}
                />
                <ImgButton
                  skin="ghost-outline"
                  label="まとめて迎える"
                  badge={`${rest.length}枚`}
                  height={44}
                  fontSize={13}
                  disabled={state.tickets < rest.length}
                  onPress={() => { g.pickExtra(day, rest); setSel(null); }}
                />
              </View>
            </View>
            {state.tickets < 1 && (
              <Pressable onPress={openShop}>
                <T w="b" size={12} color={C.accent} style={{ marginTop: 8, textAlign: 'right' }}>お迎え券を手に入れる ›</T>
              </Pressable>
            )}
          </Card>
        )}
      </View>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={s.overlay} onPress={() => setDetail(null)}>
          {detail && (
            <Card style={{ alignItems: 'center', padding: 20 }}>
              <Bobbing><CatImage id={detail} size={200} /></Bobbing>
              <T w="m" size={12} color={C.sub}>No.{catNo(detail)}</T>
              <T w="x" size={22} style={{ marginBottom: 6 }}>{CAT_BY_ID[detail].name}</T>
              <RarityBadge cat={CAT_BY_ID[detail]} limited={!!rec.reasons[detail]} />
              <T w="m" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
                {rec.reasons[detail] ? `「${rec.reasons[detail]}」の条件で現れました` : 'ふらりと遊びに来た子です'}
                {state.owned[detail] ? `\nおうちに ${state.owned[detail].count}匹います` : '\nまだおうちにはいません'}
              </T>
              <ImgButton skin="ghost-outline" label="閉じる" height={44} onPress={() => setDetail(null)} style={{ alignSelf: 'stretch', marginTop: 16 }} />
            </Card>
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  hero: { alignItems: 'center', paddingTop: 14, paddingHorizontal: 16 },
  dayTabs: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 },
  dayTab: { height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  badgeRow: { alignItems: 'center', marginTop: -14, marginBottom: -11, zIndex: 3 },
  candCard: { alignItems: 'center', paddingHorizontal: 8, paddingTop: 16, paddingBottom: 10 },
  chip: { height: 30, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10 },
  overlay: { flex: 1, backgroundColor: '#0007', justifyContent: 'center', padding: 24 },
});

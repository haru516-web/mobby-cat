import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { cardReason } from '../../core/conditions';
import { MAX_CANDIDATES, REVEAL_HOUR, msUntilNextReveal } from '../../core/encounter';
import { HASHTAG, saveView, shareView, ViewRef } from '../../services/share';
import { DiscoveryCard } from './DiscoveryCard';
import { useGame, visibleCount } from '../../core/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T, catNo } from '../../ui/base';
import { Card, Header, ImgButton, InfoPill, Polaroid, RarityBadge, useTabPad, Tap } from '../../ui/kit';
import { Pic, Slice, Stretch } from '../../ui/Slice';
import { TourAnchor } from '../../ui/TourAnchor';
import { ScreenProps } from '../../navigation';
import { playSfx } from '../../services/audio';
import { hapticSuccess } from '../../services/haptics';

export default function DeaiScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const g = useGame();
  const pad = useTabPad();
  const { state, availableDays, todayKey, now } = g;
  const [day, setDay] = useState(todayKey);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null); // 迎えた直後に出す発見カード
  const card = useRef<ViewRef>(null);

  useEffect(() => {
    setDay(todayKey);
    setSel(null);
  }, [todayKey]);

  const rec = state.days[day];
  // 20時の切り替わり直後などで、その日の候補をまだ作っている間
  if (!rec) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="brand/title-deai" onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
        <View style={s.preparing}>
          <Bobbing><Pic name="icon/paw" height={44} /></Bobbing>
          <T w="b" size={14} color={C.sub}>今日の出会いを準備しています…</T>
        </View>
      </View>
    );
  }

  const visible = rec.candidates.slice(0, visibleCount(rec));
  const isPicked = (id: string) => rec.freePick === id || rec.extraPicks.includes(id);
  const hasFree = !!rec.freePick;
  const rest = visible.filter((id) => !isPicked(id));
  const [, m, d] = day.split('-').map(Number);
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);
  const empty = rec.candidates.length === 0;
  const cols = Math.max(1, visible.length <= 3 ? visible.length : 3);
  const colW = (width - 32 - (cols - 1) * 8) / cols;
  const selCat = sel ? CAT_BY_ID[sel] : null;
  const heroH = width * (1400 / 1179) * 0.62;

  const pickSelected = () => {
    if (!sel) return;
    if (!hasFree) g.pickFree(day, sel);
    else if (!g.pickExtra(day, sel)) return;
    playSfx(rec.reasons[sel] ? 'sfx_pick_special' : hasFree ? 'sfx_pick_extra' : 'sfx_pick_free');
    hapticSuccess();
    setWelcome(sel);
    setSel(null);
  };
  const shareCard = (id: string) => {
    const reason = rec.reasons[id];
    const msg = reason
      ? `「${cardReason(id, reason)}」に${CAT_BY_ID[id].name}に出会えた！ ${HASHTAG}`
      : `今日は${CAT_BY_ID[id].name}がおうちに来てくれました ${HASHTAG}`;
    shareView(card, msg);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 + pad }}>
      <Header title="brand/title-deai" onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
      <View style={s.pills}>
        <InfoPill style={{ flex: 1.5 }} icon="icon/calendar-today" label="" value={`${m}/${d} ${REVEAL_HOUR}:00更新`} onPress={() => openNotice('upcoming')} />
        <InfoPill style={{ flex: 1 }} icon="icon/ticket-paw" label="お迎え券" value={`${state.tickets}枚`} onPress={openShop} />
      </View>

      <View style={{ marginTop: 6 }}>
        {/* 部屋の背景。下端はクリームのグラデーションでページになじませる */}
        <View style={[s.heroBg, { height: heroH }]}>
          <Pic name="bg/room-deai" width={width} />
          <Stretch name="bg/fade-cream-bottom" style={s.fade} />
        </View>
        <TourAnchor id="deai-hero" style={s.hero}>
          {!hasFree ? (
            <Pic name="brand/title-free-pick" width={Math.min(width - 32, 360)} />
          ) : (
            <T w="x" size={20}>無料のお迎えが完了しました</T>
          )}
          {/* 部屋の背景の上でも読めるよう、説明は白いカードに載せる */}
          <Card skin="white" style={s.heroNote}>
            <T w="b" size={12} style={{ textAlign: 'center' }}>
              {hasFree ? '気になる子はお迎え券で追加できます' : '気になる子を選んで、家族に迎えましょう'}
            </T>
            <T w="m" size={11} color={C.sub} style={{ textAlign: 'center', marginTop: 2 }}>
              次の出会いまで あと{Math.floor(mins / 60)}時間{mins % 60}分
            </T>
            <Tap onPress={() => openNotice('upcoming')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
              <T w="b" size={12} color={C.accent}>これから会えるかもしれない猫</T>
              <Pic name="icon/chevron-right" height={12} style={{ marginLeft: 4 }} />
            </Tap>
          </Card>
        </TourAnchor>

        {availableDays.length > 1 && (
          <View style={s.dayTabs}>
            {availableDays.map((k) => (
              <Tap key={k} onPress={() => { setDay(k); setSel(null); }}>
                <Slice name={day === k ? 'button/tab-all-on' : 'button/tab-normal'} style={s.dayTab}>
                  <T w="x" size={12} color={day === k ? '#fff' : C.ink}>
                    {k === todayKey ? '今日' : state.days[k]?.freePick ? 'きのう' : 'きのう（受け取りは今日の20時まで）'}
                  </T>
                </Slice>
              </Tap>
            ))}
          </View>
        )}

        {empty && (
          <Card style={{ marginHorizontal: 16, marginTop: 12 }}>
            <T w="b" size={13} style={{ textAlign: 'center' }}>今日は、出会いの条件がそろった子がいません</T>
            <T w="m" size={11} color={C.sub} style={{ textAlign: 'center', marginTop: 4 }}>歩いたり、天気や曜日がかわったりすると、あしたは会えるかも。歩数と位置情報を許可していないと、ほとんど会えません（設定で確認できます）</T>
          </Card>
        )}
        <TourAnchor id="deai-grid" style={s.grid}>
          {visible.map((id, i) => {
            const cat = CAT_BY_ID[id];
            const picked = isPicked(id);
            const reason = rec.reasons[id];
            const owned = state.owned[id];
            return (
              <Tap key={id} style={{ width: colW }} disabled={picked} onPress={() => setSel(sel === id ? null : id)}>
                <View style={{ alignItems: 'center', height: colW * 0.95, justifyContent: 'flex-end', zIndex: 2 }}>
                  {sel === id && <Pic name="cat/halo-select" width={colW * 1.1} style={{ position: 'absolute', bottom: -colW * 0.08 }} />}
                  <Bobbing delay={i * 180}>
                    <CatImage id={id} size={colW * 1.02} />
                  </Bobbing>
                  {picked && <Pic name="badge/picked-stamp" width={colW * 0.36} style={{ position: 'absolute', right: -2, top: 2, opacity: 0.9 }} />}
                </View>
                <View style={s.badgeRow}><RarityBadge cat={cat} /></View>
                <Card skin={sel === id ? 'selected' : 'white'} style={s.candCard}>
                  {/* 長い名前（「〜モビー」など）は、3列のときに末尾が切れないよう少し小さくする */}
                  <T w="x" size={cols < 3 || cat.name.length <= 6 ? 13 : cat.name.length <= 8 ? 11 : 10} numberOfLines={1}>{cat.name}</T>
                  <T w="m" size={10} color={reason ? '#C9822B' : C.sub} style={{ textAlign: 'center', marginTop: 2, minHeight: 28 }} numberOfLines={2}>
                    {picked ? 'お迎え済み' : reason ? `「${reason}」で出会えた` : owned ? `おうちに ${owned.count}匹いる子` : 'はじめて会う子'}
                  </T>
                  <Tap onPress={() => setDetail(id)} style={{ alignSelf: 'stretch', marginTop: 6 }}>
                    <Slice name="button/chip-detail" style={s.chip}>
                      <T w="b" size={11} style={{ marginLeft: 24 }} numberOfLines={1}>{colW < 110 ? 'くわしく' : 'くわしく見る'}</T>
                    </Slice>
                  </Tap>
                </Card>
              </Tap>
            );
          })}
        </TourAnchor>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 12 }}>
        {!hasFree && !empty && (
          <ImgButton
            label={selCat ? `${selCat.name}を無料でお迎え` : '迎えたい子をタップしてね'}
            disabled={!selCat}
            height={54}
            icon="icon/paw"
            onPress={pickSelected}
          />
        )}

        {!hasFree && !empty && (
          <Card>
            <Pic name="brand/title-matatabi" height={26} />
            {/* 説明は全幅で読ませ、その下に「いま何匹か」と使うボタンを並べる */}
            <T w="m" size={12} color={C.sub} style={{ marginTop: 8 }}>
              {rec.passBonus
                ? `またたびパス加入中なので、はじめから最大の${MAX_CANDIDATES}匹に出会えています`
                : `またたび1個で、今日の候補が1匹ふえます（最大${MAX_CANDIDATES}匹）。無料で迎えられるのは1匹のままです`}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <T w="b" size={12}>現在 {visible.length}匹 / 最大 {MAX_CANDIDATES}匹</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {Array.from({ length: MAX_CANDIDATES }, (_, i) => (
                    <Pic key={i} name={i < visible.length ? 'gauge/cat-dot-on' : 'gauge/cat-dot-off'} height={20} />
                  ))}
                </View>
              </View>
              <View style={{ width: 164, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Pic name="icon/matatabi-bag" height={48} />
                <ImgButton
                  skin="primary-green"
                  label="またたびを使う"
                  icon="icon/matatabi-leaf"
                  height={42}
                  fontSize={13}
                  disabled={state.matatabi < 1 || visible.length >= rec.candidates.length}
                  onPress={() => { if (g.useMatatabi(day)) playSfx('sfx_matatabi'); }}
                  style={{ alignSelf: 'stretch', marginTop: 4 }}
                />
                <T w="b" size={11} color={C.sub} style={{ marginTop: 4 }}>所持 {state.matatabi}個</T>
              </View>
            </View>
          </Card>
        )}

        {hasFree && rest.length > 0 && (
          <Card>
            <Pic name="brand/title-mukaeru" height={26} />
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
                  onPress={() => {
                    if (g.pickExtra(day, rest)) {
                      setWelcome(rest[0]);
                      playSfx('sfx_pick_extra');
                      hapticSuccess();
                    }
                    setSel(null);
                  }}
                />
              </View>
            </View>
            {state.tickets < 1 && (
              <Tap onPress={openShop}>
                <T w="b" size={12} color={C.accent} style={{ marginTop: 8, textAlign: 'right' }}>お迎え券を手に入れる</T>
              </Tap>
            )}
          </Card>
        )}
      </View>

      <Modal visible={!!welcome} transparent animationType="fade" onRequestClose={() => setWelcome(null)}>
        <View style={s.overlay}>
          <Stretch name="bg/overlay-dim" style={StyleSheet.absoluteFill} />
          {welcome && (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <T w="x" size={20} color="#fff">{CAT_BY_ID[welcome].name}をお迎えしました！</T>
              <DiscoveryCard ref={card} id={welcome} day={day} reason={rec.reasons[welcome]} width={Math.min(width - 48, 340)} />
              <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
                <ImgButton skin="ghost-outline" label="閉じる" height={46} fontSize={13} onPress={() => setWelcome(null)} style={{ flex: 1 }} />
                <ImgButton skin="ghost-outline" label="画像を保存" height={46} fontSize={13} onPress={() => saveView(card)} style={{ flex: 1.2 }} />
                <ImgButton label="共有する" icon="icon/camera" height={46} fontSize={13} onPress={() => shareCard(welcome)} style={{ flex: 1.2 }} />
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Tap style={s.overlay} onPress={() => setDetail(null)}>
          <Stretch name="bg/overlay-dim" style={StyleSheet.absoluteFill} />
          {detail && (
            <Card style={{ alignItems: 'center', padding: 20 }}>
              <Bobbing><CatImage id={detail} size={200} /></Bobbing>
              <T w="m" size={12} color={C.sub}>No.{catNo(detail)}</T>
              <T w="x" size={22} style={{ marginBottom: 6 }}>{CAT_BY_ID[detail].name}</T>
              <RarityBadge cat={CAT_BY_ID[detail]} />
              <T w="m" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
                {rec.reasons[detail] ? `「${rec.reasons[detail]}」の条件で現れました` : 'ふらりと遊びに来た子です'}
                {state.owned[detail] ? `\nおうちに ${state.owned[detail].count}匹います` : '\nまだおうちにはいません'}
              </T>
              <ImgButton skin="ghost-outline" label="閉じる" height={44} onPress={() => setDetail(null)} style={{ alignSelf: 'stretch', marginTop: 16 }} />
            </Card>
          )}
        </Tap>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  heroBg: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  hero: { alignItems: 'center', paddingTop: 14, paddingHorizontal: 16 },
  heroNote: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 14 },
  dayTabs: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 },
  dayTab: { height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  badgeRow: { alignItems: 'center', marginTop: -14, marginBottom: -11, zIndex: 3 },
  candCard: { alignItems: 'center', paddingHorizontal: 8, paddingTop: 16, paddingBottom: 10 },
  chip: { height: 30, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  preparing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 120 },
});

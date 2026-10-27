import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { cardReason, conditionTotal } from '../../core/conditions';
import { msUntilNextReveal } from '../../core/encounter';
import { HASHTAG, saveView, shareView, ViewRef } from '../../services/share';
import { DiscoveryCard } from './DiscoveryCard';
import { useGame, visibleCount } from '../../core/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T, catNo } from '../../ui/base';
import { Card, Header, ImgButton, RarityBadge, useTabPad, Tap } from '../../ui/kit';
import { useConfirm } from '../../ui/ConfirmPopup';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';
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
  const [barH, setBarH] = useState(0);
  const [confirm, confirmEl] = useConfirm(); // 迎える・使うは、対象を大きく見せるポップで最終決定する

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
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);
  const empty = rec.candidates.length === 0;
  // まだ見えていない候補（またたびで見える）。図鑑の未所持と同じく、その猫の形のシルエットで見せる
  const hidden = hasFree ? [] : rec.candidates.slice(visible.length);
  const slots = visible.length + hidden.length;
  const cols = Math.max(1, Math.min(3, slots));
  const colW = (width - 32 - (cols - 1) * 8) / cols;
  const selCat = sel ? CAT_BY_ID[sel] : null;

  // お迎え・またたびは取り消せないので、かならず確認してから行う
  const askPick = () => {
    if (!sel) return;
    const name = CAT_BY_ID[sel].name;
    if (!hasFree) {
      confirm(`${name}を迎えますか？`, '無料のお迎えは1日1匹です。選んだあとは変えられません。', '無料で迎える', pickSelected, { catId: sel });
    } else {
      confirm(`${name}を迎えますか？`, `お迎え券を1枚使います（${state.tickets}枚 → ${state.tickets - 1}枚）。`, '券1枚で迎える', pickSelected, { catId: sel });
    }
  };
  const askLocked = () => {
    if (!hidden[0]) return;
    if (state.matatabi >= 1) {
      confirm(
        'またたびを使いますか？',
        `またたびを1個使って、隠れている子を1匹見えるようにします（${state.matatabi}個 → ${state.matatabi - 1}個）。無料で迎えられるのは1匹のままです。`,
        'またたびを使う',
        () => { if (g.useMatatabi(day)) playSfx('sfx_matatabi'); },
        { catId: hidden[0], silhouette: true, skin: 'primary-green' },
      );
    } else {
      confirm(
        'またたびがありません',
        'またたびを使うと、隠れている子に出会えます。またたびパスなら、毎日はじめから全員に会えます。',
        'ショップを見る',
        openShop,
        { catId: hidden[0], silhouette: true, skin: 'primary-green', cancelLabel: 'もどる' },
      );
    }
  };
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
      ? `${conditionTotal(id) > 1 ? `「${cardReason(id, reason)}」（条件の1つ）` : `「${cardReason(id, reason)}」`}に${CAT_BY_ID[id].name}に出会えた！ ${HASHTAG}`
      : `今日は${CAT_BY_ID[id].name}がおうちに来てくれました ${HASHTAG}`;
    shareView(card, msg);
  };

  return (
    <View style={{ flex: 1 }}>
    <Backdrop name="bg/room-deai-full" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 + pad + barH }}>
      <Header title="brand/title-deai" onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />

      {/* 見出しは文字で描く。またたび・パスで候補の数が変わるので、いまの数を出す */}
      <TourAnchor id="deai-hero" style={s.hero}>
        <Card skin="white" style={s.heroNote}>
          <T w="x" size={16} style={{ textAlign: 'center' }}>
            {hasFree ? '無料のお迎えが完了しました' : `${visible.length}匹の中から1匹を無料でお迎え`}
          </T>
          <View style={s.heroSub}>
            <T w="b" size={11} color={C.sub}>あと{Math.floor(mins / 60)}時間{mins % 60}分</T>
            <Tap onPress={() => openNotice('upcoming')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T w="b" size={11} color={C.accent}>これから会える猫</T>
              <Pic name="icon/chevron-right" height={11} style={{ marginLeft: 2 }} />
            </Tap>
          </View>
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
          return (
            <Tap key={id} style={{ width: colW }} disabled={picked} onPress={() => setSel(sel === id ? null : id)} accessibilityLabel={cat.name}>
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
                <T w="x" size={cols < 3 ? 13 : 11} numberOfLines={2} style={{ textAlign: 'center', minHeight: cols < 3 ? 0 : 28 }}>{cat.name}</T>
                {/* 誰をいくらで迎えるかを、押す前に見せる */}
                <Slice name="badge/owned-count" style={s.cost}>
                  <T w="x" size={11} color={picked ? C.sub : C.accent}>{picked ? 'お迎え済み' : hasFree ? 'お迎え券1枚' : '無料'}</T>
                </Slice>
              </Card>
            </Tap>
          );
        })}
        {hidden.map((id, i) => (
          <Tap key={id} style={{ width: colW }} onPress={askLocked} accessibilityLabel="またたびで会える猫">
            <View style={{ alignItems: 'center', height: colW * 0.95, justifyContent: 'flex-end', zIndex: 2 }}>
              <Bobbing delay={(visible.length + i) * 180}>
                <CatImage id={id} size={colW * 1.02} silhouette />
              </Bobbing>
            </View>
            <View style={s.badgeRow}><Pic name="icon/matatabi-leaf" height={24} /></View>
            <Card style={s.candCard}>
              <T w="x" size={13}>？？？</T>
              <Slice name="badge/owned-count" style={s.cost}>
                <T w="x" size={11} color={C.accent}>またたび1個</T>
              </Slice>
            </Card>
          </Tap>
        ))}
      </TourAnchor>
    </ScrollView>

    {/* 操作はナビボタンのすぐ上に固定する。スクロールしても押せる */}
    {!empty && (
      <View style={[s.bar, { bottom: pad }]} onLayout={(e) => setBarH(e.nativeEvent.layout.height)} pointerEvents="box-none">
        {selCat && (
          <Card skin="white" style={s.selInfo}>
            <View style={{ flex: 1 }}>
              <T w="x" size={13}>{selCat.name}</T>
              <T w="b" size={11} color={sel && rec.reasons[sel] ? '#C9822B' : C.sub}>
                {sel && rec.reasons[sel]
                  ? (conditionTotal(sel) > 1 ? `条件の1つ「${rec.reasons[sel]}」で出会えた` : `「${rec.reasons[sel]}」で出会えた`)
                  : state.owned[selCat.id] ? `おうちに ${state.owned[selCat.id].count}匹いる子` : 'はじめて会う子'}
              </T>
            </View>
            <Tap onPress={() => setDetail(selCat.id)}>
              <Slice name="button/chip-detail" style={s.chip}>
                <T w="b" size={11} style={{ marginLeft: 24 }} numberOfLines={1}>くわしく</T>
              </Slice>
            </Tap>
          </Card>
        )}

        {!hasFree && (
          <ImgButton
            label={selCat ? '無料でお迎えする' : '迎える子をえらんでね'}
            disabled={!selCat}
            height={50}
            icon="icon/paw"
            onPress={askPick}
          />
        )}
        {hasFree && rest.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 券が足りないときは、そのままショップへ。買いたくなる場面なので最短で案内する */}
            {selCat && state.tickets < 1 ? (
              <ImgButton label="お迎え券を買う" icon="icon/ticket-paw" height={50} onPress={openShop} style={{ flex: 1 }} />
            ) : (
              <ImgButton
                label={selCat ? '券1枚で迎える' : '迎える子をえらんでね'}
                disabled={!selCat}
                height={50}
                badge={selCat ? `所持${state.tickets}枚` : undefined}
                onPress={askPick}
                style={{ flex: 1 }}
              />
            )}
            {rest.length > 1 && (
              <ImgButton
                skin="ghost-outline"
                label="まとめて"
                badge={`${rest.length}枚`}
                height={50}
                fontSize={12}
                disabled={state.tickets < rest.length}
                onPress={() => confirm(
                  `残り${rest.length}匹をまとめて迎えますか？`,
                  `お迎え券を${rest.length}枚使います（${state.tickets}枚 → ${state.tickets - rest.length}枚）。`,
                  `券${rest.length}枚で迎える`,
                  () => {
                    if (g.pickExtra(day, rest)) {
                      setWelcome(rest[0]);
                      playSfx('sfx_pick_extra');
                      hapticSuccess();
                    }
                    setSel(null);
                  },
                  { catIds: rest },
                )}
                style={{ width: 140 }}
              />
            )}
          </View>
        )}

        {/* またたびパスの案内。加入前も加入中も出して、何が得かを常に見せる */}
        <Tap onPress={openShop} accessibilityLabel="またたびパス">
          <Card style={s.pass}>
            <Pic name="icon/matatabi-bag" height={32} />
            <View style={{ flex: 1 }}>
              <T w="x" size={12}>{state.pass.active ? 'またたびパス加入中' : 'またたびパス'}</T>
              <T w="m" size={10} color={C.sub} numberOfLines={1}>毎日6匹に会える＋毎月お迎え券3枚</T>
            </View>
            {!state.pass.active && <T w="x" size={11} color={C.accent}>くわしく</T>}
            <Pic name="icon/chevron-right" height={12} />
          </Card>
        </Tap>
      </View>
    )}

    {confirmEl}

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
                {rec.reasons[detail] && conditionTotal(detail) > 1 ? `
（条件は全部で${conditionTotal(detail)}つ。これはそのうちの1つです）` : ''}
                {state.owned[detail] ? `\nおうちに ${state.owned[detail].count}匹います` : '\nまだおうちにはいません'}
              </T>
              <ImgButton skin="ghost-outline" label="閉じる" height={44} onPress={() => setDetail(null)} style={{ alignSelf: 'stretch', marginTop: 16 }} />
            </Card>
          )}
        </Tap>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'stretch', paddingTop: 6, paddingHorizontal: 16 },
  heroNote: { paddingVertical: 8, paddingHorizontal: 14, gap: 2 },
  heroSub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cost: { alignSelf: 'center', marginTop: 4, height: 22, minWidth: 74, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  selInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12 },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12 },
  bar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  dayTabs: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 },
  dayTab: { height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  badgeRow: { alignItems: 'center', marginTop: -14, marginBottom: -11, zIndex: 3 },
  candCard: { alignItems: 'center', paddingHorizontal: 6, paddingTop: 14, paddingBottom: 8 },
  chip: { height: 30, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  preparing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 120 },
});

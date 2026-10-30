import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { cardReason, conditionTotal } from '../../core/conditions';
import { REVEAL_HOUR, prevDayKey } from '../../core/encounter';
import { HASHTAG, saveView, shareView, ViewRef } from '../../services/share';
import { DiscoveryCard } from './DiscoveryCard';
import { WelcomeFx } from './WelcomeFx';
import { matatabiOf, openLeft, openLimit, openedOf, ticketsOf, useGame } from '../../core/game';
import { notice } from '../../services/dialog';
import { Bobbing, C, CAT_BY_ID, CatImage, T, catNo } from '../../ui/base';
import { Card, Header, ImgButton, RarityBadge, useTabPad, Tap } from '../../ui/kit';
import { useConfirm } from '../../ui/ConfirmPopup';
import { Backdrop, Pic, Slice, Stretch } from '../../ui/Slice';
import { TourAnchor } from '../../ui/TourAnchor';
import { ScreenProps } from '../../navigation';
import { playSfx } from '../../services/audio';
import { hapticSuccess } from '../../services/haptics';
import { UI } from '../../ui/uiAssets';
import { RevealOverlay } from './RevealOverlay';

// まだひらいていない候補は、どの子も同じシルエットで見せる（形で誰か分からないように）
const MYSTERY = UI['deai/mystery-cat'] ? 'deai/mystery-cat' : 'cat/silhouette-locked';

export default function DeaiScreen({ openShop, openSettings, openNotice, width }: ScreenProps) {
  const g = useGame();
  const pad = useTabPad();
  const { state, availableDays, todayKey, now } = g;
  const [day, setDay] = useState(todayKey);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null); // 迎えた直後に出す発見カード
  const [reveal, setReveal] = useState<{ ids: string[]; newIds: string[] } | null>(null); // ひらく演出の最中の子たち
  const [openSel, setOpenSel] = useState<string[]>([]); // ひらく子として選んでいる候補（まだひらいていない）
  const card = useRef<ViewRef>(null);
  const [barH, setBarH] = useState(0);
  const [confirm, confirmEl] = useConfirm(); // 迎える・使うは、対象を大きく見せるポップで最終決定する

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 日が変わったら、選択を今日に戻す
    setDay(todayKey);
    setSel(null);
    setOpenSel([]);
  }, [todayKey]);

  const rec = state.days[day];
  // 20時の切り替わり直後などで、その日の候補をまだ作っている間
  if (!rec) {
    return (
      <View style={{ flex: 1 }}>
        <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
        <View style={s.preparing}>
          <Bobbing><Pic name="icon/paw" height={44} /></Bobbing>
          {day === todayKey && todayKey === state.installDay && now.getHours() < REVEAL_HOUR ? (
            <>
              <T w="x" size={16} style={{ textAlign: 'center' }}>最初の出会いは、今夜{REVEAL_HOUR}時に届きます</T>
              <T w="b" size={12} color={C.sub} style={{ textAlign: 'center' }}>{`今日の歩数や電池の様子がそろってから、\n会える猫が決まります。それまでは、ホームで猫と遊んでね`}</T>
            </>
          ) : (
            <T w="b" size={14} color={C.sub}>今日の出会いを準備しています…</T>
          )}
        </View>
      </View>
    );
  }

  // ひらいた子（中身が見える）と、まだの子。並びは候補の順のまま（ひらいても場所が変わらない）
  const visible = openedOf(rec);
  // ひらく演出の最中の子は、一覧ではまだシルエットのまま（後ろで先に正体が見えないように）
  const isOpened = (id: string) => visible.includes(id) && !reveal?.ids.includes(id);
  const isPicked = (id: string) => rec.freePick === id || rec.extraPicks.includes(id);
  const hasFree = !!rec.freePick;
  const rest = visible.filter((id) => !isPicked(id));
  const left = openLeft(rec); // あと何匹、無料でひらけるか
  // またたびで、ひらける数を増やせるか（無料のお迎えの前で、ひらける数を使い切っていて、まだひらいていない子がいる）
  const canMatatabi = !hasFree && left === 0 && openLimit(rec) < rec.candidates.length;
  // まとめてひらく数：ひらける数（または、まだひらいていない子の数）。この数ぴったりを選んでから、いっしょにひらく
  const unopened = rec.candidates.filter((id) => !visible.includes(id));
  const need = Math.min(left, unopened.length);
  const picking = !hasFree && need > 0; // ひらく子を選んでいる段階
  const chosen = openSel.filter((id) => unopened.includes(id));
  const empty = rec.candidates.length === 0;
  const nextWord = now.getHours() >= REVEAL_HOUR ? 'あす' : '今日';
  const yKey = prevDayKey(todayKey);
  const yRec = state.days[yKey];
  // きのうの子が、まだ迎えられるのに残っている
  const yWaiting = day === todayKey && availableDays.includes(yKey) && !!yRec?.candidates.length && !yRec.freePick;
  const cols = Math.max(1, Math.min(3, rec.candidates.length));
  const colW = (width - 32 - (cols - 1) * 8) / cols;
  const selCat = sel ? CAT_BY_ID[sel] : null;

  // お迎え・またたびは取り消せないので、かならず確認してから行う
  const askPick = () => {
    if (!sel) return;
    const name = CAT_BY_ID[sel].name;
    if (!hasFree) {
      confirm(`${name}を迎えますか？`, '無料のお迎えは1日1匹です。選んだあとは変えられません。', '無料で迎える', pickSelected, { catId: sel });
    } else {
      confirm(`${name}を迎えますか？`, `お迎え券を1枚使います（${ticketsOf(state)}枚 → ${ticketsOf(state) - 1}枚）。`, '券1枚で迎える', pickSelected, { catId: sel });
    }
  };
  // 買った分の券は、サーバーで引く。つながらない・足りないときは、何も引かれない
  const notEnough = () => notice('お迎えできませんでした', '通信できなかったか、お迎え券が足りません。電波のよいところで、もう一度お試しください。');
  // ひらく演出を始める（一覧では、ひらく子はまだシルエットのまま）
  const startReveal = (ids: string[]) => {
    setSel(null);
    setOpenSel([]);
    setReveal({ ids, newIds: ids.filter((id) => !state.owned[id]) });
  };
  // ひらく子を選ぶ（押すと選ぶ、もう一度押すと外す。いっぱいのときは、いちばん前に選んだ子を外して入れかえる）
  const toggleOpen = (id: string) => {
    setOpenSel((cur) => {
      const now = cur.filter((x) => unopened.includes(x));
      if (now.includes(id)) return now.filter((x) => x !== id);
      return [...now, id].slice(-need);
    });
  };
  // 選んだ子を、いっしょにひらく。ひらく前に、かならず確認する（ひらく数には限りがあり、取り消せないため）
  const askOpenAll = () => {
    if (chosen.length !== need || need < 1) return;
    confirm(
      need === 1 ? 'この子をひらきますか？' : `この${need}匹をひらきますか？`,
      `ひらいた子の中から、1匹を無料で迎えられます。ひらいたあとは、選びなおせません。`,
      'ひらく',
      () => { if (g.openCandidates(day, chosen)) startReveal(chosen); },
      { pic: MYSTERY, picCount: need },
    );
  };
  // ひらける数を使い切ったあとに、まだひらいていない子を押したとき
  const askExtra = (id: string) => {
    if (!canMatatabi) {
      notice('もうひらけません', hasFree ? '無料のお迎えのあとは、新しくひらけません。あしたの出会いを待ってね。' : '今日ひらける数を使い切りました。');
    } else if (matatabiOf(state) >= 1) {
      confirm(
        'またたびでひらきますか？',
        `またたびを1個使って、この子をひらきます（${matatabiOf(state)}個 → ${matatabiOf(state) - 1}個）。無料で迎えられるのは1匹のままです。`,
        'またたびでひらく',
        async () => {
          if (await g.useMatatabi(day, id)) { playSfx('sfx_matatabi'); startReveal([id]); }
          else notice('またたびを使えませんでした', '通信できなかったか、またたびが足りません。電波のよいところで、もう一度お試しください。');
        },
        { pic: MYSTERY, skin: 'primary-green' },
      );
    } else {
      confirm(
        'またたびがありません',
        'またたびがあると、ひらける子を1匹増やせます。またたびパスなら、毎日6匹までひらけます。',
        'ショップを見る',
        openShop,
        { pic: MYSTERY, skin: 'primary-green', cancelLabel: 'もどる' },
      );
    }
  };
  const pickSelected = async () => {
    if (!sel) return;
    if (!hasFree) g.pickFree(day, sel);
    else if (!(await g.pickExtra(day, sel))) return notEnough();
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
    {/* 見出しと「今日・きのう」の切り替えは固定する（もび道と同じく、中身がノッチの裏に入り込まない）。その下の候補だけスクロールする */}
    <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
    {/* 「今日・きのう」はいつも出す。きのうの分が無い日（アプリを入れた日など）は、薄く出して、押すと理由を伝える */}
    <View style={s.dayTabs}>
        {[todayKey, prevDayKey(todayKey)].map((k) => {
          const none = !availableDays.includes(k);
          return (
          <Tap key={k} style={{ opacity: none ? 0.5 : 1 }} accessibilityState={{ disabled: none }} onPress={() => {
            if (none) return notice('きのうの出会いはありません', 'アプリを入れる前の日の出会いは届きません。あしたからは、前の日の子も選べます（次の20時まで）。');
            setDay(k);
            setSel(null);
            setOpenSel([]);
          }}>
            <Slice name={day === k ? 'button/tab-all-on' : 'button/tab-normal'} style={s.dayTab}>
              {k !== todayKey && !none && !!state.days[k]?.candidates.length && !state.days[k]?.freePick && <Pic name="button/bell-badge" height={12} style={s.tabDot} />}
              <T w="x" size={12} color={day === k ? '#fff' : C.ink}>
                {k === todayKey ? '今日' : none ? 'きのう（ありません）' : state.days[k]?.freePick ? 'きのう' : `きのう（受け取りは${now.getHours() >= REVEAL_HOUR ? 'あす' : '今日'}の20時まで）`}
              </T>
            </Slice>
          </Tap>
          );
        })}
    </View>
    {/* きのうの子が残っているときは、今日の画面の上で知らせる（押すと、きのうに切り替わる） */}
    {yWaiting && (
      <Tap onPress={() => { setDay(yKey); setSel(null); }} accessibilityLabel="きのうの子を見る" style={{ marginHorizontal: 16, marginTop: 8 }}>
        <Card skin="selected" style={s.yBanner}>
          <Pic name="icon/paw" height={20} />
          <T w="x" size={12} style={{ flex: 1 }}>きのうの子が、まだ待っています（{nextWord}の20時まで）</T>
          <Pic name="icon/chevron-right" height={12} />
        </Card>
      </Tap>
    )}
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 + pad + barH }}>

      {/* いまできることを1行で。ひらける数が残っていれば、それも出す */}
      <TourAnchor id="deai-hero" style={s.hero}>
        <Card skin="white" style={s.heroNote}>
          <T w="x" size={16} style={{ textAlign: 'center' }}>
            {empty ? `${day === todayKey ? '今日' : 'きのう'}は出会える子がいません` : hasFree ? '無料のお迎えが完了しました' : '1匹を無料でお迎え'}
          </T>
          {!empty && picking && <T w="b" size={12} color={C.accent} style={{ textAlign: 'center' }}>{`気になる子を${need}匹えらんでね（${chosen.length}/${need}）`}</T>}
          {/* 迎え終えたら、次にいつ来ればよいかだけ伝える（20時に届くことは、通知と毎日の習慣で分かる） */}
          {hasFree && day === todayKey && <T w="b" size={12} color={C.sub} style={{ textAlign: 'center' }}>次の出会いは、{nextWord}の20時に届きます</T>}
        </Card>
      </TourAnchor>


      {empty && (
        <Card style={{ marginHorizontal: 16, marginTop: 12 }}>
          <T w="b" size={13} style={{ textAlign: 'center' }}>{day === todayKey ? '今日' : 'きのう'}は、出会いの条件がそろった子がいません</T>
          <T w="m" size={11} color={C.sub} style={{ textAlign: 'center', marginTop: 4 }}>歩いたり、天気や曜日がかわったりすると、あしたは会えるかも。歩数と位置情報を許可していないと、ほとんど会えません（設定で確認できます）</T>
        </Card>
      )}

      <TourAnchor id="deai-grid" style={s.grid}>
        {rec.candidates.map((id, i) => {
          if (!isOpened(id)) {
            const mine = picking && chosen.includes(id); // いま、ひらく子として選んでいる
            const openable = picking || canMatatabi;
            return (
              <Tap
                key={id}
                style={{ width: colW, opacity: openable ? 1 : 0.55 }}
                onPress={() => (picking ? toggleOpen(id) : askExtra(id))}
                accessibilityLabel={picking ? (mine ? 'ひらく子に選んでいる。タップで外す' : 'まだひらいていない子。タップでひらく子に選ぶ') : 'またたびでひらける子'}
                accessibilityState={{ selected: mine }}
              >
                <View style={{ alignItems: 'center', height: colW * 0.95, justifyContent: 'flex-end', zIndex: 2 }}>
                  {mine && <Pic name="cat/halo-select" width={colW * 1.1} style={{ position: 'absolute', bottom: -colW * 0.08 }} />}
                  <Bobbing delay={i * 180}>
                    <Pic name={MYSTERY} width={colW * 0.92} />
                  </Bobbing>
                </View>
                <View style={s.badgeRow}>{!picking && canMatatabi ? <Pic name="icon/matatabi-leaf" height={24} /> : <View style={{ height: 24 }} />}</View>
                <Card skin={mine ? 'selected' : 'white'} style={s.candCard}>
                  <T w="x" size={13}>？？？</T>
                  <Slice name="badge/owned-count" style={s.cost}>
                    <T w="x" size={11} color={openable ? C.accent : C.sub}>{picking ? (mine ? 'ひらく！' : 'えらぶ') : canMatatabi ? 'またたび1個' : 'ひらけません'}</T>
                  </Slice>
                </Card>
              </Tap>
            );
          }
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

        {picking && (
          <ImgButton
            label={chosen.length === need ? (need === 1 ? 'この子をひらく' : `この${need}匹をひらく`) : `ひらく子を${need}匹えらんでね（${chosen.length}/${need}）`}
            disabled={chosen.length !== need}
            height={50}
            icon="icon/paw"
            onPress={askOpenAll}
          />
        )}
        {!hasFree && !picking && (
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
            {selCat && ticketsOf(state) < 1 ? (
              <ImgButton label="お迎え券を買う" icon="icon/ticket-paw" height={50} onPress={openShop} style={{ flex: 1 }} />
            ) : (
              <ImgButton
                label={selCat ? '券1枚で迎える' : '迎える子をえらんでね'}
                disabled={!selCat}
                height={50}
                badge={selCat ? `所持${ticketsOf(state)}枚` : undefined}
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
                disabled={ticketsOf(state) < rest.length}
                onPress={() => confirm(
                  `残り${rest.length}匹をまとめて迎えますか？`,
                  `お迎え券を${rest.length}枚使います（${ticketsOf(state)}枚 → ${ticketsOf(state) - rest.length}枚）。`,
                  `券${rest.length}枚で迎える`,
                  async () => {
                    if (await g.pickExtra(day, rest)) {
                      setWelcome(rest[0]);
                      playSfx('sfx_pick_extra');
                      hapticSuccess();
                    } else notEnough();
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
              <T w="m" size={10} color={C.sub} numberOfLines={1}>毎日6匹までひらける＋毎月お迎え券8枚</T>
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
          {/* ひらく演出と同じ暗幕（後ろの画面が透けて、光が埋もれないように） */}
          {UI['deai/reveal-dim'] ? <Stretch name="deai/reveal-dim" style={StyleSheet.absoluteFill} /> : <Stretch name="bg/overlay-dim" style={StyleSheet.absoluteFill} />}
          {welcome && (
            <WelcomeFx
              key={welcome}
              id={welcome}
              width={Math.min(width - 48, 340)}
              footer={
                <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
                  <ImgButton skin="ghost-outline" label="閉じる" height={46} fontSize={13} onPress={() => setWelcome(null)} style={{ flex: 1 }} />
                  <ImgButton skin="ghost-outline" label="画像を保存" height={46} fontSize={13} onPress={() => saveView(card)} style={{ flex: 1.2 }} />
                  <ImgButton label="共有する" icon="icon/camera" height={46} fontSize={13} onPress={() => shareCard(welcome)} style={{ flex: 1.2 }} />
                </View>
              }
            >
              <T w="x" size={20} color="#fff">{CAT_BY_ID[welcome].name}をお迎えしました！</T>
              <DiscoveryCard ref={card} id={welcome} day={day} reason={rec.reasons[welcome]} width={Math.min(width - 48, 340)} />
            </WelcomeFx>
          )}
        </View>
      </Modal>

      <RevealOverlay
        ids={reveal?.ids ?? null}
        reasons={rec.reasons}
        newIds={reveal?.newIds ?? []}
        onClose={() => {
          if (reveal?.ids.length === 1) setSel(reveal.ids[0]); // 1匹だけひらいたときは、その子を選んだ状態で戻る
          setReveal(null);
        }}
      />

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
  cost: { alignSelf: 'center', marginTop: 4, height: 22, minWidth: 74, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  selInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12 },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12 },
  bar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  dayTabs: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 },
  dayTab: { height: 36, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  tabDot: { position: 'absolute', right: 4, top: 2 },
  yBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  badgeRow: { alignItems: 'center', marginTop: -14, marginBottom: -11, zIndex: 3 },
  candCard: { alignItems: 'center', paddingHorizontal: 6, paddingTop: 14, paddingBottom: 8 },
  chip: { height: 30, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  preparing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 120 },
});

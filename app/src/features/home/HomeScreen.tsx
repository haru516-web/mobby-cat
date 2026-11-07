import { useMemo, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useHomeBg } from '../../core/homeBg';
import { extentOf, fitOf, footAct, footRoll, footStill, Foot } from '../../data/catFeet';
import { layoutHome } from '../../ui/homeLayout';
import { upcoming } from '../../core/conditions';
import { daysBetween } from '../../core/dates';
import { homeSlotsOf, useGame } from '../../core/game';
import HomeSelect from './HomeSelect';
import { playSfx } from '../../services/audio';
import { hapticLight } from '../../services/haptics';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { Card, Header, useTabPad, Tap, WORLD_ON } from '../../ui/kit';
import { ActSprite, RollSprite, useRollDirector, CatAction } from '../../ui/CatRoll';
import { PawCover } from '../../ui/PawCover';
import { Pic, Slice } from '../../ui/Slice';
import { TourAnchor } from '../../ui/TourAnchor';
import { UI } from '../../ui/uiAssets';
import { ScreenProps } from '../../navigation';

// 猫の置き場所は ui/homeLayout.ts が、遠近（手前ほど大きく）と、動きの途中でも重ならないことを考えて決める
const MEOW = ['にゃ！', 'ごろごろ…', 'なでて〜', 'うれしい！', 'にゃーん', 'もっと！'];

// 旅猫の今いる場所（仮）。あとで「全員共通の静的JSON」を1日1回読む形に置き換える
const TRAVELER = { flag: '📍', country: 'ポルトガル', city: 'リスボン', day: 12 };

function RoomCat({ id, size, delay, act: actIn, covered, onRollDone, onPet }: { id: string; size: number; delay: number; act: { run: number; kind: CatAction } | undefined; covered: boolean; onRollDone: () => void; onPet: () => void }) {
  // 肉球カバーは画面いっぱいに描くので、ここでは描かない（HomeScreen の PawCover が描く）
  const act = actIn?.kind === 'cover' ? undefined : actIn;
  const rollRun = act?.run;
  const [rollReady, setRollReady] = useState(false);
  // 影は、いまの絵（立ち姿・ごろごろ・動きの各コマ）の足元に合わせる
  const [pose, setPose] = useState<number | null>(null);
  const playing = rollRun !== undefined && rollReady && pose !== null;
  const foot: Foot = playing ? (act!.kind === 'roll' ? footRoll(id, pose) : footAct(id, act!.kind, pose)) : footStill(id);
  // 動きの絵は、立ち姿より小さく（大きく）描かれていたり、足元の高さがずれていたりする。
  // 立ち姿と同じ大きさ・同じ地面の高さに見えるよう、足元を中心に拡大・縮小してずらす（影も立ち姿の足元に置く）
  const ground = footStill(id)[0];
  const fit = fitOf(id, act?.kind ?? 'roll');
  const on = rollRun !== undefined && rollReady;
  const sc = on ? fit.scale : 1;
  const tx = on ? (1 - sc) * (fit.px - 0.5) * size : 0;
  const ty = on ? (1 - sc) * (fit.py - 0.5) * size + fit.lift * size : 0;
  const shadowW = Math.min(size * 1.0, Math.max(size * 0.4, size * foot[2] * sc * 1.2));
  const shadowX = size * (playing ? fit.px + sc * (foot[1] - fit.px) : foot[1]); // 動きの絵は拡大・縮小されるので、足元の中心もそれに合わせる
  const shadowH = shadowW * (150 / 480);
  const hop = useState(() => new Animated.Value(0))[0];
  const heart = useState(() => new Animated.Value(0))[0];
  const [line, setLine] = useState<string | null>(null);
  const tap = () => {
    onPet();
    playSfx('sfx_pet');
    hapticLight();
     
    setLine(MEOW[Math.floor(Math.random() * MEOW.length)]);
    hop.setValue(0);
    heart.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
      ]),
      Animated.timing(heart, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setLine(null));
  };
  return (
    <Tap sfx={null} onPress={tap} accessibilityLabel={`${CAT_BY_ID[id].name}をなでる`}>
      <Pic name="camera/shadow-soft" width={shadowW} style={{ position: 'absolute', left: shadowX - shadowW / 2, top: size * ground - shadowH * 0.55 }} />
      <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.18] }) }] }}>
        <Bobbing delay={delay}>
          <View style={{ width: size, height: size }}>
            {/* ごろごろの最初のコマが描けるまで静止画を残す（つなぎ目で一瞬消えないように） */}
            <View style={{ opacity: covered || (rollRun !== undefined && rollReady) ? 0 : 1 }}>
              <CatImage id={id} size={size} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }}>
            {act && act.kind === 'roll' && (
              <RollSprite key={act.run} id={id} size={size} onReady={() => setRollReady(true)} onPose={setPose} onDone={() => { setRollReady(false); setPose(null); onRollDone(); }} />
            )}
            {act && act.kind !== 'roll' && (
              <ActSprite key={act.run} id={id} kind={act.kind} size={size} onReady={() => setRollReady(true)} onPose={setPose} onDone={() => { setRollReady(false); setPose(null); onRollDone(); }} />
            )}
            </View>
          </View>
        </Bobbing>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[s.heart, { left: size * 0.4, opacity: heart.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: heart.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.5] }) }] }]}
      >
        <Pic name="icon/heart-on" height={size * 0.2} />
      </Animated.View>
      {line && (
        <Slice name="panel/speech-bubble" style={[s.bubble, { left: size * 0.5 - 60 }]}>
          <T w="x" size={12} numberOfLines={1}>{line}</T>
        </Slice>
      )}
    </Tap>
  );
}

export default function HomeScreen({ go, openShop, openSettings, openLoginRecord, openNotice, openCamera, width }: ScreenProps) {
  const { state, todayKey, pet } = useGame();
  const pad = useTabPad();
  const bg = useHomeBg();
  const bleed = Math.max(0, (useWindowDimensions().width - width) / 2); // 画面が幅の上限より広いとき、背景だけは端まで敷く

  const roomSlots = useMemo(() => homeSlotsOf(state), [state.owned, state.homeSlots]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selecting, setSelecting] = useState(false);
  const roll = useRollDirector(roomSlots.filter((id): id is string => !!id));
  // ホームはスクロールしない（もび道と同じ）。見出しと下のカードの残りの高さを、ぜんぶ部屋に回す（flex）。
  // 低い端末では部屋が低く、縦に長い端末では高くなる。猫の位置は、部屋の高さ（roomH）に対する割合で決める
  const [roomH, setRoomH] = useState(width * 1.25);
  const [roomPos, setRoomPos] = useState({ x: 0, y: 0 });
  const [rootSize, setRootSize] = useState({ w: width, h: 0 });
  // たまに出る「肉球で画面を覆う」：動いている猫のうち cover の子（同時に1匹だけ）を、画面全体に重ねて描く
  const [coverReady, setCoverReady] = useState(false);
  const coverEntry = [...roll.active].find(([, a]) => a.kind === 'cover');
  const cover = coverEntry ? { id: coverEntry[0], run: coverEntry[1].run } : undefined;
  const coverIdx = cover ? roomSlots.indexOf(cover.id) : -1;
  const placed = useMemo(() => layoutHome(roomSlots, width, roomH, Math.max(bg.top, SIDE_BOTTOM / roomH), extentOf, (id) => footStill(id)[0]), [roomSlots, width, roomH, bg.top]);
  // 通知の「これから」の、いちばん近い予告（暦や月で決まる特別な猫）
  const next = useMemo(() => upcoming(todayKey, 30, state.birthday)[0], [todayKey, state.birthday]);
  const nextCat = next?.cats[0];
  const nextOwned = !!nextCat && !!state.owned[nextCat.id];
  const nextRare = nextCat ? (CAT_BY_ID[nextCat.id].rarity >= 4 ? 'でんせつの' : CAT_BY_ID[nextCat.id].rarity === 3 ? 'レアな' : '特別な') : '';
  const nextDay = (() => {
    if (!next) return '';
    if (daysBetween(todayKey, next.day) <= 1) return 'あした';
    const [, m, d] = next.day.split('-').map(Number);
    return `${m}/${d}`;
  })();

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setRootSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: -bleed - 2, right: -bleed - 2, top: -2, bottom: -2 }]}>
      <Image source={bg.src} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
    <View style={{ flex: 1, paddingBottom: 24 + pad }}>
      <View style={{ zIndex: 2 }}>
      <Header onShop={openShop} onBell={() => openNotice()} onSettings={openSettings} />
      {WORLD_ON && (
      <View style={{ paddingHorizontal: 14, flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
        <Tap style={{ flex: 1 }} onPress={() => go('world')} accessibilityLabel="旅するモビーの様子">
          <Card style={s.travel}>
            <View>
              <Pic name="brand/title-travel" height={24} />
              <T w="m" size={10} color={C.sub} style={{ marginTop: 2 }}>いま、ここにいるよ</T>
            </View>
            <T size={28}>{TRAVELER.flag}</T>
            <View style={{ flex: 1 }}>
              <T w="x" size={15} numberOfLines={1}>{TRAVELER.country}</T>
              <T w="m" size={11} color={C.sub} numberOfLines={1}>{TRAVELER.city}・旅{TRAVELER.day}日目</T>
            </View>
            <Pic name="icon/chevron-right" height={14} />
          </Card>
        </Tap>
      </View>
      )}
      </View>

      <TourAnchor id="home-room" style={{ width, flex: 1, maxHeight: width * 1.6, marginTop: 4, overflow: 'hidden' }} onLayout={(e) => { setRoomH(e.nativeEvent.layout.height); setRoomPos({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }); }}>
        {roomSlots.every((id) => !id) && (
          <View style={s.empty}>
            <T w="b" size={14} style={{ textAlign: 'center' }}>まだ誰もいません{'\n'}「出会い」からにゃこモビーを迎えましょう</T>
          </View>
        )}
        {roomSlots.map((id, i) => {
          if (!id) return null;
          const pl = placed[i];
          return (
            <View key={id} style={{ position: 'absolute', left: pl.left, top: pl.top, zIndex: Math.round(pl.foot) }}>
              <RoomCat id={id} size={pl.size} delay={i * 260} act={roll.active.get(id)} covered={coverReady && cover?.id === id} onRollDone={() => roll.done(id)} onPet={pet} />
            </View>
          );
        })}
        {/* 右上の丸いボタン：ホームに出す子を選ぶ、ログイン記録。見出しのベル・設定と同じく、絵だけで見せる（名前は読み上げで伝える） */}
        <View style={s.sideBtns}>
          <Tap onPress={() => setSelecting(true)} accessibilityLabel="ホームに出す子をえらぶ">
            {UI['button/home-cats-round'] ? (
              <Pic name="button/home-cats-round" height={SIDE_BTN} />
            ) : (
              // 専用の丸ボタン（button/home-cats-round）が届くまでの代わり：丸い枠に猫の顔
              <View style={{ width: SIDE_BTN, height: SIDE_BTN, alignItems: 'center', justifyContent: 'center' }}>
                <Pic name="button/account-round" height={SIDE_BTN} style={StyleSheet.absoluteFill} />
                <Pic name="icon/cat-head" height={SIDE_BTN * 0.5} />
              </View>
            )}
          </Tap>
          <Tap onPress={openLoginRecord} accessibilityLabel="ログイン記録">
            <Pic name="button/login-record-round" height={SIDE_BTN} />
          </Tap>
        </View>
      </TourAnchor>

      <View style={s.bottom}>
        {/* 通知の「これから」から、いちばん近い予告を1つ。押すと一覧が開く */}
        <Tap style={{ flex: 1 }} onPress={() => openNotice('upcoming')} accessibilityLabel="これから会えるかもしれない猫">
          <Slice name="home/upcoming-card" style={s.upcoming}>
            <Slice name="home/upcoming-well" style={s.upcomingWell}>
              {nextCat ? <CatImage id={nextCat.id} size={58} silhouette={!nextOwned} /> : <Pic name="cat/silhouette-locked" width={48} />}
            </Slice>
            <View style={{ flex: 1 }}>
              {nextCat ? (
                <T w="x" size={14} style={{ lineHeight: 20 }}>
                  {nextOwned ? `${nextDay}に${CAT_BY_ID[nextCat.id].name}に会えるかも！` : `${nextDay}に出会えるかもしれない${nextRare}にゃこモビー！？`}
                </T>
              ) : (
                <T w="b" size={12} color={C.sub}>30日先までは、特別なにゃこモビーの予告はありません</T>
              )}
            </View>
            <Pic name="icon/chevron-right" height={14} />
          </Slice>
        </Tap>
        <Tap style={s.camera} onPress={openCamera} accessibilityLabel="さつえい">
          <Pic name="button/camera-round" height={84} />
        </Tap>
      </View>
    </View>
    {cover && coverIdx >= 0 && rootSize.h > 0 && (
      <PawCover
        key={cover.run}
        id={cover.id}
        size={placed[coverIdx].size}
        left={roomPos.x + placed[coverIdx].left}
        top={roomPos.y + placed[coverIdx].top}
        rootW={rootSize.w}
        rootH={rootSize.h}
        onReady={() => setCoverReady(true)}
        onDone={() => { setCoverReady(false); roll.done(cover.id); }}
      />
    )}
    <HomeSelect visible={selecting} onClose={() => setSelecting(false)} width={width} />
    </View>
  );
}

const SIDE_BTN = 52; // 右上の丸いボタンの大きさ（2つとも同じ）
const SIDE_RIGHT = 14;
const SIDE_BOTTOM = 8 + SIDE_BTN * 2 + 12 + 8; // 2つのボタンの下端（上の余白8、ボタンの間12）に、余白8

const s = StyleSheet.create({
  empty: { position: 'absolute', left: 0, right: 0, top: '40%', alignItems: 'center' },
  bubble: { position: 'absolute', top: -40, width: 120, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16, alignItems: 'center' },
  heart: { position: 'absolute', top: 0 },
  camera: { alignItems: 'center' },
  sideBtns: { position: 'absolute', right: SIDE_RIGHT, top: 8, gap: 12, alignItems: 'center', zIndex: 200 },
  travel: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 2 },
  upcomingWell: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  upcoming: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 96 },
});

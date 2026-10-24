import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { msUntilNextReveal } from '../lib/encounter';
import { useGame, visibleCount } from '../state/game';
import { Bobbing, Btn, C, CAT_BY_ID, CatImage, RarityTag } from '../ui';

export default function TodayScreen() {
  const g = useGame();
  const { state, availableDays, todayKey, now } = g;
  const [day, setDay] = useState(todayKey);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    setDay(todayKey);
    setSel(null);
  }, [todayKey]);

  const rec = state.days[day];
  if (!rec) return <View style={s.wrap}><Text style={s.sub}>準備中…</Text></View>;

  const visible = rec.candidates.slice(0, visibleCount(rec));
  const picked = (id: string) => rec.freePick === id || rec.extraPicks.includes(id);
  const hasFree = !!rec.freePick;
  const mins = Math.ceil(msUntilNextReveal(now) / 60000);
  const countdown = `${Math.floor(mins / 60)}時間${mins % 60}分`;
  const canMoreCands = visible.length < rec.candidates.length;
  const selCat = sel ? CAT_BY_ID[sel] : null;

  const onFree = () => {
    if (!sel) return;
    g.pickFree(day, sel);
    setSel(null);
  };
  const onExtra = () => {
    if (!sel) return;
    if (state.tickets < 1) return Alert.alert('お迎え券が足りません', 'ショップで入手できます');
    g.pickExtra(day, sel);
    setSel(null);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>今日の出会い</Text>
      <Text style={s.sub}>次の出会いまであと {countdown}（毎日20:00）</Text>

      {availableDays.length > 1 && (
        <View style={s.tabs}>
          {availableDays.map((k) => (
            <Pressable key={k} onPress={() => { setDay(k); setSel(null); }} style={[s.dayTab, day === k && s.dayTabOn]}>
              <Text style={{ color: day === k ? '#fff' : C.ink, fontWeight: '700' }}>
                {k === todayKey ? '今日' : 'きのう（あと少し受け取れます）'}
                {!state.days[k]?.freePick ? ' •' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={s.lead}>
        {hasFree ? '無料のお迎えは完了。気になる子は「お迎え券」で追加できます' : `${visible.length}匹の猫モビーと出会いました。好きな1匹を無料で迎えられます`}
      </Text>

      <View style={s.grid}>
        {visible.map((id, i) => {
          const cat = CAT_BY_ID[id];
          const isPicked = picked(id);
          const reason = rec.reasons[id];
          return (
            <Pressable key={id} disabled={isPicked} onPress={() => setSel(id === sel ? null : id)} style={[s.card, sel === id && s.cardSel, isPicked && { opacity: 0.55 }]}>
              <Bobbing delay={i * 150}>
                <CatImage id={id} size={110} />
              </Bobbing>
              <Text style={s.name} numberOfLines={1}>{cat.name}</Text>
              <RarityTag r={cat.rarity} />
              {!!reason && <Text style={s.reason}>✨ {reason}</Text>}
              {state.owned[id] && !isPicked && <Text style={s.owned}>所持 ×{state.owned[id].count}</Text>}
              {isPicked && <Text style={s.done}>お迎え済み</Text>}
            </Pressable>
          );
        })}
      </View>

      {!hasFree && canMoreCands && (
        <View style={{ marginTop: 14 }}>
          <Btn kind="ghost" label={`🌿 またたびで出会いを増やす（所持 ${state.matatabi}）`} disabled={state.matatabi < 1} onPress={() => g.useMatatabi(day)} />
        </View>
      )}

      <View style={s.actions}>
        {selCat ? (
          !hasFree ? (
            <Btn label={`${selCat.name}を無料で迎える`} onPress={onFree} />
          ) : (
            <Btn label={`${selCat.name}を迎える（お迎え券 ${state.tickets}枚所持）`} onPress={onExtra} disabled={state.tickets < 1} />
          )
        ) : (
          <Text style={s.hint}>{hasFree ? '追加で迎える猫をタップ' : '迎えたい猫をタップして選択'}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  sub: { color: C.sub, marginTop: 4 },
  lead: { color: C.ink, marginTop: 12, marginBottom: 8, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dayTab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.line },
  dayTabOn: { backgroundColor: C.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', backgroundColor: C.card, borderRadius: 18, padding: 10, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'transparent' },
  cardSel: { borderColor: C.accent },
  name: { fontWeight: '700', color: C.ink, fontSize: 13 },
  reason: { fontSize: 11, color: '#C9822B', fontWeight: '700' },
  owned: { fontSize: 11, color: C.sub },
  done: { fontSize: 12, color: C.ok, fontWeight: '800' },
  actions: { marginTop: 16, minHeight: 50, justifyContent: 'center' },
  hint: { textAlign: 'center', color: C.sub },
});

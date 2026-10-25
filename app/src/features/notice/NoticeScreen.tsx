import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HINTS, upcoming } from '../../core/conditions';
import { useGame, visibleCount } from '../../core/game';
import { C, CAT_BY_ID, CatImage, T } from '../../ui/base';
import { Card, Well } from '../../ui/kit';
import { Backdrop, Pic, Slice } from '../../ui/Slice';

type Tab = 'notice' | 'history' | 'upcoming';
const TABS: { key: Tab; label: string }[] = [
  { key: 'notice', label: 'お知らせ' },
  { key: 'history', label: '出会い履歴' },
  { key: 'upcoming', label: 'これから' },
];
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const fmt = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${m}/${d}（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
};

// ベルから開く画面。お知らせ / 出会い履歴（迎えなかった子も残る）/ これから会えるかもしれない猫
export default function NoticeScreen({ onClose, initialTab = 'notice' }: { onClose: () => void; initialTab?: Tab }) {
  const { state, todayKey, markInboxRead } = useGame();
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    markInboxRead();
  }, [state.inbox.length, markInboxRead]);
  const days = useMemo(() => Object.keys(state.days).sort().reverse(), [state.days]);
  const next = useMemo(() => upcoming(todayKey, 30, state.birthday), [todayKey, state.birthday]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/screen-shop" />
      <View style={s.head}>
        <Pic name="button/bell-round" height={40} />
        <T w="x" size={22} style={{ marginLeft: 8, flex: 1 }}>お知らせ</T>
        <Pressable onPress={onClose} accessibilityLabel="閉じる"><Pic name="button/close-round" height={40} /></Pressable>
      </View>
      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={{ flex: 1 }} onPress={() => setTab(t.key)}>
            <Slice name={tab === t.key ? 'button/tab-all-on' : 'button/tab-normal'} style={s.tab}>
              <T w="x" size={13} color={tab === t.key ? '#fff' : C.ink}>{t.label}</T>
            </Slice>
          </Pressable>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {tab === 'notice' &&
          (state.inbox.length ? (
            state.inbox.map((n, i) => (
              <Card key={i} skin="white" style={s.row}>
                <Pic name="icon/megaphone" height={28} />
                <View style={{ flex: 1 }}>
                  <T w="m" size={10} color={C.sub}>{fmt(n.day)}</T>
                  <T w="b" size={13}>{n.text}</T>
                </View>
              </Card>
            ))
          ) : (
            <Empty text="まだお知らせはありません" />
          ))}

        {tab === 'history' &&
          (days.length ? (
            days.map((k) => {
              const r = state.days[k];
              const seen = r.candidates.slice(0, visibleCount(r));
              const picked = [r.freePick, ...r.extraPicks].filter(Boolean) as string[];
              return (
                <Card key={k} skin="white" style={{ gap: 6 }}>
                  <T w="x" size={13}>{fmt(k)} の出会い{k === todayKey ? '（今日）' : ''}</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {seen.map((id) => (
                      <View key={id} style={{ width: 64, alignItems: 'center' }}>
                        <Well style={{ width: 60, height: 60 }}><CatImage id={id} size={56} /></Well>
                        {picked.includes(id) && <Pic name="badge/picked-stamp" width={24} style={s.stamp} />}
                        <T w="m" size={9} numberOfLines={1} color={picked.includes(id) ? C.ink : C.sub}>{CAT_BY_ID[id].name}</T>
                      </View>
                    ))}
                  </View>
                  {!r.freePick && <T w="b" size={11} color={C.accent}>まだ無料のお迎えをしていません</T>}
                </Card>
              );
            })
          ) : (
            <Empty text="まだ出会いの記録はありません" />
          ))}

        {tab === 'upcoming' && (
          <>
            <T w="m" size={12} color={C.sub}>暦や月で決まる特別な猫の予告です（30日先まで）。天気・歩数・電池などで来る猫は、その日になってのお楽しみ。</T>
            {next.map(({ day, cats }) => (
              <Card key={day} skin="white" style={{ gap: 6 }}>
                <T w="x" size={13}>{fmt(day)}</T>
                {cats.map((c) => {
                  const own = !!state.owned[c.id];
                  return (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Well style={{ width: 48, height: 48 }}>
                        {own ? <CatImage id={c.id} size={44} /> : <Pic name="cat/silhouette-locked" width={44} />}
                      </Well>
                      <View style={{ flex: 1 }}>
                        <T w="b" size={12}>{own ? CAT_BY_ID[c.id].name : '？？？'}</T>
                        <T w="m" size={11} color={C.sub}>{own ? c.reason : HINTS[c.id] ?? '特別な猫が来るかも'}</T>
                      </View>
                    </View>
                  );
                })}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 40, gap: 8 }}>
      <Pic name="icon/paw" height={40} />
      <T w="b" size={13} color={C.sub}>{text}</T>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  tab: { height: 38, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  stamp: { position: 'absolute', right: 0, top: 0 },
});

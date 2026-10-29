import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useGame } from '../../core/game';
import { C, T } from '../../ui/base';
import { Tap } from '../../ui/kit';
import { Pic, Slice } from '../../ui/Slice';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
// 台紙（login/calendar-base）の左右の固定幅（pt）。日付のマスと曜日の帯は、この内側に並べる
const FRAME_PAD = 30;
const pad2 = (n: number) => String(n).padStart(2, '0');

// ログインした日にスタンプが押される月のカレンダー。記録は起動した日（暦日）から作る
export default function LoginRecordScreen({ onClose, width }: { onClose: () => void; width: number }) {
  const { state, now } = useGame();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const [view, setView] = useState({ y: today.y, m: today.m });
  const stamped = useMemo(() => new Set(state.loginDays ?? []), [state.loginDays]);

  const isCurrent = view.y === today.y && view.m === today.m;
  const lastDay = new Date(view.y, view.m, 0).getDate();
  const firstWeekday = new Date(view.y, view.m - 1, 1).getDay();
  const key = (d: number) => `${view.y}-${pad2(view.m)}-${pad2(d)}`;
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const count = days.filter((d) => stamped.has(key(d))).length;
  const complete = count === lastDay;
  const earliest = (state.loginDays ?? [])[0] ?? '';
  const canPrev = earliest !== '' && `${view.y}-${pad2(view.m)}` > earliest.slice(0, 7);
  const canNext = !isCurrent;
  const move = (n: number) => {
    const t = new Date(view.y, view.m - 1 + n, 1);
    setView({ y: t.getFullYear(), m: t.getMonth() + 1 });
  };

  const inner = Math.min(width, 430) - 32;
  const cell = Math.floor((inner - 2 * FRAME_PAD) / 7);
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pic name="brand/title-login-record" height={36} />
          <View style={{ flex: 1 }} />
          <Tap onPress={onClose} accessibilityLabel="閉じる">
            <Pic name="button/close-round" height={40} />
          </Tap>
        </View>

        <Slice name="login/calendar-base" style={s.frame}>
          <View style={s.monthRow}>
            <Tap onPress={() => move(-1)} disabled={!canPrev} style={{ opacity: canPrev ? 1 : 0.3 }} accessibilityLabel="前の月">
              <Pic name="login/arrow-prev" height={34} />
            </Tap>
            <T w="x" size={18} style={{ flex: 1, textAlign: 'center' }}>{view.y}年{view.m}月</T>
            <Tap onPress={() => move(1)} disabled={!canNext} style={{ opacity: canNext ? 1 : 0.3 }} accessibilityLabel="次の月">
              <Pic name="login/arrow-next" height={34} />
            </Tap>
          </View>

          <Slice name="login/calendar-weekbar" style={[s.weekRow, { width: cell * 7 + 12 }]}>
            {WEEK.map((w, i) => (
              <T key={w} w="x" size={11} color={i === 0 ? '#C0603A' : i === 6 ? '#4A78B5' : C.sub} style={{ width: cell, textAlign: 'center' }}>{w}</T>
            ))}
          </Slice>

          {count > 0 || isCurrent ? (
            <View style={s.grid}>
              {cells.map((d, i) => {
                if (d === null) return <View key={i} style={{ width: cell, height: cell }} />;
                const on = stamped.has(key(d));
                const isToday = isCurrent && d === today.d;
                const bonus = d % 7 === 0 || d === lastDay;
                // 今日は縁取りのマスを土台にして、押した日ならその上にスタンプを重ねる
                const name = isToday ? 'login/cell-today' : on ? (bonus ? 'login/cell-bonus' : 'login/cell-stamped') : 'login/cell-empty';
                return (
                  <View key={i} style={{ width: cell, height: cell }}>
                    <Pic name={name} width={cell} style={StyleSheet.absoluteFill} />
                    {isToday && on && <Pic name="login/stamp-paw" width={cell * 0.48} style={{ position: 'absolute', left: cell * 0.26, top: cell * 0.46 }} />}
                    <T w="x" size={Math.max(10, cell * 0.3)} color={on ? C.accent : C.sub} style={s.dayNum}>{d}</T>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Pic name="illust/empty-login" width={inner * 0.6} />
              <T w="b" size={12} color={C.sub} style={{ marginTop: 4 }}>この月の記録はありません</T>
            </View>
          )}
        </Slice>

        <View style={s.summary}>
          {complete ? <Pic name="login/month-complete" width={96} /> : <Pic name="login/stamp-paw" width={40} />}
          <View style={{ flex: 1 }}>
            <T w="x" size={15}>{complete ? '今月はぜんぶログイン！' : `${count}日 ログイン`}</T>
            <T w="m" size={11} color={C.sub}>連続 {state.streak}日　7日続くたびにお迎え券を1枚どうぞ</T>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  // 上の 63pt は、台紙の輪と見出し帯。月の行は、その帯の中に置く
  frame: { marginTop: 14, paddingTop: 29, paddingBottom: 34, paddingHorizontal: FRAME_PAD },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 24, alignSelf: 'center', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayNum: { position: 'absolute', left: 0, right: 0, top: 4, textAlign: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingHorizontal: 6 },
});

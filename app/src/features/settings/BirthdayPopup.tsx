import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { daysInMonth } from '../../core/birthday';
import { C, T } from '../../ui/base';
import { ImgButton, Tap } from '../../ui/kit';
import { Popup } from '../../ui/Popup';
import { Pic, Slice } from '../../ui/Slice';

// 誕生日を、月→日の順に選んで、「登録する」で決める。一度登録したら変えられないので、この画面と確認のポップで、はっきり伝える。
function Cell({ label, on, onPress, width }: { label: string; on: boolean; onPress: () => void; width: number }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ width }}>
      <Slice name={on ? 'button/tab-all-on' : 'button/tab-normal'} style={s.cell}>
        <T w="x" size={13} color={on ? '#fff' : C.ink}>{label}</T>
      </Slice>
    </Tap>
  );
}

export function BirthdayPopup({ visible, onClose, onRegister }: { visible: boolean; onClose: () => void; onRegister: (m: number, d: number) => void }) {
  const [m, setM] = useState<number | null>(null);
  const [d, setD] = useState<number | null>(null);
  const close = () => {
    setM(null);
    setD(null);
    onClose();
  };
  const days = m ? daysInMonth(m) : 0;
  const ready = m !== null && d !== null && d <= days;
  return (
    <Popup visible={visible} onClose={close} maxWidth={380} heightRatio={0.8}>
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T w="x" size={18} style={{ flex: 1 }}>誕生日を登録</T>
            <Tap onPress={close} accessibilityLabel="閉じる">
              <Pic name="button/close-round" height={40} />
            </Tap>
          </View>
          <T w="x" size={12} color={C.accent} style={{ marginTop: 8 }}>誕生日は、一度登録すると、あとから変更できません。</T>
          <T w="m" size={11} color={C.sub} style={{ marginTop: 2 }}>月と日を選んでから、「登録する」を押してください。年は聞きません。端末の中だけに保存します。</T>

          <T w="x" size={13} style={{ marginTop: 12 }}>月</T>
          <View style={s.grid}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <Cell
                key={n}
                label={`${n}月`}
                on={m === n}
                width={'23.5%' as unknown as number}
                onPress={() => {
                  setM(n);
                  if (d !== null && d > daysInMonth(n)) setD(null); // 選びなおした月に無い日は、外す
                }}
              />
            ))}
          </View>

          <T w="x" size={13} style={{ marginTop: 12 }}>日</T>
          {m === null ? (
            <T w="m" size={11} color={C.sub} style={{ marginTop: 4 }}>先に、月を選んでください。</T>
          ) : (
            <View style={s.grid}>
              {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
                <Cell key={n} label={`${n}`} on={d === n} width={'12.6%' as unknown as number} onPress={() => setD(n)} />
              ))}
            </View>
          )}
        </ScrollView>
        <View style={s.footer}>
          <ImgButton
            label={ready ? `${m}月${d}日で登録する` : '月と日を選んでね'}
            disabled={!ready}
            height={48}
            fontSize={14}
            onPress={() => {
              if (!ready || m === null || d === null) return;
              onRegister(m, d);
            }}
          />
        </View>
      </View>
    </Popup>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 14, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  cell: { height: 36, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 14, paddingTop: 6 },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { REVEAL_HOUR } from '../lib/encounter';
import { STARTERS, useGame } from '../state/game';
import { Bobbing, C, CAT_BY_ID, CatImage, T } from '../ui/base';
import { Card, ImgButton } from '../ui/kit';
import { Backdrop, Pic } from '../ui/Slice';

// 初回起動：相棒を1匹選んでもらい、毎日の出会いのしくみを体験で伝える
export default function OnboardingScreen({ width }: { width: number }) {
  const { chooseStarter } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  const [step, setStep] = useState<'pick' | 'how'>('pick');
  const colW = (width - 32 - 16) / 3;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop name="bg/app-cream" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.wrap}>
        <Pic name="brand/logo-nekomobby" height={56} style={{ alignSelf: 'center' }} />
        {step === 'pick' ? (
          <>
            <T w="x" size={20} style={s.title}>最初の相棒を選んでね</T>
            <T w="m" size={13} color={C.sub} style={s.lead}>選んだ子は、今日からあなたの猫部屋で暮らします</T>
            <View style={s.row}>
              {STARTERS.map((id, i) => (
                <Pressable key={id} style={{ width: colW, alignItems: 'center' }} onPress={() => setSel(id)} accessibilityLabel={CAT_BY_ID[id].name}>
                  {sel === id && <Pic name="cat/halo-select" width={colW * 1.1} style={{ position: 'absolute', top: colW * 0.05 }} />}
                  <Bobbing delay={i * 200}><CatImage id={id} size={colW} /></Bobbing>
                  <Card skin={sel === id ? 'selected' : 'white'} style={s.nameCard}>
                    <T w="x" size={12} numberOfLines={1}>{CAT_BY_ID[id].name}</T>
                  </Card>
                </Pressable>
              ))}
            </View>
            <ImgButton
              label={sel ? `${CAT_BY_ID[sel].name}を相棒にする` : '気になる子をタップしてね'}
              icon="icon/paw"
              height={54}
              disabled={!sel}
              onPress={() => setStep('how')}
              style={{ marginTop: 24 }}
            />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Bobbing><CatImage id={sel!} size={160} /></Bobbing>
            </View>
            <T w="x" size={20} style={s.title}>{CAT_BY_ID[sel!].name}がやってきた！</T>
            <Card style={{ marginTop: 16, gap: 10 }}>
              <How icon="icon/calendar-today" text={`毎日${REVEAL_HOUR}時に、新しい猫モビー3匹と出会えます。1匹は無料でお迎え`} />
              <How icon="icon/sun" text="歩いた日、満月の夜、スマホの電池が1%の日…あなたの毎日によって、会える猫が変わります" />
              <How icon="icon/book" text="条件は世界中のみんなと共通。図鑑のヒントを手がかりに、秘密の条件を見つけよう" />
            </Card>
            <ImgButton label="はじめる" icon="icon/paw" height={54} onPress={() => chooseStarter(sel!)} style={{ marginTop: 24 }} />
            <T w="b" size={12} color={C.sub} style={{ textAlign: 'center', marginTop: 12 }} onPress={() => setStep('pick')}>選び直す</T>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function How({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pic name={icon} height={32} />
      <T w="b" size={13} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 32, paddingBottom: 40 },
  title: { textAlign: 'center', marginTop: 16 },
  lead: { textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 20 },
  nameCard: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: -6 },
});

import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import ShopScreen from './src/screens/ShopScreen';
import TodayScreen from './src/screens/TodayScreen';
import ZukanScreen from './src/screens/ZukanScreen';
import { GameProvider, useGame } from './src/state/game';
import { C } from './src/ui';

const TABS = [
  { key: 'home', label: '猫部屋', icon: '🏠', Screen: HomeScreen },
  { key: 'today', label: '今日の出会い', icon: '🐾', Screen: TodayScreen },
  { key: 'zukan', label: '図鑑', icon: '📖', Screen: ZukanScreen },
  { key: 'shop', label: 'ショップ', icon: '🛍️', Screen: ShopScreen },
] as const;

function Root() {
  const { ready } = useGame();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('today');
  const Active = TABS.find((t) => t.key === tab)!.Screen;
  if (!ready) return <View style={s.fill} />;
  return (
    <SafeAreaView style={s.fill}>
      <View style={s.fill}><Active /></View>
      <View style={s.bar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={s.tab} onPress={() => setTab(t.key)}>
            <Text style={{ fontSize: 20, opacity: tab === t.key ? 1 : 0.45 }}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.key && { color: C.accent }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="dark" />
        <Root />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 10, color: C.sub, marginTop: 2, fontWeight: '700' },
});

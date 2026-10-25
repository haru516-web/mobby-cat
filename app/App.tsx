import {
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DeaiScreen from './src/screens/DeaiScreen';
import HomeScreen from './src/screens/HomeScreen';
import ShopScreen from './src/screens/ShopScreen';
import WorldScreen from './src/screens/WorldScreen';
import ZukanScreen from './src/screens/ZukanScreen';
import { GameProvider, useGame } from './src/state/game';
import { TabBar, TabKey } from './src/ui/kit';
import { Backdrop } from './src/ui/Slice';

const SCREENS = { home: HomeScreen, deai: DeaiScreen, zukan: ZukanScreen, world: WorldScreen };
const MAX_W = 430; // Webで広い画面でもスマホ幅で表示する

function Root() {
  const { ready } = useGame();
  const [fontsLoaded] = useFonts({ MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold });
  const [tab, setTab] = useState<TabKey>('deai');
  const [shop, setShop] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW, MAX_W);
  if (!ready || !fontsLoaded) {
    return (
      <View style={s.fill}>
        <Backdrop name="brand/splash" />
      </View>
    );
  }
  const Active = SCREENS[tab];
  return (
    <View style={[s.fill, { alignItems: 'center' }]}>
      <Backdrop name="bg/app-cream" />
      <View style={[s.fill, { width }]}>
        <SafeAreaView edges={['top']} style={s.fill}>
          <Active go={setTab} openShop={() => setShop(true)} width={width} />
        </SafeAreaView>
        <TabBar tab={tab} onChange={setTab} bottomInset={insets.bottom} />
      </View>
      <Modal visible={shop} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShop(false)}>
        <View style={[s.fill, { alignItems: 'center' }]}>
          <Backdrop name="bg/app-cream" />
          <SafeAreaView style={[s.fill, { width }]}>
            <ShopScreen onClose={() => setShop(false)} />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
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
  fill: { flex: 1 },
});

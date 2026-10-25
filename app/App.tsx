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
import CameraScreen from './src/screens/CameraScreen';
import DeaiScreen from './src/screens/DeaiScreen';
import HomeScreen from './src/screens/HomeScreen';
import NoticeScreen from './src/screens/NoticeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ShopScreen from './src/screens/ShopScreen';
import { NoticeTab } from './src/screens/types';
import WorldScreen from './src/screens/WorldScreen';
import ZukanScreen from './src/screens/ZukanScreen';
import { GameProvider, useGame } from './src/state/game';
import { TabBar, TabKey } from './src/ui/kit';
import { Backdrop } from './src/ui/Slice';

const SCREENS = { home: HomeScreen, deai: DeaiScreen, zukan: ZukanScreen, world: WorldScreen };
const MAX_W = 430; // iPad や Web の広い画面でもスマホ幅で中央に表示する

// 全画面のシート。広い画面ではスマホ幅で中央に置く
function Sheet({ visible, onClose, width, children }: { visible: boolean; onClose: () => void; width: number; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.fill, { alignItems: 'center' }]}>
        <Backdrop name="bg/app-cream" />
        <SafeAreaView style={[s.fill, { width }]}>{children}</SafeAreaView>
      </View>
    </Modal>
  );
}

function Root() {
  const { ready, state } = useGame();
  const [fontsLoaded] = useFonts({ MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold });
  const [tab, setTab] = useState<TabKey>('home');
  const [shop, setShop] = useState(false);
  const [notice, setNotice] = useState<NoticeTab | null>(null);
  const [camera, setCamera] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.min(winW, MAX_W);
  if (!ready || !fontsLoaded) {
    return (
      <View style={s.fill}>
        <Backdrop name="brand/splash" />
      </View>
    );
  }
  if (!state.starterChosen) {
    return (
      <View style={[s.fill, { alignItems: 'center' }]}>
        <Backdrop name="bg/app-cream" />
        <SafeAreaView style={[s.fill, { width }]}>
          <OnboardingScreen width={width} />
        </SafeAreaView>
      </View>
    );
  }
  const Active = SCREENS[tab];
  return (
    <View style={[s.fill, { alignItems: 'center' }]}>
      <Backdrop name="bg/app-cream" />
      <View style={[s.fill, { width }]}>
        <SafeAreaView edges={['top']} style={s.fill}>
          <Active
            go={setTab}
            openShop={() => setShop(true)}
            openNotice={(t = 'notice') => setNotice(t)}
            openCamera={() => setCamera(true)}
            width={width}
          />
        </SafeAreaView>
        <TabBar tab={tab} onChange={setTab} bottomInset={insets.bottom} />
      </View>
      <Sheet visible={shop} onClose={() => setShop(false)} width={width}>
        <ShopScreen onClose={() => setShop(false)} />
      </Sheet>
      <Sheet visible={!!notice} onClose={() => setNotice(null)} width={width}>
        {notice && <NoticeScreen initialTab={notice} onClose={() => setNotice(null)} />}
      </Sheet>
      <Modal visible={camera} animationType="fade" onRequestClose={() => setCamera(false)}>
        <View style={[s.fill, { alignItems: 'center' }]}>
          <Backdrop name="bg/app-cream" />
          <View style={[s.fill, { width }]}>
            {camera && <CameraScreen onClose={() => setCamera(false)} width={width} height={winH} />}
          </View>
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

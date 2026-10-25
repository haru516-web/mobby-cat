import {
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraScreen from './src/features/camera/CameraScreen';
import DeaiScreen from './src/features/deai/DeaiScreen';
import HomeScreen from './src/features/home/HomeScreen';
import NoticeScreen from './src/features/notice/NoticeScreen';
import OnboardingScreen from './src/features/onboarding/OnboardingScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';
import ShopScreen from './src/features/shop/ShopScreen';
import { NoticeTab } from './src/navigation';
import WorldScreen from './src/features/world/WorldScreen';
import TutorialTour from './src/features/tutorial/TutorialTour';
import ZukanScreen from './src/features/zukan/ZukanScreen';
import { GameProvider, useGame } from './src/core/game';
import { initAudio, setBgmScene } from './src/services/audio';
import { TabBar, TabKey, TabPadCtx } from './src/ui/kit';
import { Backdrop } from './src/ui/Slice';
import { TourAnchor } from './src/ui/TourAnchor';

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
  const { ready, state, finishTutorial } = useGame();
  const [fontsLoaded] = useFonts({ MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold });
  const [tab, setTab] = useState<TabKey>('home');
  const [shop, setShop] = useState(false);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState<NoticeTab | null>(null);
  const [camera, setCamera] = useState(false);
  const [replay, setReplay] = useState(false); // 設定から見返すチュートリアル
  const [tabH, setTabH] = useState(0);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.min(winW, MAX_W);
  const tour = replay || !state.tutorialDone;

  useEffect(() => {
    initAudio();
  }, []);
  // 場面に合う BGM を伝える（音源が無いあいだは何も起きない）
  const welcome = ready && (!state.starterChosen || tour);
  useEffect(() => {
    if (!ready) return setBgmScene(null);
    setBgmScene(welcome ? 'bgm_welcome' : tab === 'deai' ? 'bgm_deai' : 'bgm_home');
  }, [ready, welcome, tab]);
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
          <TabPadCtx.Provider value={tabH}>
            <Active
              go={setTab}
              openShop={() => setShop(true)}
              openSettings={() => setSettings(true)}
              openNotice={(t = 'notice') => setNotice(t)}
              openCamera={() => setCamera(true)}
              width={width}
            />
          </TabPadCtx.Provider>
        </SafeAreaView>
        <TourAnchor id="tabbar" style={s.tabbar} onLayout={(e) => setTabH(e.nativeEvent.layout.height)}>
          <TabBar tab={tab} onChange={setTab} bottomInset={insets.bottom} />
        </TourAnchor>
        {tour && (
          <TutorialTour
            bottomInset={insets.bottom}
            onNavigate={setTab}
            onClose={() => {
              setReplay(false);
              finishTutorial();
              setTab('home');
            }}
          />
        )}
      </View>
      <Sheet visible={shop} onClose={() => setShop(false)} width={width}>
        <ShopScreen onClose={() => setShop(false)} />
      </Sheet>
      <Sheet visible={settings} onClose={() => setSettings(false)} width={width}>
        <SettingsScreen
          onClose={() => setSettings(false)}
          onTutorial={() => {
            setSettings(false);
            setTab('home');
            setReplay(true);
          }}
        />
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
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

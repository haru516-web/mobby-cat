import {
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraScreen from './src/features/camera/CameraScreen';
import DeaiScreen from './src/features/deai/DeaiScreen';
import HomeScreen from './src/features/home/HomeScreen';
import LoginRecordScreen from './src/features/login/LoginRecordScreen';
import OpeningScreen from './src/features/opening/OpeningScreen';
import NoticeScreen from './src/features/notice/NoticeScreen';
import OnboardingScreen from './src/features/onboarding/OnboardingScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';
import ShopScreen from './src/features/shop/ShopScreen';
import { NoticeTab } from './src/navigation';
import WorldScreen from './src/features/world/WorldScreen';
import TutorialTour, { TourCoach } from './src/features/tutorial/TutorialTour';
import { emitTour } from './src/features/tutorial/tourStore';
import ZukanScreen from './src/features/zukan/ZukanScreen';
import { AccountProvider } from './src/core/account';
import { GameProvider, useGame } from './src/core/game';
import { initAudio, setBgmScene } from './src/services/audio';
import { TabBar, TabKey, TabPadCtx } from './src/ui/kit';
import { Backdrop } from './src/ui/Slice';
import { Overlay, OverlayHost } from './src/ui/Overlay';
import { Popup } from './src/ui/Popup';
import { TourAnchor } from './src/ui/TourAnchor';
import { ErrorBoundary } from './src/ui/ErrorBoundary';

const SCREENS = { home: HomeScreen, deai: DeaiScreen, zukan: ZukanScreen, world: WorldScreen };
const MAX_W = 430; // iPad や Web の広い画面でもスマホ幅で中央に表示する

function Root() {
  const { ready, state, finishTutorial } = useGame();
  const [fontsLoaded] = useFonts({ MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold });
  const [tab, setTab] = useState<TabKey>('home');
  const [shop, setShop] = useState(false);
  const [settings, setSettings] = useState(false);
  const [loginRecord, setLoginRecord] = useState(false);
  const [opened, setOpened] = useState(false); // 起動時のタイトルを抜けたか
  const [notice, setNotice] = useState<NoticeTab | null>(null);
  const [camera, setCamera] = useState(false);
  const [replay, setReplay] = useState(false); // 設定から見返すチュートリアル
  const [tabH, setTabH] = useState(0);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const width = Math.min(winW, MAX_W);
  const tour = replay || !state.tutorialDone;
  const go = (t: TabKey) => setTab(t);
  const closeShop = () => {
    setShop(false);
    emitTour('popup-closed');
  };
  const closeNotice = () => {
    setNotice(null);
    emitTour('popup-closed');
  };

  useEffect(() => {
    initAudio();
  }, []);
  // 記録を消して最初からやり直したときは、開いていたポップを閉じる（相棒を選んだあとにホームで残らないように）
  useEffect(() => {
    if (ready && !state.starterChosen) {
      setSettings(false);
      setShop(false);
      setNotice(null);
      setLoginRecord(false);
      setCamera(false);
    }
  }, [ready, state.starterChosen]);
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
  if (!opened) {
    return (
      <View style={s.fill}>
        <OpeningScreen onStart={() => setOpened(true)} />
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
        <View style={s.fill}>
          <TabPadCtx.Provider value={tabH}>
            <Active
              go={go}
              openShop={() => setShop(true)}
              openSettings={() => setSettings(true)}
              openLoginRecord={() => setLoginRecord(true)}
              openNotice={(t = 'notice') => setNotice(t)}
              openCamera={() => setCamera(true)}
              width={width}
            />
          </TabPadCtx.Provider>
        </View>
        <TourAnchor id="tabbar" style={s.tabbar} onLayout={(e) => setTabH(e.nativeEvent.layout.height)}>
          <TabBar tab={tab} onChange={go} bottomInset={insets.bottom} />
        </TourAnchor>
        {tour && (
          <TutorialTour
            bottomInset={insets.bottom}
            onNavigate={setTab}
            openPopup={(kind) => (kind === 'shop' ? setShop(true) : setNotice('notice'))}
            closePopups={() => {
              setShop(false);
              setNotice(null);
            }}
            onClose={() => {
              setReplay(false);
              finishTutorial();
              setTab('home');
            }}
          />
        )}
      </View>
      <Popup visible={shop} onClose={closeShop}>
        <ShopScreen onClose={closeShop} />
        <TourCoach kind="shop" />
      </Popup>
      <Popup visible={loginRecord} onClose={() => setLoginRecord(false)}>
        <LoginRecordScreen onClose={() => setLoginRecord(false)} width={width} />
      </Popup>
      <Popup visible={settings} onClose={() => setSettings(false)}>
        <SettingsScreen
          onClose={() => setSettings(false)}
          onTutorial={() => {
            setSettings(false);
            setTab('home');
            setReplay(true);
          }}
        />
      </Popup>
      <Popup visible={!!notice} onClose={closeNotice}>
        {notice && <NoticeScreen initialTab={notice} onClose={closeNotice} />}
        <TourCoach kind="notice" />
      </Popup>
      <Overlay visible={camera} onRequestClose={() => setCamera(false)}>
        <View style={[s.fill, { alignItems: 'center' }]}>
          <Backdrop name="bg/app-cream" />
          <View style={[s.fill, { width }]}>
            {camera && <CameraScreen onClose={() => setCamera(false)} width={width} height={winH} />}
          </View>
        </View>
      </Overlay>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <GameProvider>
          <AccountProvider>
            <View style={s.fill}>
              <Root />
              {/* ポップは、ここにまとめて重ねる（Modal は使わない。順序のきまりは src/ui/overlayStore.ts） */}
              <OverlayHost />
            </View>
          </AccountProvider>
        </GameProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

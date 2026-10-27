import { TabKey } from './ui/kit';

export type NoticeTab = 'notice' | 'history' | 'upcoming';

export type ScreenProps = {
  go: (tab: TabKey) => void;
  openShop: () => void;
  openSettings: () => void;
  openLoginRecord: () => void;
  openNotice: (tab?: NoticeTab) => void;
  openCamera: () => void;
  width: number; // 画面の内容幅（pt）
};

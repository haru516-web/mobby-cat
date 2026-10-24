import { TabKey } from '../ui/kit';

export type ScreenProps = {
  go: (tab: TabKey) => void;
  openShop: () => void;
  width: number; // 画面の内容幅（pt）
};

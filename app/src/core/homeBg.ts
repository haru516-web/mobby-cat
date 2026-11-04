import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { DEFAULT_HOME_BG, HomeBg, homeBgOf } from '../data/homeBg';

// ホームの背景のえらび。端末ごとの見た目の設定なので、ゲームの記録（セーブ）とは別に持つ
const KEY = 'mobby-cat/home-bg/v1';
let current: HomeBg = DEFAULT_HOME_BG;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(KEY).then((v) => {
  const next = homeBgOf(v);
  if (next.id !== current.id) { current = next; emit(); }
}).catch(() => {});

export function setHomeBg(id: string) {
  current = homeBgOf(id);
  emit();
  AsyncStorage.setItem(KEY, current.id).catch(() => {});
}

export function useHomeBg(): HomeBg {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => current, () => current);
}

import { useSyncExternalStore } from 'react';

// チュートリアルと、画面側（ポップの中の説明）をつなぐ小さな橋。
// ・ポップが利用者の操作で閉じたときは、画面側が emitTour('popup-closed') で知らせる
// ・ポップの中に出す説明は、popup に入れておく（TourCoach が読む）
export type TourEvent = 'popup-closed';

type Listener = (e: TourEvent) => void;
const listeners = new Set<Listener>();
export const onTourEvent = (f: Listener) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export const emitTour = (e: TourEvent) => listeners.forEach((f) => f(e));

export type TourPopup = { kind: 'shop' | 'notice'; pos: number; total: number; title: string; detail: string; canBack: boolean; last: boolean };
type Store = { popup: TourPopup | null };
let store: Store = { popup: null };
const subs = new Set<() => void>();
export const setTourPopup = (popup: TourPopup | null) => {
  store = { popup };
  subs.forEach((f) => f());
};
export const useTourPopup = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => store.popup,
  );

// ポップの中の説明の「もどる」「つぎへ」「スキップ」を、チュートリアル本体へ伝える
type Actions = { back: () => void; next: () => void; skip: () => void };
let actions: Actions | null = null;
export const setTourActions = (a: Actions | null) => {
  actions = a;
};
export const tourActions = () => actions;

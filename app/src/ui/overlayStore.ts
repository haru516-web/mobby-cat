import type { ReactNode } from 'react';

/*
 * ポップ（ショップ・設定・確認・演出など）を、ネイティブの Modal ではなく、画面の中の1か所（OverlayHost）に重ねて出す。
 * iOS の Modal は、入れ子にしたり、閉じている最中に別の Modal や Alert を出したりすると、出なかったり、閉じたあとも
 * 画面が固まったままになる。ここでは Modal を使わないので、開く・閉じるは、この一覧に足す・外すだけで決まる。
 *
 * 順序のきまり
 *  1. 開いた順に、下から上へ重ねる。いちばん上のポップだけが、触れる（後ろは、上のポップの暗幕が覆う）。
 *  2. 同じポップが内容を更新しても、重なる順は変わらない（開いた時点のまま）。
 *  3. 閉じるのは、そのポップだけ。上に重なっているほかのポップには、触れない。
 *  4. Android の戻るボタンは、いちばん上のポップだけを閉じる。
 */
export type OverlayEntry = { key: string; node: ReactNode; onClose?: () => void };

let entries: readonly OverlayEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const overlayEntries = (): readonly OverlayEntry[] => entries;
export const topOverlay = (): OverlayEntry | undefined => entries[entries.length - 1];

export function subscribeOverlays(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 足す（すでにあれば、内容だけ差し替える。重なる順は変えない） */
export function setOverlay(key: string, node: ReactNode, onClose?: () => void): void {
  const at = entries.findIndex((entry) => entry.key === key);
  if (at < 0) entries = [...entries, { key, node, onClose }];
  else {
    if (entries[at].node === node && entries[at].onClose === onClose) return;
    entries = entries.map((entry, i) => (i === at ? { key, node, onClose } : entry));
  }
  emit();
}

/** 外す（無ければ何もしない） */
export function removeOverlay(key: string): void {
  if (!entries.some((entry) => entry.key === key)) return;
  entries = entries.filter((entry) => entry.key !== key);
  emit();
}

/** 試験用：すべて外す */
export function clearOverlays(): void {
  if (!entries.length) return;
  entries = [];
  emit();
}

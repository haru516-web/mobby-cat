// 触覚（バイブ）。ON/OFF は音の設定と同じ場所（services/audio.ts）に保存する。
// expo-haptics が無い環境（未インストール・Web）でも落ちない。
import { getAudioSettings } from './audio';

type HapticsMod = {
  impactAsync: (style?: string) => Promise<void>;
  notificationAsync: (type?: string) => Promise<void>;
  selectionAsync: () => Promise<void>;
};
let mod: HapticsMod | null | undefined;
function lib(): HapticsMod | null {
  if (mod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- ネイティブ部分が無い環境では読み込まない
      mod = require('expo-haptics') as HapticsMod;
    } catch {
      mod = null;
    }
  }
  return mod;
}

const run = (f: (h: HapticsMod) => Promise<void>) => {
  if (!getAudioSettings().hapticsEnabled) return;
  const h = lib();
  if (!h) return;
  try {
    f(h).catch(() => {});
  } catch {}
};

export const hapticTap = () => run((h) => h.selectionAsync());
export const hapticLight = () => run((h) => h.impactAsync('light'));
export const hapticSuccess = () => run((h) => h.notificationAsync('success'));

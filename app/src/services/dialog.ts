// 短い案内と確認のダイアログ。Web の Alert は何も出ないので、ブラウザの標準ダイアログを使う
import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
type WebDialogs = { alert?: (m: string) => void; confirm?: (m: string) => boolean };
const web = globalThis as WebDialogs;

export function notice(title: string, message?: string) {
  if (isWeb) web.alert?.(message ? `${title}\n${message}` : title);
  else Alert.alert(title, message);
}

// 取り消せない操作の確認。OK のときだけ onOk を呼ぶ
export function confirmAction(title: string, message: string, okLabel: string, onOk: () => void, style: 'destructive' | 'default' = 'destructive') {
  if (isWeb) {
    if (web.confirm?.(`${title}\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'キャンセル', style: 'cancel' },
    { text: okLabel, style, onPress: onOk },
  ]);
}

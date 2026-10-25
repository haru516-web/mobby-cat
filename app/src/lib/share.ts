// 画面の一部を画像にして共有・保存する。Web など画像化できない環境では文章だけ共有する。
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ViewRef = React.ComponentRef<typeof View>;

export const HASHTAG = '#ねこモビー';

async function capture(ref: React.RefObject<ViewRef | null>): Promise<string | null> {
  if (Platform.OS === 'web' || !ref.current) return null;
  try {
    // 位置情報などのメタデータは付けない（企画書 8.3）
    return await captureRef(ref as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
  } catch {
    return null;
  }
}

export async function shareView(ref: React.RefObject<ViewRef | null>, message: string) {
  const uri = await capture(ref);
  try {
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message, UTI: 'public.png' });
      return;
    }
    await Share.share({ message });
  } catch {
    Alert.alert('共有できませんでした', 'この端末では共有メニューを開けませんでした');
  }
}

export async function saveView(ref: React.RefObject<ViewRef | null>): Promise<boolean> {
  const uri = await capture(ref);
  if (!uri) {
    Alert.alert('保存できません', 'この環境では写真の保存に対応していません（iPhone のアプリで保存できます）');
    return false;
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) {
      Alert.alert('写真へのアクセスが許可されていません', '設定アプリから写真への追加を許可してください');
      return false;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('保存しました', '写真アプリに保存しました');
    return true;
  } catch {
    Alert.alert('保存できませんでした');
    return false;
  }
}

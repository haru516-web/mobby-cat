// 画面の一部を画像にして共有・保存する。
// iPhone: 画像ファイルにして共有メニュー / 写真アプリへ保存。
// Web: 画像（PNG）にして、共有メニューに対応していれば共有、なければダウンロード。
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { notice } from './dialog';

export type ViewRef = React.ComponentRef<typeof View>;

export const HASHTAG = '#ねこモビー';

const isWeb = Platform.OS === 'web';

async function capture(ref: React.RefObject<ViewRef | null>): Promise<string | null> {
  if (!ref.current) return null;
  try {
    // 位置情報などのメタデータは付けない（企画書 8.3）
    const uri = await captureRef(ref as Parameters<typeof captureRef>[0], {
      format: 'png',
      quality: 1,
      result: isWeb ? 'data-uri' : 'tmpfile',
    });
    return isWeb ? await webClearCorners(uri) : uri;
  } catch {
    return null;
  }
}

// Web の画像化は角の透明部分を白で塗るので、画像の四隅とつながった白を透明に戻す
async function webClearCorners(dataUri: string): Promise<string> {
  const img = new Image();
  img.src = dataUri;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  if (!ctx) return dataUri;
  ctx.drawImage(img, 0, 0);
  const { width: w, height: h } = c;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const isWhite = (i: number) => px[i] > 250 && px[i + 1] > 250 && px[i + 2] > 250;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h || seen[y * w + x]) return;
    seen[y * w + x] = 1;
    if (isWhite((y * w + x) * 4)) stack.push(y * w + x);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop()!;
    px[p * 4 + 3] = 0;
    const x = p % w, y = (p - x) / w;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL('image/png');
}

function webBlob(dataUri: string): Blob {
  const [head, body] = dataUri.split(',');
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: head.match(/data:(.*?);/)?.[1] ?? 'image/png' });
}

function webDownload(dataUri: string, name: string) {
  const url = URL.createObjectURL(webBlob(dataUri));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const fileName = () => `nekomobby-${new Date().toISOString().slice(0, 10)}.png`;

export async function shareView(ref: React.RefObject<ViewRef | null>, message: string) {
  const uri = await capture(ref);
  try {
    if (isWeb) {
      if (!uri) return notice('共有できませんでした', '画像を作れませんでした');
      const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
      const file = new File([webBlob(uri)], fileName(), { type: 'image/png' });
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: message });
      } else {
        // 共有メニューのないブラウザでは画像を保存する
        webDownload(uri, fileName());
        notice('画像を保存しました', `共有メニューが使えないので、ダウンロードしました。\n${message}`);
      }
      return;
    }
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message, UTI: 'public.png' });
      return;
    }
    await Share.share({ message });
  } catch (e) {
    // 共有メニューを自分で閉じたときの中断は、失敗として扱わない
    if ((e as { name?: string })?.name === 'AbortError') return;
    notice('共有できませんでした', 'この端末では共有メニューを開けませんでした');
  }
}

export async function saveView(ref: React.RefObject<ViewRef | null>): Promise<boolean> {
  const uri = await capture(ref);
  if (!uri) {
    notice('保存できませんでした', '画像を作れませんでした');
    return false;
  }
  if (isWeb) {
    webDownload(uri, fileName());
    return true;
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) {
      notice('写真へのアクセスが許可されていません', '設定アプリから写真への追加を許可してください');
      return false;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    notice('保存しました', '写真アプリに保存しました');
    return true;
  } catch {
    notice('保存できませんでした');
    return false;
  }
}

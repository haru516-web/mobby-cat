import { Platform } from 'react-native';

// Apple でサインイン。Apple の本人確認の証（identityToken）はサーバーが確かめる。アプリは信用しない。
export type AppleToken = { token: string; authorizationCode?: string } | { reason: 'cancelled' | 'unavailable' | 'failed' };

export async function appleCredential(): Promise<AppleToken> {
  if (Platform.OS !== 'ios') return { reason: 'unavailable' };
  let apple: typeof import('expo-apple-authentication');
  try {
    apple = require('expo-apple-authentication');
  } catch {
    return { reason: 'unavailable' };
  }
  try {
    if (!(await apple.isAvailableAsync())) return { reason: 'unavailable' };
    // 名前もメールも受け取らない（requestedScopes は空）
    const credential = await apple.signInAsync({ requestedScopes: [] });
    // authorizationCode は、削除のときにサーバーが Apple へ取り消しを伝えるために預かる
    return credential.identityToken
      ? { token: credential.identityToken, authorizationCode: credential.authorizationCode ?? undefined }
      : { reason: 'failed' };
  } catch (error) {
    return { reason: (error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'failed' };
  }
}

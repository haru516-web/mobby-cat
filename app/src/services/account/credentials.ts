import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SERVER_URL } from '../../data/appInfo';
import { createClient, type CredentialStore, type Credentials } from './serverClient';

// アカウントの鍵は、端末の Keychain（SecureStore）に入れる。ゲームの記録（AsyncStorage）とは別の場所。
// Keychain は、同じ端末でアプリを入れ直しても残ることが多い。別の端末には移さない（THIS_DEVICE_ONLY）。
// Web（開発用）には Keychain が無いので、AsyncStorage で代用する。
const KEY = 'nyakomobby.account';
const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

function parse(raw: string | null): Credentials | null {
  try {
    const value = JSON.parse(raw ?? 'null') as Partial<Credentials> | null;
    return value && typeof value.userId === 'string' && typeof value.secret === 'string' ? { userId: value.userId, secret: value.secret } : null;
  } catch {
    return null;
  }
}

export const credentialStore: CredentialStore = {
  async read() {
    try {
      return parse(Platform.OS === 'web' ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY, options));
    } catch {
      return null;
    }
  },
  async write(value) {
    if (Platform.OS === 'web') {
      if (value) await AsyncStorage.setItem(KEY, JSON.stringify(value));
      else await AsyncStorage.removeItem(KEY);
      return;
    }
    if (value) await SecureStore.setItemAsync(KEY, JSON.stringify(value), options);
    else await SecureStore.deleteItemAsync(KEY, options);
  },
};

export const server = createClient(SERVER_URL, credentialStore);

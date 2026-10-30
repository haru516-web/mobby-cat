import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { disableDailyNotification } from '../services/notify';
import { appleCredential } from '../services/account/appleSignIn';
import { createAppStore } from '../services/account/appStore';
import { emptyCloudMeta, fingerprint, fromRecord, isEmptyRecord, normalizeCloudMeta, toRecord, uploadWaitMs, type CloudMeta } from '../services/account/cloudSave';
import { server } from '../services/account/credentials';
import type { ProductKey } from '../services/account/products';
import { buy as buyProduct, fetchPlan, fetchWallet, setAgeGroup, settle, spendPaid, type AgeGroup, type BuyOutcome, type Plan, type SettleOutcome } from '../services/account/purchase';
import { ok } from '../services/account/serverClient';
import { useGame } from './game';

/*
 * アカウント・購入・クラウドセーブを、画面とゲームの記録につなぐ。
 *  - 遊ぶだけなら、アカウントは作らない（端末の中だけ）。Apple 連携か購入のときに、はじめて作る。
 *  - 購入は匿名のアカウントのままでできる。Apple 連携は任意で、連携すると、記録をクラウドに預け、機種変更でも戻せる。
 *  - 買った分のお迎え券・またたびと、またたびパスの有無は、サーバーが正しい値を持つ。ここは写しを持つだけ。
 */

const META_KEY = 'mobby-cat/cloud/v1';
const REFRESH_GAP_MS = 60_000;
// アプリを開いたままでも、ときどきサーバーを確かめる（またたびパスの更新・終了を反映するため。B-01）
const REFRESH_EVERY_MS = 30 * 60_000;
// 預けられなかったときに、預け直すまでの時間
const RETRY_MS = 2 * 60_000;

// off: 預けていない / saving: 預けている途中 / synced: 預けた / failed: 預けられなかった（あとで自動で預け直す） / conflict: 食い違い
export type CloudStatus = 'off' | 'saving' | 'synced' | 'failed' | 'conflict';
type Pending = { data: string; version: number; updatedAt: string };

// ok_unsaved: サインインはできたが、記録はまだ預けられていない（あとで自動で預ける）
export type LinkOutcome = 'ok' | 'ok_unsaved' | 'cancelled' | 'unavailable' | 'offline' | 'failed' | 'in_use';
export type RestoreOutcome = 'restored' | 'choose' | 'nothing' | 'cancelled' | 'unavailable' | 'offline' | 'failed';
export type DeleteOutcome = 'deleted' | 'offline' | 'failed' | 'apple_needed' | 'apple_mismatch' | 'signed_out';

type Ctx = {
  /** 起動時の確認が終わったか */
  ready: boolean;
  /** Apple 連携済みか。アカウントがまだ無ければ false、つながらなくて分からないときは null */
  linked: boolean | null;
  /** この端末の鍵が、サーバーに受け付けられない（別の端末が引き継いだ、またはアカウントが無い） */
  signedOut: boolean;
  plan: Plan;
  cloud: CloudStatus;
  /** 最後にクラウドに預けた（受け取った）時刻（ms）。まだなら null */
  cloudSavedAt: number | null;
  /** 預け直す */
  retryCloud: () => Promise<boolean>;
  /** 年齢の区分（まだ選んでいなければ null） */
  ageGroup: AgeGroup | null;
  /** 記録が、この端末とクラウドで食い違っている（どちらを使うか選ぶ） */
  pendingCloud: { updatedAt: string } | null;
  storeAvailable: boolean;
  prices: Record<string, string>;
  loadPrices: () => Promise<void>;
  refresh: () => Promise<void>;
  linkApple: () => Promise<LinkOutcome>;
  restoreWithApple: () => Promise<RestoreOutcome>;
  resolveCloud: (choice: 'local' | 'cloud') => Promise<boolean>;
  buy: (key: ProductKey) => Promise<BuyOutcome>;
  restorePurchases: () => Promise<SettleOutcome>;
  setAge: (group: AgeGroup) => Promise<boolean>;
  deleteAccount: () => Promise<DeleteOutcome>;
  /** 受け付けられない鍵を捨てて、新しく始める */
  startOver: () => Promise<void>;
};

const AccountCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAccount = () => useContext(AccountCtx);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const g = useGame();
  const gRef = useRef(g);
  gRef.current = g;
  const store = useMemo(() => createAppStore(), []);

  const [ready, setReady] = useState(false);
  const [linked, setLinkedState] = useState<boolean | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [plan, setPlan] = useState<Plan>('none');
  const [cloud, setCloud] = useState<CloudStatus>('off');
  const [pending, setPendingState] = useState<Pending | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [cloudSavedAt, setCloudSavedAt] = useState<number | null>(null);
  const [ageGroup, setAgeGroupState] = useState<AgeGroup | null>(null);

  // 画面の外（非同期の途中）から、いまの値を読むための写し
  const linkedRef = useRef<boolean | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const meta = useRef<CloudMeta>(emptyCloudMeta());
  const syncing = useRef(false);
  const lastRefresh = useRef(0);

  const setLinked = (value: boolean | null) => { linkedRef.current = value; setLinkedState(value); };
  const setPending = (value: Pending | null) => { pendingRef.current = value; setPendingState(value); };
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMeta = (value: CloudMeta) => {
    meta.current = value;
    setCloudSavedAt(value.at > 0 ? value.at : null);
    AsyncStorage.setItem(META_KEY, JSON.stringify(value)).catch(() => {});
  };

  // クラウドの記録で、この端末の記録を置き換える
  const applyCloud = useCallback((from: Pending): boolean => {
    const record = fromRecord(from.data);
    if (!record) return false;
    gRef.current.replaceState(record);
    saveMeta({ version: from.version, hash: fingerprint(from.data), at: Date.now() });
    setPending(null);
    setCloud('synced');
    return true;
  }, []);

  const readCloud = useCallback(async (): Promise<Pending | 'none' | 'offline'> => {
    const reply = await server.authedIfAny('/save', { method: 'GET' });
    if (reply === null) return 'offline';
    if (reply.status === 404) return 'none';
    const data = reply.data;
    if (!ok(reply) || !data || typeof data.data !== 'string' || typeof data.version !== 'number') return 'offline';
    return { data: data.data, version: data.version, updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '' };
  }, []);

  // 別の端末で記録が更新されていたとき。この端末が空なら、そのままクラウドの記録を使う。そうでなければ、選んでもらう
  const handleConflict = useCallback(async () => {
    const found = await readCloud();
    if (found === 'offline' || found === 'none') return;
    if (isEmptyRecord(gRef.current.state)) applyCloud(found);
    else { setPending(found); setCloud('conflict'); }
  }, [applyCloud, readCloud]);

  /**
   * いまの記録を預ける。クラウドが最新になったら（変わっていなかったときも）true。
   * 続けて預けすぎないよう間をあけるときは、その時間のあとに預け直す（B-06）。預けられなかったときは、少しあとに預け直す（B-05）。
   */
  const syncCloud = useCallback(async (force: boolean): Promise<boolean> => {
    if (linkedRef.current !== true || pendingRef.current || syncing.current) return false;
    const record = toRecord(gRef.current.state);
    const hash = fingerprint(record);
    const wait = uploadWaitMs(meta.current, hash, Date.now(), force);
    if (wait === null) return true;
    const retry = (ms: number) => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => { retryTimer.current = null; void syncRef.current(false); }, ms);
    };
    if (wait > 0) { retry(wait + 1000); return false; }
    syncing.current = true;
    setCloud('saving');
    try {
      const reply = await server.authedIfAny('/save', { body: { data: record, baseVersion: meta.current.version } });
      if (ok(reply) && typeof reply?.data?.version === 'number') {
        saveMeta({ version: reply.data.version, hash, at: Date.now() });
        setCloud('synced');
        return true;
      }
      if (reply?.status === 409) await handleConflict();
      else if (reply?.status === 401) setSignedOut(true);
      else retry(RETRY_MS);
      setCloud((value) => (value === 'saving' ? 'failed' : value));
      return false;
    } catch {
      setCloud('failed');
      retry(RETRY_MS);
      return false;
    } finally {
      syncing.current = false;
    }
  }, [handleConflict]);
  const syncRef = useRef(syncCloud);
  syncRef.current = syncCloud;

  // サーバーの答えを写す：Apple 連携、買った分の残高、またたびパス
  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now();
    const creds = await server.existing();
    if (!creds) { setLinked(false); return; }
    const profile = await server.raw('/profile', { method: 'GET', auth: creds });
    if (profile === null) return; // つながらない：前回の写しのまま
    if (profile.status === 401) { setSignedOut(true); return; }
    if (!ok(profile) || typeof profile.data?.appleLinked !== 'boolean') return;
    setSignedOut(false);
    setLinked(profile.data.appleLinked);
    const group = profile.data.ageGroup;
    setAgeGroupState(group === 'under16' || group === '16to19' || group === 'adult' ? group : null);
    // 前回、途中で止まった購入を片づけてから、残高を読む
    await settle(store, server).catch(() => undefined);
    const quiet = { authed: server.authedIfAny };
    const wallet = await fetchWallet(quiet);
    if (wallet) gRef.current.setPaid(wallet);
    const current = await fetchPlan(quiet);
    if (current) { setPlan(current.plan); gRef.current.setPass(current.plan !== 'none', current.until); }
    if (profile.data.appleLinked) {
      // 預けたことがあれば「預けた」。まだなら、下の「少し待ってから預ける」が預ける
      if (meta.current.hash) setCloud((value) => (value === 'off' ? 'synced' : value));
      // 入れ直した端末など、記録が空のときは、クラウドの記録をそのまま戻す
      if (isEmptyRecord(gRef.current.state)) {
        const found = await readCloud();
        if (found !== 'none' && found !== 'offline') applyCloud(found);
      }
    }
  }, [applyCloud, readCloud, store]);

  // 起動：預けた記録の状態を読み、サーバーを確かめる
  useEffect(() => {
    if (!g.ready) return;
    let alive = true;
    (async () => {
      try { meta.current = normalizeCloudMeta(JSON.parse((await AsyncStorage.getItem(META_KEY)) ?? 'null')); } catch { meta.current = emptyCloudMeta(); }
      await refresh().catch(() => undefined);
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, [g.ready, refresh]);

  // 記録が変わったら、少し待ってから預ける。アプリを閉じるときは、待たずに預ける。戻ってきたら、サーバーを確かめ直す
  useEffect(() => {
    if (linked !== true || cloud === 'conflict') return;
    const timer = setTimeout(() => { void syncCloud(false); }, 30_000);
    return () => clearTimeout(timer);
  }, [g.state, linked, cloud, syncCloud]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') void syncCloud(true);
      else if (next === 'active' && Date.now() - lastRefresh.current > REFRESH_GAP_MS) void refresh();
    });
    return () => sub.remove();
  }, [refresh, syncCloud]);
  // アプリを開いたままでも、ときどきサーバーを確かめる。またたびパスの期間の終わりにも確かめる（更新されていれば、続けて使える）
  const passUntil = g.state.pass.until;
  useEffect(() => {
    if (!ready) return;
    const every = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, REFRESH_EVERY_MS);
    const left = passUntil ? passUntil - (Date.now() + (gRef.current.state.clockSkewMs ?? 0)) : -1;
    const atEnd = left > 0 && left < REFRESH_EVERY_MS ? setTimeout(() => void refresh(), left + 5000) : null;
    return () => { clearInterval(every); if (atEnd) clearTimeout(atEnd); };
  }, [ready, refresh, passUntil]);

  // 買った分は、サーバーの残高から使う
  useEffect(() => {
    gRef.current.registerSpender(async (currency, amount, requestId) => {
      const result = await spendPaid(server, currency, amount, requestId);
      if (result.kind !== 'ok') return result.kind === 'short' ? 'short' : 'offline';
      if (result.wallet) gRef.current.setPaid(result.wallet);
      return 'ok';
    });
    return () => gRef.current.registerSpender(null);
  }, []);

  const linkApple = useCallback(async (): Promise<LinkOutcome> => {
    const credential = await appleCredential();
    if ('reason' in credential) return credential.reason;
    if (!(await server.account())) return 'offline';
    const reply = await server.authed('/account/apple/link', { body: { identityToken: credential.token, authorizationCode: credential.authorizationCode } });
    if (reply === null) return 'offline';
    if (ok(reply)) {
      setSignedOut(false);
      setLinked(true);
      // 預けられたときだけ「預けました」と伝える。預けられなければ、あとで自動で預け直す（B-05）
      const saved = await syncCloud(true);
      await refresh();
      return saved ? 'ok' : 'ok_unsaved';
    }
    if (reply.status === 409 && reply.data?.error === 'apple_in_use') return 'in_use';
    if (reply.status === 401 && reply.data?.error === 'unauthorized') setSignedOut(true);
    return 'failed';
  }, [refresh, syncCloud]);

  const restoreWithApple = useCallback(async (): Promise<RestoreOutcome> => {
    const credential = await appleCredential();
    if ('reason' in credential) return credential.reason;
    const reply = await server.raw('/auth/apple', { body: { identityToken: credential.token, authorizationCode: credential.authorizationCode } });
    if (reply === null) return 'offline';
    if (reply.status === 404) return 'nothing';
    const data = reply.data;
    if (!ok(reply) || !data || typeof data.userId !== 'string' || typeof data.secret !== 'string') return 'failed';
    // この端末が、そのアカウントを引き継ぐ（前の端末の鍵は使えなくなる）
    await server.adopt({ userId: data.userId, secret: data.secret });
    setSignedOut(false);
    setLinked(true);
    saveMeta(emptyCloudMeta());
    const found = await readCloud();
    await refresh();
    if (found === 'offline') return 'failed';
    if (found === 'none') return 'restored'; // 記録は無いが、購入したものは戻る
    if (isEmptyRecord(gRef.current.state)) return applyCloud(found) ? 'restored' : 'failed';
    setPending(found);
    setCloud('conflict');
    return 'choose';
  }, [applyCloud, readCloud, refresh]);

  const resolveCloud = useCallback(async (choice: 'local' | 'cloud'): Promise<boolean> => {
    const from = pendingRef.current;
    if (!from) return false;
    if (choice === 'cloud') return applyCloud(from);
    // この端末の記録を使う：クラウドの版を踏まえて、上書きする
    saveMeta({ version: from.version, hash: '', at: 0 });
    setPending(null);
    return syncCloud(true);
  }, [applyCloud, syncCloud]);

  const buy = useCallback(async (key: ProductKey): Promise<BuyOutcome> => {
    const outcome = await buyProduct(key, store, server);
    if (outcome.ok) await refresh();
    return outcome;
  }, [refresh, store]);

  const restorePurchases = useCallback(async (): Promise<SettleOutcome> => {
    const outcome = await settle(store, server, { recover: true });
    await refresh();
    return outcome;
  }, [refresh, store]);

  const setAge = useCallback(async (group: AgeGroup) => {
    const done = await setAgeGroup(server, group);
    if (done) setAgeGroupState(group);
    return done;
  }, []);
  const retryCloud = useCallback(() => syncCloud(true), [syncCloud]);
  const stopRetry = () => { if (retryTimer.current) clearTimeout(retryTimer.current); retryTimer.current = null; };

  const deleteAccount = useCallback(async (): Promise<DeleteOutcome> => {
    const creds = await server.existing();
    const finish = async (): Promise<DeleteOutcome> => {
      await server.adopt(null);
      saveMeta(emptyCloudMeta());
      setLinked(false);
      setSignedOut(false);
      setPlan('none');
      setCloud('off');
      setPending(null);
      setAgeGroupState(null);
      stopRetry();
      await disableDailyNotification();
      gRef.current.reset();
      return 'deleted';
    };
    if (!creds) return finish(); // サーバーにはなにも無い：端末の記録だけ消す
    let reply = await server.raw('/account/delete', { body: { confirm: 'delete' }, auth: creds });
    // サーバーが Apple のトークンを持っていない：もう一度 Apple でサインインして、新しい認可コードを渡す
    if (reply?.status === 409 && reply.data?.error === 'apple_reauth_required') {
      const credential = await appleCredential();
      if ('reason' in credential || !credential.authorizationCode) return 'apple_needed';
      reply = await server.raw('/account/delete', { body: { confirm: 'delete', authorizationCode: credential.authorizationCode }, auth: creds });
    }
    if (reply === null) return 'offline';
    if (reply.status === 409 && (reply.data?.error === 'apple_account_mismatch' || reply.data?.error === 'apple_identity_unverified')) return 'apple_mismatch';
    if (reply.status === 401) { setSignedOut(true); return 'signed_out'; }
    return ok(reply) ? finish() : 'failed';
  }, []);

  const startOver = useCallback(async () => {
    await server.adopt(null);
    saveMeta(emptyCloudMeta());
    setSignedOut(false);
    setLinked(false);
    setPlan('none');
    setCloud('off');
    setAgeGroupState(null);
    stopRetry();
    gRef.current.setPaid({ tickets: 0, matatabi: 0 });
    gRef.current.setPass(false);
  }, []);

  const loadPrices = useCallback(async () => {
    if (store) setPrices(await store.prices());
  }, [store]);

  const value: Ctx = {
    ready, linked, signedOut, plan, cloud, cloudSavedAt, retryCloud, ageGroup, pendingCloud: pending ? { updatedAt: pending.updatedAt } : null,
    storeAvailable: !!store, prices, loadPrices, refresh, linkApple, restoreWithApple, resolveCloud, buy, restorePurchases, setAge, deleteAccount, startOver,
  };
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

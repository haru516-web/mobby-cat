import type { PurchasedItem, PurchaseStore } from './appStore';
import { PASS_PLAN, PRODUCTS, isKnownSku, type ProductKey } from './products';
import { ok, type Client, type Reply } from './serverClient';

/*
 * お迎え券・またたび・またたびパスの購入。順番を守って、支払いが失われないようにする。
 *   1. アカウントと、Apple 連携を確かめる（購入の前に、Apple 連携が必須）
 *   2. 年齢の区分と、今月の購入上限を確かめる
 *   3. App Store で購入（アカウントの番号を appAccountToken に付ける）
 *   4. サーバーが Apple の署名つきの取引を確かめて、残高に足す
 *   5. そのあとで、取引を終える
 * 4 か 5 で失敗しても、取引は終わらないまま残る。App Store が次の起動で再送するので、settle() が仕上げる。
 */

export type AgeGroup = 'under16' | '16to19' | 'adult';
export type Limits = { ageGroup: AgeGroup | null; capYen: number | null; remainingYen: number | null; restricted: boolean };
export type Wallet = { tickets: number; matatabi: number };
export type Plan = 'none' | typeof PASS_PLAN;

export type BuyOutcome =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable' | 'verify_failed' | 'age_needed' | 'apple_needed' | 'restricted'; detail?: string }
  | { ok: false; reason: 'limit'; capYen: number; remainingYen: number };

export async function fetchWallet(api: Pick<Client, 'authed'>): Promise<Wallet | null> {
  const reply = await api.authed('/wallet', { method: 'GET' });
  const tickets = reply?.data?.tickets;
  const matatabi = reply?.data?.matatabi;
  if (!ok(reply) || typeof tickets !== 'number' || typeof matatabi !== 'number') return null;
  return { tickets: Math.max(0, tickets), matatabi: Math.max(0, matatabi) };
}

export async function fetchPlan(api: Pick<Client, 'authed'>): Promise<Plan | null> {
  const reply = await api.authed('/plan', { method: 'GET' });
  if (!ok(reply)) return null;
  return reply?.data?.plan === PASS_PLAN ? PASS_PLAN : 'none';
}

export async function fetchLimits(api: Pick<Client, 'authed'>): Promise<Limits | null> {
  const reply = await api.authed('/limits', { method: 'GET' });
  const data = reply?.data;
  if (!ok(reply) || !data) return null;
  const group = data.ageGroup;
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  return {
    ageGroup: group === 'under16' || group === '16to19' || group === 'adult' ? group : null,
    capYen: num(data.capYen),
    remainingYen: num(data.remainingYen),
    restricted: data.restricted === true,
  };
}

export async function fetchProfile(api: Pick<Client, 'authed'>): Promise<{ appleLinked: boolean } | null> {
  const reply = await api.authed('/profile', { method: 'GET' });
  return ok(reply) && typeof reply?.data?.appleLinked === 'boolean' ? { appleLinked: reply.data.appleLinked === true } : null;
}

/** 年齢の区分を記録する。間違えて選んだときは下げられるが、上げられない。 */
export async function setAgeGroup(api: Pick<Client, 'authed'>, group: AgeGroup): Promise<boolean> {
  return ok(await api.authed('/profile/age-group', { body: { ageGroup: group } }));
}

const verify = async (api: Pick<Client, 'authed'>, jws: string) => ok(await api.authed('/purchases/verify', { body: { signedTransactionInfo: jws } }));

export async function buy(key: ProductKey, store: PurchaseStore | null, api: Pick<Client, 'authed' | 'account'>): Promise<BuyOutcome> {
  if (!store) return { ok: false, reason: 'unavailable', detail: 'store_module_missing' };
  const product = PRODUCTS[key];
  const account = await api.account();
  if (!account) return { ok: false, reason: 'offline' };

  const profile = await fetchProfile(api);
  if (!profile) return { ok: false, reason: 'offline' };
  // 購入の前に Apple 連携を必須にする。連携していれば、機種変更でも、購入したものを引き継げる
  if (!profile.appleLinked) return { ok: false, reason: 'apple_needed' };

  const limits = await fetchLimits(api);
  if (!limits) return { ok: false, reason: 'offline' };
  if (limits.restricted) return { ok: false, reason: 'restricted' };
  if (limits.ageGroup === null) return { ok: false, reason: 'age_needed' };
  if (limits.capYen !== null && limits.remainingYen !== null && product.priceYen > limits.remainingYen) {
    return { ok: false, reason: 'limit', capYen: limits.capYen, remainingYen: limits.remainingYen };
  }

  let bought: PurchasedItem | 'cancelled';
  try {
    bought = await store.purchase(product, account.userId);
  } catch (error) {
    return { ok: false, reason: 'unavailable', detail: error instanceof Error ? error.message : String(error) };
  }
  if (bought === 'cancelled') return { ok: false, reason: 'cancelled' };
  if (!(await verify(api, bought.jws))) return { ok: false, reason: 'verify_failed' };
  await bought.finish().catch(() => undefined);
  return { ok: true };
}

/**
 * 前回、途中で止まった購入と、いま有効なサブスクを、サーバーに確かめてもらう。起動のたびに呼んでよい。
 * 別のアカウントの購入（appAccountToken が違う）は、数えずに数だけ返す。
 */
export type SettleOutcome = { kind: 'offline' } | { kind: 'done'; credited: number; otherAccount: number; failed: number };
export async function settle(store: PurchaseStore | null, api: Pick<Client, 'authedIfAny'>): Promise<SettleOutcome> {
  const items = store ? await store.unfinished().catch(() => [] as PurchasedItem[]) : [];
  let credited = 0;
  let otherAccount = 0;
  let failedCount = 0;
  for (const item of items.filter((candidate) => isKnownSku(candidate.sku))) {
    const reply: Reply = await api.authedIfAny('/purchases/verify', { body: { signedTransactionInfo: item.jws } });
    if (reply === null) return { kind: 'offline' };
    if (ok(reply)) { credited += 1; await item.finish().catch(() => undefined); }
    else if (reply?.status === 403 && reply.data?.error === 'app_account_token_mismatch') otherAccount += 1;
    else failedCount += 1;
  }
  return { kind: 'done', credited, otherAccount, failed: failedCount };
}

/**
 * 買った分の残高から使う。同じ requestId は一度しか引かれず、もう一度送れば「使えた」と答える（通信が切れても、二重には引かれない）。
 * 使えたときは、サーバーの残高を返す。
 */
export type SpendOutcome = { kind: 'ok'; wallet: Wallet | null } | { kind: 'short' } | { kind: 'offline' };
export async function spendPaid(api: Pick<Client, 'authed'>, currency: 'tickets' | 'matatabi', amount: number, requestId: string): Promise<SpendOutcome> {
  const reply = await api.authed('/wallet/consume', { body: { currency, amount, requestId } });
  if (reply === null) return { kind: 'offline' };
  if (ok(reply)) {
    const remaining = reply?.data?.remaining as Partial<Wallet> | undefined;
    const wallet = remaining && typeof remaining.tickets === 'number' && typeof remaining.matatabi === 'number' ? { tickets: remaining.tickets, matatabi: remaining.matatabi } : null;
    return { kind: 'ok', wallet };
  }
  return reply?.status === 409 ? { kind: 'short' } : { kind: 'offline' };
}

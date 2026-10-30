import type { PurchasedItem, PurchaseStore } from './appStore';
import { PASS_PLAN, PRODUCTS, isKnownSku, type ProductKey } from './products';
import { ok, type Client, type Reply } from './serverClient';

/*
 * お迎え券・またたび・またたびパスの購入。順番を守って、支払いが失われないようにする。
 *   1. アカウントを確かめる（匿名のアカウントのままで買える。Apple 連携は、機種変更で引き継ぐための任意のもの。ガイドライン 5.1.1）
 *   2. 年齢の区分と、今月の購入上限を確かめる
 *   3. App Store で購入（アカウントの番号を appAccountToken に付ける）
 *   4. サーバーが Apple の署名つきの取引を確かめて、残高に足す
 *   5. そのあとで、取引を終える
 * 4 か 5 で失敗しても、取引は終わらないまま残る。App Store が次の起動で再送するので、settle() が仕上げる。
 */

export type AgeGroup = 'under16' | '16to19' | 'adult';
export const AGE_RANK: Record<AgeGroup, number> = { under16: 0, '16to19': 1, adult: 2 };
export type Limits = { ageGroup: AgeGroup | null; capYen: number | null; remainingYen: number | null; restricted: boolean };
export type Wallet = { tickets: number; matatabi: number };
export type Plan = 'none' | typeof PASS_PLAN;

export type BuyOutcome =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable' | 'verify_failed' | 'age_needed' | 'restricted'; detail?: string }
  | { ok: false; reason: 'limit'; capYen: number; remainingYen: number };

export async function fetchWallet(api: Pick<Client, 'authed'>): Promise<Wallet | null> {
  const reply = await api.authed('/wallet', { method: 'GET' });
  const tickets = reply?.data?.tickets;
  const matatabi = reply?.data?.matatabi;
  if (!ok(reply) || typeof tickets !== 'number' || typeof matatabi !== 'number') return null;
  return { tickets: Math.max(0, tickets), matatabi: Math.max(0, matatabi) };
}

/** いまのプランと、その期間が終わる時刻（ms。サーバーの時計。分からなければ undefined）。つながらなければ null。 */
export async function fetchPlan(api: Pick<Client, 'authed'>): Promise<{ plan: Plan; until?: number } | null> {
  const reply = await api.authed('/plan', { method: 'GET' });
  if (!ok(reply)) return null;
  const until = typeof reply?.data?.until === 'string' ? Date.parse(reply.data.until) : NaN;
  return reply?.data?.plan === PASS_PLAN ? { plan: PASS_PLAN, ...(Number.isFinite(until) ? { until } : {}) } : { plan: 'none' };
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

// 購入の画面は、一度に1つだけ開く。上限の確認と支払いのあいだに、別の購入が割り込まないようにする（B-12）。
// アカウントの鍵は1台の端末にしかない（引き継ぐと前の端末の鍵は使えなくなる）ので、同じアカウントで同時に買えるのは、この端末だけ
let buying = false;
export async function buy(key: ProductKey, store: PurchaseStore | null, api: Pick<Client, 'authed' | 'account'>): Promise<BuyOutcome> {
  if (!store) return { ok: false, reason: 'unavailable', detail: 'store_module_missing' };
  if (buying) return { ok: false, reason: 'cancelled' };
  buying = true;
  try {
    return await buyOnce(key, store, api);
  } finally {
    buying = false;
  }
}
async function buyOnce(key: ProductKey, store: PurchaseStore, api: Pick<Client, 'authed' | 'account'>): Promise<BuyOutcome> {
  const product = PRODUCTS[key];
  const account = await api.account();
  if (!account) return { ok: false, reason: 'offline' };

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
 * ただし、この端末のアカウントが空（新しい端末で、まだ何も買っていない）ときは、Apple が署名した購入を証明にして、
 * 購入したアカウントを、この端末に引き継ぐ（Apple 連携なしで買った人が、機種変更しても、パスを復元できるように）。
 */
export type SettleOutcome =
  | { kind: 'offline' }
  | { kind: 'store_error' }
  | { kind: 'done'; credited: number; otherAccount: number; failed: number; recovered: boolean; incomplete: boolean; proofUsed: boolean };

type SettleApi = Pick<Client, 'authed' | 'authedIfAny' | 'existing' | 'raw' | 'adopt' | 'account'>;
// recover: 購入の証明で、購入したアカウントを、この端末へ引き継いでよいか。ユーザーが「購入を復元」を押したときだけ true（起動時の自動の確認では、鍵を入れ替えない）
export type SettleOptions = { recover?: boolean; transferCode?: string };

// この端末のアカウントが空か（何も買っておらず、パスもない）。空でないアカウントを、よそのアカウントで置き換えて見失わないため
// Apple でサインイン済み（クラウドに記録がありうる）のアカウントは、空とみなさない。Apple でサインインして引き継ぐ
async function isEmptyAccount(api: Pick<Client, 'authed'>): Promise<boolean> {
  const [wallet, plan, profile] = await Promise.all([fetchWallet(api), fetchPlan(api), fetchProfile(api)]);
  return !!wallet && !!plan && !!profile && !profile.appleLinked && wallet.tickets === 0 && wallet.matatabi === 0 && plan.plan === 'none';
}

// 前の端末で発行した引継ぎコードを証明にして、そのアカウントの鍵を、この端末へ移す（購入履歴は要らない。またたび・お迎え券だけの人も戻せる）
async function recoverAccount(api: Pick<Client, 'raw' | 'adopt' | 'account'>, transferCode: string): Promise<'ok' | 'offline' | 'no' | 'used'> {
  // account() saves the replacement secret before any key rotation. A lost response can retry the same secret.
  const replacement = await api.account().catch(() => null);
  if (!replacement) return 'offline';
  const reply = await api.raw('/auth/recover-with-code', { body: { transferCode, newSecret: replacement.secret } });
  if (reply === null) return 'offline';
  const data = reply.data;
  if (reply.status === 200 && data && typeof data.userId === 'string' && typeof data.secret === 'string' && data.secret === replacement.secret && data.userId === transferCode.split('.')[0]) {
    try { await api.adopt({ userId: data.userId, secret: data.secret }); } catch { return 'offline'; }
    return 'ok';
  }
  return reply.status === 409 && data?.error === 'invalid_transfer_code' ? 'used' : 'no';
}

export async function settle(store: PurchaseStore | null, api: SettleApi, options: SettleOptions = {}): Promise<SettleOutcome> {
  // App Store から取れなかったときは「購入なし」と区別する（B-15）
  const found = store ? await store.unfinished().catch(() => null) : { items: [], incomplete: false };
  // 引継ぎコードで復元するときは、App Store が読めなくても進める（コードだけで戻せる）
  if (found === null && !(options.recover && options.transferCode?.trim())) return { kind: 'store_error' };
  const items = found?.items ?? [];
  let credited = 0;
  let otherAccount = 0;
  let failedCount = 0;
  let recovered = false;
  let proofUsed = false;
  let hasAccount = !!(await api.existing());
  // ユーザーが「購入を復元」を押し、引継ぎコードを入れたときだけ。この端末のアカウントが無いか、空のときに限る
  if (options.recover && options.transferCode?.trim() && (!hasAccount || (await isEmptyAccount(api)))) {
    const outcome = await recoverAccount(api, options.transferCode.trim());
    if (outcome === 'used') proofUsed = true;
    if (outcome === 'offline') return { kind: 'offline' };
    if (outcome === 'ok') {
      recovered = true;
      hasAccount = true;
    }
  }
  for (const item of items.filter((candidate) => isKnownSku(candidate.sku))) {
    const verifyOnce = (): Promise<Reply> => api.authedIfAny('/purchases/verify', { body: { signedTransactionInfo: item.jws } });
    let reply: Reply = hasAccount ? await verifyOnce() : null;
    if (reply === null) {
      if (!hasAccount) { otherAccount += 1; continue; } // この端末にはアカウントが無く、引き継げる購入でもない
      return { kind: 'offline' };
    }
    if (ok(reply)) { credited += 1; await item.finish().catch(() => undefined); }
    else if (reply.status === 403 && reply.data?.error === 'app_account_token_mismatch') otherAccount += 1;
    else failedCount += 1;
  }
  return { kind: 'done', credited, otherAccount, failed: failedCount, recovered, incomplete: found?.incomplete ?? false, proofUsed };
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

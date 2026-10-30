import { Platform } from 'react-native';
import { ALL_SKUS, PRODUCTS, isKnownSku, type Product } from './products';

// App Store（StoreKit 2）を expo-iap 経由で使う。Web や、ネイティブ部分が入っていない開発ビルドでは null（買えない）。
export type PurchasedItem = { sku: string; jws: string; finish: () => Promise<void> };
export interface PurchaseStore {
  /** 購入シートを出し、支払いが終わったら取引を返す。取り消しは 'cancelled'。 */
  purchase(product: Product, accountToken: string): Promise<PurchasedItem | 'cancelled'>;
  /** 支払い済みで、まだ終えていない取引と、いま有効なサブスク（アプリが落ちたあと、購入の復元に使う）。 */
  unfinished(): Promise<{ items: PurchasedItem[]; incomplete: boolean }>;
  /** App Store が表示する価格（例「¥200」）。読めなければ空。 */
  prices(): Promise<Record<string, string>>;
}

function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${what} did not answer in ${ms / 1000}s`)), ms);
    work.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function createAppStore(): PurchaseStore | null {
  if (Platform.OS !== 'ios') return null;
  let iap: typeof import('expo-iap');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ネイティブ部分が無い環境では読み込まない
    iap = require('expo-iap');
  } catch {
    return null;
  }
  let connected: Promise<unknown> | null = null;
  const connect = () => (connected ??= withTimeout(iap.initConnection(), 15000, 'initConnection').catch((error) => { connected = null; throw error; }));
  const item = (purchase: import('expo-iap').Purchase): PurchasedItem => ({
    sku: purchase.productId,
    jws: purchase.purchaseToken ?? '',
    finish: async () => {
      await iap.finishTransaction({ purchase, isConsumable: PRODUCTS.pass.sku !== purchase.productId });
    },
  });

  return {
    async purchase(product, accountToken) {
      await connect();
      const found = await withTimeout(iap.fetchProducts({ skus: [product.sku], type: product.kind }), 15000, 'fetchProducts');
      if (!found || found.length === 0) throw new Error(`product_not_found: ${product.sku}`);
      // 前に終えそびれた取引は、起動時に片づける。いまの購入と取り違えない
      const leftOver = new Set(
        (await withTimeout(iap.getAvailablePurchases(), 5000, 'getAvailablePurchases').catch(() => [] as import('expo-iap').Purchase[]))
          .filter((purchase) => purchase.productId === product.sku)
          .map((purchase) => purchase.id),
      );
      // 加入中のパスは買い直せない。Apple の画面を出しても、同じ取引が返るだけ
      if (product.kind === 'subs' && leftOver.size > 0) throw new Error('already_subscribed');
      return new Promise<PurchasedItem | 'cancelled'>((resolve, reject) => {
        const startedAt = Date.now();
        // 支払いの途中でパスワードを入れていることもあるが、2分間なにも返ってこなければ止まっている
        const giveUp = setTimeout(() => { done(); reject(new Error('no_answer')); }, 120000);
        const done = () => { clearTimeout(giveUp); updated.remove(); failed.remove(); };
        const updated = iap.purchaseUpdatedListener((purchase) => {
          if (purchase.productId !== product.sku || !purchase.purchaseToken || leftOver.has(purchase.id)) return;
          done();
          resolve(item(purchase));
        });
        const failed = iap.purchaseErrorListener((error) => {
          done();
          if (error.code === iap.ErrorCode.UserCancelled || /cancel/i.test(`${error.code} ${error.message}`)) {
            // 人が取り消すには少し時間がかかる。すぐ返ってくる「取り消し」は、シートが開かなかったということ
            if (Date.now() - startedAt < 2500) reject(new Error('cancelled_at_once')); else resolve('cancelled');
          } else reject(new Error(error.message));
        });
        iap.requestPurchase({ type: product.kind, request: { apple: { sku: product.sku, appAccountToken: accountToken } } }).catch((error) => { done(); reject(error); });
      });
    },
    async unfinished() {
      await connect();
      // 支払い済みで、まだ終えていない取引（お迎え券・またたびの消耗型を含む）は getPendingTransactionsIOS でしか取れない。
      // いま有効なサブスクは getAvailablePurchases から取る。同じ取引が両方に出たときは1つにまとめる
      let pendingFailed = false;
      const [pending, available] = await Promise.all([
        withTimeout(iap.getPendingTransactionsIOS(), 10000, 'getPendingTransactionsIOS').catch(() => {
          pendingFailed = true;
          return [] as import('expo-iap').Purchase[];
        }),
        withTimeout(iap.getAvailablePurchases(), 10000, 'getAvailablePurchases'),
      ]);
      // 未完了の取引を読めなかったのに、ほかも空のときは、「購入なし」ではなく、取得の失敗として伝える（B-04）
      if (pendingFailed && available.length === 0) throw new Error('getPendingTransactionsIOS failed');
      const seen = new Set<string>();
      // 片方だけ読めなかったときは、読めた分を返しつつ、不完全だと伝える（読めなかった側の取引を、黙って見落とさないため）
      return {
        items: [...pending, ...available]
          .filter((purchase) => !!purchase.purchaseToken && isKnownSku(purchase.productId) && !seen.has(purchase.id) && !!seen.add(purchase.id))
          .map(item),
        incomplete: pendingFailed,
      };
    },
    async prices() {
      try {
        await connect();
        const result: Record<string, string> = {};
        for (const kind of ['in-app', 'subs'] as const) {
          const skus = ALL_SKUS.filter((sku) => Object.values(PRODUCTS).find((p) => p.sku === sku)?.kind === kind);
          const found = await withTimeout(iap.fetchProducts({ skus, type: kind }), 10000, `fetchProducts(${kind})`);
          for (const product of found ?? []) {
            const label = (product as { displayPrice?: string }).displayPrice;
            if (typeof label === 'string' && label) result[product.id] = label;
          }
        }
        return result;
      } catch {
        return {};
      }
    },
  };
}

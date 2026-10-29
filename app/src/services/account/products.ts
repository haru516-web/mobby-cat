// 売る商品。商品 ID は App Store Connect と server/wrangler.toml の PRODUCT_CATALOG_JSON と完全に同じにする。
// またたびは、5個セットだけを売る（単品は売らない）。
export type ProductKey = 'ticket1' | 'ticket6' | 'matatabi5' | 'pass';
export type Product = { key: ProductKey; sku: string; kind: 'in-app' | 'subs'; priceYen: number; tickets?: number; matatabi?: number };

export const PRODUCTS: Record<ProductKey, Product> = {
  ticket1: { key: 'ticket1', sku: 'com.mobbycat.app.ticket.1', kind: 'in-app', priceYen: 200, tickets: 1 },
  ticket6: { key: 'ticket6', sku: 'com.mobbycat.app.ticket.6', kind: 'in-app', priceYen: 1000, tickets: 6 },
  matatabi5: { key: 'matatabi5', sku: 'com.mobbycat.app.matatabi.5', kind: 'in-app', priceYen: 300, matatabi: 5 },
  pass: { key: 'pass', sku: 'com.mobbycat.app.matatabipass.monthly', kind: 'subs', priceYen: 1500 },
};
export const ALL_SKUS = Object.values(PRODUCTS).map((p) => p.sku);
export const isKnownSku = (sku: string) => ALL_SKUS.includes(sku);
export const PASS_PLAN = 'matatabi_pass';

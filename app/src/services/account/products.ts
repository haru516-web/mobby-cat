// 売る商品。商品 ID は App Store Connect と server/wrangler.toml の PRODUCT_CATALOG_JSON と完全に同じにする。
// いまは、お迎え券だけを売る。
export type ProductKey = 'ticket1' | 'ticket6';
export type Product = { key: ProductKey; sku: string; kind: 'in-app'; priceYen: number; tickets: number };

export const PRODUCTS: Record<ProductKey, Product> = {
  ticket1: { key: 'ticket1', sku: 'com.mobbycat.app.ticket.1', kind: 'in-app', priceYen: 200, tickets: 1 },
  ticket6: { key: 'ticket6', sku: 'com.mobbycat.app.ticket.6', kind: 'in-app', priceYen: 1000, tickets: 6 },
};
export const ALL_SKUS = Object.values(PRODUCTS).map((p) => p.sku);
export const isKnownSku = (sku: string) => ALL_SKUS.includes(sku);

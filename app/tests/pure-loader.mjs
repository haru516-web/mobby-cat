import { registerHooks } from 'node:module';

// Metroの拡張子省略だけを解決する。画像はNodeで読めないため、catalogの画像ハンドルのみ0にする。
// 猫ID・条件・保存処理は本番ソースをそのまま使う。React/Expoはロードしない。
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
      throw error;
    }
  },
  load(url, context, next) {
    const loaded = next(url, context);
    if (url.endsWith('/data/catalog.ts')) return { ...loaded, source: String(loaded.source).replace(/require\('[^']+\.webp'\)/g, '0') };
    return loaded;
  },
});

# SDK58 の依存監査

2026-10-30、指定worktreeで確認。依存の追加・更新・overrideは行っていません。

- `npm audit --omit=dev --json`：high 3、low 5。生データは `app-npm-audit-2026-10-30.json`。
- `npx expo install --check`：Dependencies are up to date。
- `npm outdated expo zod deepmerge --json`：Expo/CLIのSDK58範囲で更新候補なし。Zodは現在3.25.76、CLIが要求する範囲 `^3.25.76` でのwantedも3.25.76。最新4.6.7は範囲外です。強制的なメジャー更新やSDK51への後戻りは行いません。
- `npm explain zod deepmerge`：Zodは `expo@58.0.21 → @expo/cli@58.1.17 → zod@3.25.76`。開発用eslintにも同じコピーがあります。deepmergeは主に `@expo/config@58.0.9 → deepmerge@4.3.1` の設定処理です。正確な実版はlockfileとauditデータで確認できます。
- `app/src`（生成された通知JSONを除く）、`App.tsx`、`index.ts` にZod/deepmerge/CLI/configへの直接importはありません。`expo/src` と `expo/build` にもこれらへの参照を検索して見つけませんでした。CLIの入口はExpoの `bin/cli`、アプリの入口は `index.ts` です。

[Zodのadvisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) は大きな制約付きコレクションの検証によるメモリ消費、[deepmergeのadvisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) は戻り値のprototype poisoningです。前者はCLIのスキーマ検証、後者は設定のマージを使う経路にあります。今回調べた範囲で、アプリの購入API等からこれらを直接呼ぶ経路はありません。

**残件**：ビルドは禁止されているため、最終配布物から除外されることは実証していません。ネイティブ側・Metroの条件付き解決を含む最終バンドル確認と、上流のSDK58対応修正版の追跡が必要です。「highが消えた」「アプリへの影響がないことを証明した」とは扱いません。

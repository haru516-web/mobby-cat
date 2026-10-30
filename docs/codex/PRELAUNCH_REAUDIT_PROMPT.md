# Codex 依頼プロンプト（公開前の再監査：修正の確認と、新しく入れたコードの監査）

前回の監査（`docs/audit/codex-prelaunch-2026-10-30.md`、bc8d040）の指摘に対して、Claude が修正を入れた。**修正が本当に直っているか**と、**修正で新しく入れたコードに、新しい不具合・抜け・退行がないか**を、もう一度、徹底的に監査する。**監査だけ**を行い、コードや画像は直さない。

ブランチ `codex/prelaunch-reaudit`（`feature/account-server` の先頭 `28ad622` 以降から分岐。作成済み）。**worktree はあなた（Codex）が作る**。作業フォルダは **`D:\mobby-cat\.worktrees\prelaunch-reaudit`**。

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/prelaunch-reaudit codex/prelaunch-reaudit
```

そのフォルダの中だけで作業し、`D:\mobby-cat` 本体や他のブランチ・worktree は触らず、ブランチも切り替えない。**ビルド（`eas build`、`expo run:*`、Xcode）、デプロイ（`wrangler deploy`）、本番 DB の操作、実購入・通知・外部サービスへの実リクエストは行わない。**

**前回は、このフォルダに `node_modules` が無く、型チェック・lint・Web 操作を実行できなかった。今回は、検証のために、worktree の中で `npm ci`（`app/` と `server/`）を実行してよい**（`package.json` と `package-lock.json` は変えない。`node_modules` は Git に入れない）。入れられない場合は、その理由を報告書に書き、できなかった検証を「異常なし」に含めない。

**変更してよいのは、報告書 `docs/audit/codex-reaudit-2026-10-30.md` だけ。** 他のファイルは変えない。

## 前提（読むもの）

- 前回の監査報告: `docs/audit/codex-prelaunch-2026-10-30.md`。Claude の監査と、対応状況の表: `docs/audit/claude-prelaunch-2026-10-30.md`（末尾の「対応状況」）、`docs/audit/claude-2026-10-29.md`。
- 前回からの変更: `git diff bc8d040..HEAD`（コミット `81b440c`、`bfe2885`、`23ecebf`、`28ad622`）。**この差分のコードを、1行ずつ読む。**

## 1. 前回の指摘の再確認（直っているか）

次の項目が、報告書の「直し方」を満たすかを、コードで確認する（言い張りを信じない）。直っていなければ、何が足りないかを書く。

- A-01（匿名で買ったパスの復元）: `server/src/worker.ts` の `/auth/recover-purchase`、`server/src/store.ts` の `userOfPurchase`、`app/src/services/account/purchase.ts` の `settle`・`recoverAccount`・`isEmptyAccount`、`ShopScreen.tsx` の復元の文言、`server/tests/server.test.mjs` の新しいテスト。
- 前回A-02の残り（クラウドへ出る派生データ）: `app/src/services/account/cloudSave.ts` の `toRecord`。
- 前回A-04の残り（消費後に落ちたときの復旧）: `app/src/core/game.tsx` の `spendCurrency`・`pickExtra`・`useMatatabi`・`applyExtra`・`applyMatatabi`・復旧の `useEffect`、`core/saveShape.ts` の `pendingSpend`、`core/account.tsx` の spender。
- 新規A-02（確率の開示）: `ShopScreen.tsx` の説明文、`docs/app-store-listing.md`、`docs/app-store-privacy.md`、`docs/release-checklist.md`。**説明文が、`app/src/core/encounter.ts` の実際の動作（`buildDay` の抽選・並び）と一致しているか**を、コードで確かめる。
- B-01（パスが切れた日の枠）、B-02（視差効果を減らす: `RevealOverlay.tsx`、`WelcomeFx.tsx`）、B-03（`ui/ConfirmPopup.tsx`）、B-04（`services/account/appStore.ts`）、B-07（`server/src/privacyPolicy.ts`）。

## 2. 新しく入れたコードの監査（重点）

- **最初の出会いを、入れた日の20時まで作らない変更**（`app/src/core/game.tsx` の `firstLocked`・`availableDays`、`features/deai/DeaiScreen.tsx` の待ち画面）。
  - 次の場合を、一つずつ追う: 20時前に入れる／20時以降に入れる／機種変更でクラウドから戻す／日付が変わる瞬間／端末の時計を変える／開発用の日付送り／「きのう」タブ／通知の文面（毎日20時）／チュートリアルの説明との食い違い。`state.loginDays[0]` を「入れた時刻」の代わりに使っている点の穴（`loginDays` の上限400件、クラウドから戻したとき、`installDay` との食い違い）。
  - 待たされる間に、画面が「準備しています…」のまま止まらないか。通知が届く20時に、候補が作られて画面が切り替わるか。
- **`pendingSpend`（買った分を引く前に端末へ書く）**
  - 競合: 同時に2つの操作、画面を閉じる・アプリを背面に回す、2回目の起動での復旧と、ユーザーの再操作の衝突（`spending` の ref）。`short` と `offline` の扱いで、**二重に消費・二重に付与・付与されない**ことが起きないか。`fromFree`／`fromPaid` を記録したあとで、無料分が変わっていた場合。
  - 保存: `AsyncStorage.setItem` を待ってから引く順番が守られているか。保存に失敗したとき。クラウドに `pendingSpend` が出ていないか（`toRecord` の除外）、クラウドから戻したときに端末の `pendingSpend` が消えないか（`replaceState`）。
- **`/auth/recover-purchase`**
  - 認可: 他人のアカウントを、署名つきの取引で奪える経路がないか（`appAccountToken`、`userOfPurchase` の `OR` 条件、`original_transaction_id` の再利用、Sandbox と本番の混在、期限切れ・返金済み・別のアプリの取引、家族共有）。レート制限は十分か。鍵を回したとき、元の端末が突然使えなくなる副作用の説明が、アプリ内にあるか。アカウント削除・Apple 連携との整合。
  - アプリ側: `isEmptyAccount` の判定が甘く、中身のあるアカウントを、よそのアカウントで置き換えて見失わないか。`adopt` の後に、`spendSalt`・クラウド記録・ローカルの記録が、新しいアカウントと食い違わないか。
- **クラウドへ預ける記録の変更**（`toRecord`）: 戻したとき（`fromRecord`・`checkSaved`）に、理由が空の記録で、画面（図鑑・発見カード・出会いの履歴）が壊れないか。誕生日の猫の判定（`firstReason === '誕生日'`）の取りこぼし。
- **新しい演出**（`features/deai/RevealFx.tsx`、`WelcomeFx.tsx`、`RevealOverlay.tsx`）: 6匹まとめて開封（2段）、小さい画面（375×667）、文字拡大、「視差効果を減らす」オン、閉じたあとのタイマー・アニメの解除、お迎えの演出中に「画像を保存」「共有する」が正しく撮れるか（`DeaiScreen.tsx` の `card` ref と `WelcomeFx` の拡大の入れ子）、音・振動の二重再生。
- **`passBonus` の整理**（`game.tsx` の `passIdle` の `useEffect`）: 無限ループ・不要な再描画・クラウドから戻した記録・パス加入の直後に枠が消えないか。

## 3. 前回に実行できなかった検証

`npm ci` のあと、実際に実行する。結果は、コマンドと件数を、表にする。
- `npx tsc --noEmit`（app と server）、`npm --prefix server test`、`npx eslint .`（ルールごとの件数。前回 Claude の数: エラー132 = `react-hooks/refs` 116、`purity` 8、`set-state-in-effect` 7、`no-require-imports` 4、`immutability` 1。**`purity`・`set-state-in-effect`・`immutability` の16件は、1件ずつ読んで、バグか書き方の問題かを分ける**）、`npx expo-doctor`、`npm audit --omit=dev`。
- `npm audit` の high（`expo`・`@expo/cli`・`zod`）が、**配布するアプリのバンドルに入るか**を、`npm explain` と、依存の経路で確かめる（前回 B-05）。
- Web 表示（`npm --prefix app run web`、375×812 と 375×667）で、起動 → 相棒選び → ホーム → 出会い（設定の「開発用」→「今日の候補を試験用に作る（6匹）」）→ 3匹ひらく → 1匹迎える（お迎えの演出）→ ショップ（長い確認ポップ）を、一通り操作して確認する。画面は、DOM（`read_page`）と、スクリーンショットの両方で確認する（スクリーンショットが古い画面のまま更新されないことがある）。
- 前回 B-06（OSS ライセンス）: 実際の依存（`npm ls --omit=dev --all` と各 `LICENSE`）から、アプリに同梱が必要な通知（MIT 等の著作権表示、フォントの OFL）を洗い出し、現状の「クレジット」画面（`app/src/data/appInfo.ts`）で足りるかを書く。

## 4. 新しい観点（前回の範囲に入れ忘れたもの）

- App Store 申請の完全性: 掲載文（`docs/app-store-listing.md`）・審査メモ・スクリーンショットの計画・サポート URL・プライバシー URL・年齢区分の回答が、**いまのアプリの実際の動作と矛盾しないか**。リセット・アカウント削除・購入の復元・パスの解約案内が、審査員が見つけられる場所にあるか。
- 最初の起動から、最初の出会いまでの流れ（最初の起動日は、20時まで何もできない）が、審査員にとって「未完成」に見えないか。待ち画面の文言と、ホームで遊べるもの（猫をなでる・さつえい・図鑑）で、十分か。

## 報告書の形式

`docs/audit/codex-reaudit-2026-10-30.md`。日本語。重大度は **A＝ビルド・審査の前に直す／決める、B＝公開前に直したい、C＝公開後でよい**。各項目は **場所（`ファイル:行`）、何が起きるか（具体的な手順・入力・結果）、直し方、確かさ（コードで確認／実行して確認／推測）** を書く。根拠のない指摘は書かない。推測は推測と書く。前回と同じ問題は、新しく書かず、前回の番号で参照する。

冒頭に、要約（A/B/C の件数。**「公開可」か「公開不可」かの判定と、その理由**）。続けて「前回の指摘の再確認の表（項目、直っているか、足りない点）」、「新しいコードの指摘」、「実行したコマンドと結果の表」、「実機・TestFlight でないと確かめられないこと」、「公開までに残る作業」。

## 完了

報告書だけをコミットし（`git add docs/audit/codex-reaudit-2026-10-30.md`）、`git push origin codex/prelaunch-reaudit` まで行う。報告として、判定（公開可／不可）と、A の件数と、いちばん重大な3件を書く。

# 次のチャットへの引き継ぎ（2026-10-25）

そのまま次のチャットの最初に貼る用のプロンプト。

---

ねこモビー（D:\mobby-cat）の続きの作業をお願いします。

## 作業場所
- ブランチ: feature/next、作業フォルダ: D:\mobby-cat\.worktrees\next（git worktree。ここだけで作業する）
- D:\mobby-cat 本体は main。本体では git switch しない
- 前回のコミット f8f626b の上に、**未コミットの変更が大量にある**。最初に `git status` で確認し、頼まれたらコミットする（push はこちらが頼んだときだけ）
- worktree には自前の `app/node_modules` がある（`expo-audio`・`expo-haptics` も入れ済み）
- Web 確認は D:\mobby-cat\.claude\launch.json を一時的に書き換えて起動する（--prefix を D:/mobby-cat/.worktrees/next/app、ポート 8093）。起動したら git checkout -- .claude/launch.json で戻す。launch.json はコミットしない
- 型チェック（app で npx tsc --noEmit）を通してから終える。ビルド（eas build など）は頼まれたときだけ

## 最初に読むもの
- docs/audit-2026-10-25.md（特に「5. 抜けている機能」と 5.5 の対応状況）
- app/src/README.md（コードの地図と守るルール。色・角丸・影はコードで描かない）
- docs/codex/AUDIO_PROMPT.md、docs/codex/UI_SETTINGS_PROMPT.md

## 前回までにやったこと（未コミット）
- 設定画面 `features/settings/SettingsScreen.tsx`（ヘッダー右上の「設定」から開く）。通知・誕生日・BGM／効果音の音量と ON/OFF・バイブ・使い方・お問い合わせ・プライバシー／規約／クレジット・記録の消去・開発用。ショップは購入だけにした
- セーブデータ保護（`core/game.tsx`）。読み込めない記録は退避し、上書きしない。設定から書き出し・削除できる
- 音と触覚。`services/audio.ts`・`services/haptics.ts`。音源は `tools/make-audio.cjs` で合成した 15 個（BGM 3・効果音 12。操作音は sfx_tap の1つに統合）を `app/assets/audio` に置き、`data/audioAssets.ts` に登録済み。Web でファイルの読み込みと再生の呼び出しは確認したが、**耳での確認と実機は未**
- 文面とクレジット `data/appInfo.ts`
- codex/ui-fixes（4ce3dca）をマージ済み（14a9568）。絵のタッチの背景・下が開いたナビバー・空状態の絵2枚（お知らせ画面の各タブで使用）・図鑑の詳細シート `panel/sheet-detail`。`uiAssets.ts` も再生成済み（このコード変更は未コミット）

## やること（優先順）
1. 音を聞いて調整する（こちらが感想を伝える）。`tools/make-audio.cjs` の曲・音色・音量を直し、`node tools/make-audio.cjs` で作り直す。ループの継ぎ目、効果音が重なっても濁らないか、BGM の大きさ
2. 歯車の画像 `button/settings-round`（docs/codex/UI_SETTINGS_PROMPT.md）が Codex から届いたら取り込む（`tools/build-ui-registry.ps1`）。届くまでは文字の「設定」ボタンで代用中。Codex に頼むときは、ブランチと D:\mobby-cat\.worktrees\<名前> の worktree を別に作る（codex/ui-fixes と codex/new-mobbies-2 は別の端末で作業中なので触れない）
3. 連絡先・URL の確定。`data/appInfo.ts` の `SUPPORT_EMAIL`・`PRIVACY_URL`・`TERMS_URL` は空（空のあいだは「準備中」と案内する）。規約とポリシーの文面は下書きなので、公開前に見直す
4. 監査 5. の残り（優先 A）：本物の課金（購入ボタンが無料付与のまま）、`eas.json`、App Privacy の回答案、App Store の文面。Apple 連携とアカウント削除はサーバー方針が決まってから
5. 実機（Expo Go など）での確認：歩数・通知・カメラ・音・バイブ

## 守ること
- ビルドは頼まれたときだけ。コミットと push も頼まれたときだけ
- Codex のファイル（codex/ui-fixes、codex/new-mobbies-2）には触れない

# app/src の地図

「機能 → コードの場所」の早見表。迷ったらまずここ。

## 機能 → 場所

| 機能 | 画面（見た目） | ルール・データ |
|---|---|---|
| 初回の相棒選び | `features/onboarding/OnboardingScreen.tsx` | `core/game.tsx`（`STARTERS`、`chooseStarter`） |
| 初回のチュートリアル（相棒選びのあと。設定から見返せる） | `features/tutorial/TutorialTour.tsx` | 手順 `features/tutorial/steps.ts`、指す場所の目印 `ui/TourAnchor.tsx`、見終えたか `core/game.tsx`（`tutorialDone`） |
| ホーム（猫部屋・なでる） | `features/home/HomeScreen.tsx` | `core/game.tsx`（`pet`） |
| 毎日の出会い（候補・無料1匹・お迎え券・またたび） | `features/deai/DeaiScreen.tsx` | 抽選 `core/encounter.ts`、条件 `core/conditions.ts`、状態 `core/game.tsx` |
| 発見カード（共有・保存） | `features/deai/DiscoveryCard.tsx` | `services/share.ts` |
| 図鑑 | `features/zukan/ZukanScreen.tsx` | 猫の一覧 `data/catalog.ts`、ヒント `core/conditions.ts`（`HINTS`） |
| 世界・旅猫（今はサンプル表示） | `features/world/WorldScreen.tsx` | — （サーバー接続後に実装） |
| ショップ（購入だけ） | `features/shop/ShopScreen.tsx` | 出現確率 `core/encounter.ts`（`rarityOdds`） |
| 設定（通知・誕生日・音とバイブ・使い方・お問い合わせ・規約・クレジット・開発用）。ヘッダーの歯車から開く | `features/settings/SettingsScreen.tsx` | 文面と連絡先 `data/appInfo.ts`、通知 `services/notify.ts`、音と触覚の設定 `services/audio.ts` |
| 音（BGM・効果音）と触覚 | — （ボタン・タブ・スイッチは `ui/kit.tsx` で自動。場面ごとの音は各画面から `playSfx`、BGM は `App.tsx`） | `services/audio.ts`、`services/haptics.ts`、音源の一覧 `data/audioAssets.ts` |
| お知らせ・出会い履歴・これから会える猫 | `features/notice/NoticeScreen.tsx` | 予告の計算 `core/conditions.ts`（`upcoming`） |
| 起動時のタイトル（猫が降ってきて、タップで始まる） | `features/opening/OpeningScreen.tsx` | `App.tsx`（`opened`） |
| ログイン記録（月のカレンダー。ホーム右上のボタンから） | `features/login/LoginRecordScreen.tsx` | `core/game.tsx`（`loginDays`） |
| 撮影（カメラ合成） | `features/camera/CameraScreen.tsx` | `services/share.ts` |
| 電池・歩数の取得 | — | `services/signals.ts` |
| 毎日20時の通知 | — | `services/notify.ts` |

## フォルダの役割

```
src/
├─ features/   機能ごとの画面。1つの機能に必要なものはここにまとめる
├─ core/       ゲームのルールと状態（画面を持たない）
│  ├─ game.tsx         所持猫・券・お知らせなどの状態と、その操作。読み込めなかった記録は退避する（上書きしない）
│  ├─ encounter.ts     毎日の候補の抽選
│  ├─ conditions.ts    「いつ・どの猫が確定で出るか」の条件（暦・月・電池・歩数・コレクション）
│  └─ dates.ts         20時で日が切り替わる「出会いの日」の計算
├─ services/   端末の機能への橋渡し（電池・歩数・通知・共有と保存・音・触覚）
├─ ui/         共通の部品
│  ├─ base.tsx         文字・色・猫の画像・ふわふわ動く表示
│  ├─ kit.tsx          ボタン・ピル・バッジ・ゲージ・カード・ナビボタン（4つの独立ボタン）。ナビは画面の上に重なるので、各画面は `useTabPad()` の高さぶん下に余白を取る
│  ├─ Popup.tsx        画面中央のポップ（背景画像＋角丸）。設定・ショップ・通知・ログイン記録が使う。入れ子にできる
│  ├─ ConfirmPopup.tsx 取り消せない操作の最終確認。対象の猫を大きく見せて決める（`useConfirm`）。迎える・使う・加入する・消すはすべてこれ
│  ├─ TourAnchor.tsx   チュートリアルが指し示す場所の目印（`<TourAnchor id>` で包むだけ）
│  ├─ Slice.tsx        画像を伸縮させて描く仕組み（9スライス）、背景、画像表示
│  └─ uiAssets.ts      画像の一覧（自動生成）
├─ data/       catalog.ts … にゃこモビー270匹の一覧（自動生成）
└─ navigation.ts   画面どうしがやりとりする関数の型
```

## 守るルール

- 画面（`features/`）が使ってよいのは `core/` `services/` `ui/` `data/` だけ。**`features/` どうしは直接読み込まない**（共通にしたい部品は `ui/` へ移す）。
- `core/` は画面を持たない。端末の機能が必要なら `services/` を通す。
- **色・角丸・影をコードで描かない。**（例外：`ui/Popup.tsx` のポップの角だけは、背景画像を丸く切り抜くためコードで丸めている） 見た目は `app/assets/ui` の画像で作る（`ui/kit.tsx` の部品を使う）。足りない画像は Codex に依頼する。
- `data/catalog.ts` と `ui/uiAssets.ts` は自動生成。直接編集せず、`tools/` のスクリプトを実行し直す。
- **音は鳴らす場所から `playSfx(id)` を呼ぶだけ。** 音源が無い・`expo-audio` が無い環境でも落ちない。新しい音は `data/audioAssets.ts` の型に ID を足し、`docs/codex/AUDIO_PROMPT.md` にも書く。
- 猫を増やす・条件を足すときは、`core/conditions.ts` に条件を、`HINTS`（図鑑のヒント）を同時に足す。

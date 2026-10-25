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
| ショップ・設定 | `features/shop/ShopScreen.tsx` | 出現確率 `core/encounter.ts`（`rarityOdds`）、通知 `services/notify.ts` |
| お知らせ・出会い履歴・これから会える猫 | `features/notice/NoticeScreen.tsx` | 予告の計算 `core/conditions.ts`（`upcoming`） |
| 撮影（カメラ合成） | `features/camera/CameraScreen.tsx` | `services/share.ts` |
| 電池・歩数の取得 | — | `services/signals.ts` |
| 毎日20時の通知 | — | `services/notify.ts` |

## フォルダの役割

```
src/
├─ features/   機能ごとの画面。1つの機能に必要なものはここにまとめる
├─ core/       ゲームのルールと状態（画面を持たない）
│  ├─ game.tsx         所持猫・券・お知らせなどの状態と、その操作
│  ├─ encounter.ts     毎日の候補の抽選
│  ├─ conditions.ts    「いつ・どの猫が確定で出るか」の条件（暦・月・電池・歩数・コレクション）
│  └─ dates.ts         20時で日が切り替わる「出会いの日」の計算
├─ services/   端末の機能への橋渡し（電池・歩数・通知・共有と保存）
├─ ui/         共通の部品
│  ├─ base.tsx         文字・色・猫の画像・ふわふわ動く表示
│  ├─ kit.tsx          ボタン・ピル・バッジ・ゲージ・カード・タブバー。ナビバーは画面の上に重なるので、各画面は `useTabPad()` の高さぶん下に余白を取る
│  ├─ TourAnchor.tsx   チュートリアルが指し示す場所の目印（`<TourAnchor id>` で包むだけ）
│  ├─ Slice.tsx        画像を伸縮させて描く仕組み（9スライス）、背景、画像表示
│  └─ uiAssets.ts      画像の一覧（自動生成）
├─ data/       catalog.ts … 猫モビー136匹の一覧（自動生成）
└─ navigation.ts   画面どうしがやりとりする関数の型
```

## 守るルール

- 画面（`features/`）が使ってよいのは `core/` `services/` `ui/` `data/` だけ。**`features/` どうしは直接読み込まない**（共通にしたい部品は `ui/` へ移す）。
- `core/` は画面を持たない。端末の機能が必要なら `services/` を通す。
- **色・角丸・影をコードで描かない。** 見た目は `app/assets/ui` の画像で作る（`ui/kit.tsx` の部品を使う）。足りない画像は Codex に依頼する。
- `data/catalog.ts` と `ui/uiAssets.ts` は自動生成。直接編集せず、`tools/` のスクリプトを実行し直す。
- 猫を増やす・条件を足すときは、`core/conditions.ts` に条件を、`HINTS`（図鑑のヒント）を同時に足す。

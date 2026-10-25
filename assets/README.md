# 画像の地図

画像は **「アプリに入るもの」と「入らないもの」** に分けてある。

| 場所 | 中身 | アプリに入る？ | 編集してよい？ |
|---|---|---|---|
| `app/assets/ui/` | UI画像163枚（ボタン・カード・背景・アイコンなど）と `manifest.json` | 入る | Codex の納品物。差し替えは Codex に依頼 |
| `app/assets/cats/` | 猫モビー136匹（512px WebP） | 入る | 自動生成。**手で編集しない** |
| `app/assets/system/` | Android のアイコン | 入る | — |
| `assets/cat-mobbies/` | 猫モビーの元画像（1254px の透過PNG）。`characters/` は猫種36体、`new/` は新規100匹 | 入らない | 元画像。変換のもと |
| `assets/ui-records/` | UI画像の確認用プレビューと生成記録（Codex の納品報告 `README.md` を含む） | 入らない | 記録。読むだけ |

## UI画像（`app/assets/ui/`）

カテゴリごとのフォルダに分けてある。

| フォルダ | 何の画像か | 使っている場所 |
|---|---|---|
| `brand/` | ロゴ・見出し・アプリアイコン・起動画面（文字入りはここだけ） | 各画面のヘッダー、`app.json` |
| `bg/` | 全面の背景、部屋、切手風の写真、ニュースの絵 | 各画面の背景 |
| `panel/` | カード、ピル、ポラロイド、吹き出し、区切り線（伸縮する） | `ui/kit.tsx` の `Card` など |
| `button/` | ボタン、タブ、検索バー、スイッチ、丸ボタン | `ui/kit.tsx` の `ImgButton` など |
| `badge/` | レア度バッジ、旅猫バッジ、お迎え済みスタンプ | `RarityBadge`、出会い画面 |
| `gauge/` | 進捗バー、候補数のドット | 図鑑、出会い画面 |
| `tabbar/` | 下のナビバー（土台・アイコン・光・下線） | `ui/kit.tsx` の `TabBar` |
| `icon/` | 小さなアイコン | 各画面 |
| `illust/` | 国旗、世界地図、消印、点線の旅程 | 世界画面 |
| `cat/` | 猫の下に敷く光輪・影・未所持シルエット | 出会い画面、図鑑 |
| `camera/` | 撮影画面のボタン・グラデーション・トレイ・影 | 撮影画面 |
| `share/` | SNS共有カードの枠・写真フレーム | 発見カード（`share/discovery-card`）ほか |

`manifest.json` には、各画像のサイズ・伸縮の位置（`slice`）・共有カードの差し込み位置（`regions`）が入っている。

### まだ使っていない画像（次の機能のために用意済み）

共有カードのうち `discovery-card-story` / `travel-card` / `travel-card-story` / `photo-frame-*` / `video-intro` / `video-outro`、
`camera/ar-reticle` / `btn-cat-picker` / `handle-transform` / `flash-white`、
`illust/paw-trail` / `postmark-lines` / `sparkle` / `ticket-stack`、
`icon/coin-paw` / `gem` / `flag` / `globe` / `heart-off` / `paw-small` / `plane` / `question` / `search`、
`panel/divider-v` / `frame-cat-photo` / `sheet-bottom`、`cat/shadow-oval`、`brand/app-icon`（`app.json` から使用）。

## 画像を足す・直す流れ

1. **UI画像**：`docs/codex/` に依頼書を書き、Codex に専用のブランチ・worktree で作らせる → 納品後に `app/assets/ui/` へ取り込む → `tools/build-ui-registry.ps1` を実行して一覧を更新。
2. **猫モビー**：元画像を `assets/cat-mobbies/` に置き、`manifest.json` に追記 → `tools/build-app-assets.ps1` を実行して、アプリ用の WebP と `data/catalog.ts` を作り直す。
3. 新しい猫に出現条件があるなら、`app/src/core/conditions.ts` に条件とヒントも足す。

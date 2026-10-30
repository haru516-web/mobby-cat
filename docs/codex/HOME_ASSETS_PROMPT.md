# Codex 依頼プロンプト（ホーム画面の画像アセットを、デザインをそろえて作り直す）

ホーム画面に出る画像アセットを、**ひとつの絵柄にそろえて作り直す**。特に、画面の下にある **「会えるかもしれないにゃこモビー」の予告カード**（ヒントカード）は、周りの部品より平板で浮いて見えるので、最初に作り直す。

ブランチ `codex/home-assets`（`feature/account-server` から分岐。作成済み）。**worktree はあなた（Codex）が作る**。作業フォルダは **`D:\mobby-cat\.worktrees\home-assets`**。

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/home-assets codex/home-assets
```

そのフォルダの中だけで作業し、`D:\mobby-cat` 本体や他のブランチ・worktree は触らず、ブランチも切り替えない。

**コード（`app/src`, `App.tsx`, `app/app.json`）は変更しない。** 画像と `app/assets/ui/manifest.json`、`assets/ui-records/provenance/` の更新だけ。`app/src/ui/uiAssets.ts` は、追加・差し替えした項目の行だけ手で直す（`tools/build-ui-registry.ps1` で再生成すると、既存項目の並びが変わる差分が出るため）。ファイル名と画像の大きさは、**今の素材と同じに保つ**（コードが名前・寸法・`slice` で参照している）。9slice の `slice` を変えるときは、`manifest.json` と `uiAssets.ts` の両方に同じ値を入れる。

既存素材と同じ built-in image_gen、同じビジュアルルール（`docs/codex/CODEX_PROMPT.md` の「ビジュアルルール」）を守る。**文字は焼き込まない**（文言はアプリが描く）。

## 今の問題（実機の見た目）

- 予告カード（`home/upcoming-card`）は、クリーム一色に細い金縁だけで、**立体感・厚み・質感がない**。隣のカメラの丸ボタン（金の太い縁、ぷっくり）や、上の丸ボタンと比べて、ひとつだけ「ただの板」に見える。
- カードの中の猫の**シルエットが暗く濁った茶色**で、読みにくい。くぼみ（`home/upcoming-well`）の薄紫のにじみも、カード側と色がつながっていない。
- 部品ごとに、縁の太さ・金の色・影の向き・丸みがばらばら。

## 参照（必ず見る）

- ホームの実画面と世界観: `docs/ui-reference/` の4枚、`docs/codex/CODEX_PROMPT.md`。背景は `app/assets/ui/bg/room-home-full.png`（暖かい木の部屋）。
- 色: クリーム `#FFF8F0`、こげ茶 `#4A3B32`、オレンジ `#F08A5D`〜`#F28B20`、金 `#E5A23B`、薄紫（限定）`#E1D4FF`。
- 手本にする、**出来のよい部品**（これに合わせる）: `button/camera-round.png`、`button/bell-round.png`、`button/settings-round.png`、`panel/pill-currency.png`（ヘッダーの数のチップ）、`navbtn/*`。ぷっくりした厚み、光の当たり方（左上から）、金のふち、やわらかい落ち影。

## 作り直す対象

ホーム画面に出る次の部品。**予告カードの組（1〜3）を最優先**にし、4以降は、1〜3 と並べたときに浮く・ちぐはぐな点があれば合わせる。変えなくてよいものは変えない（変えない場合は、その理由を報告に書く）。

1. `home/upcoming-card.png`（720×200、9slice 70）… 予告カード本体。**厚みのある、ぷっくりした札**にする。クリームの面に、手本の丸ボタンと同じ太さ・色の金のふち、上辺にやわらかいハイライト、下辺に薄い影の厚み。「特別な予告」の気配として、角に小さなきらめき（`opening/sparkle.png` と同じ系統）を1〜2個。**中央は文字が読める無地**を保つ。
2. `home/upcoming-well.png`（192×192、9slice 56）… 猫を置くくぼみ。カードと同じ金のふちと質感のくぼみにし、**中は明るい淡い紫〜クリームの光**にする（暗い茶色の沈みにしない）。ここに載る猫のシルエットが、暗くても読めること。
3. `cat/silhouette-locked.png`（今の大きさのまま）… 「まだ見ぬ猫」のシルエット。**濁った茶色をやめ**、やわらかい濃い紫〜こげ茶の、輪郭がはっきりした影にする。耳としっぽの形が読めること。くぼみの光の上、猫ひろば（`DeaiScreen` の候補の布をかぶった猫）の上のどちらでも使うので、**どちらでも映える中間の濃さ**にする。
4. `home/upcoming-spark.png`（任意・64×64）… 「？」の意匠を一体で描いたきらめき。右上に添える。
5. 丸ボタン `button/home-cats-round.png`、`button/login-record-round.png`（168×168）… 手本の `camera-round` / `bell-round` と、縁の太さ・金の色・影が同じか確認し、ずれていれば直す。
6. ヘッダーのチップ `panel/pill-currency.png`、吹き出し `panel/speech-bubble.png` … 同じ金・同じ厚みに合わせる必要があるときだけ。
7. 旅カード（`brand/title-travel` を載せる `Card`）… 今は共通パネル。上の予告カードと**同じ系統の札**に見えるよう、必要なら別名で新規に1枚（`home/travel-card.png`、720×160、9slice 60）。使うかどうかはアプリ側で決めるので、作った場合は報告に書く。

## 絵柄の決まり（全部に共通）

- **光は左上**、影は下にやわらかく。縁の金は `#E5A23B` 系の1色で、太さは丸ボタンと同じ。金の面にハイライト（細い明るい線）を入れる。
- 角の丸みは大きめ（カードで高さの約 1/4）。紙・布・木の質感を出しすぎない。ぷっくりしたゲームUIの質感で、手本の `camera-round` と**同じ世界の部品**に見えること。
- 透過PNG。外側と落ち影の外だけ透過。9slice で伸ばす部品は、四辺の中央に伸ばしても破綻しない無地の帯を持たせる。

## 確認

- 実機の寸法で並べた確認画像を `assets/ui-records/previews/` に作る。1枚目: 画面下部（幅 375pt）… 背景 `room-home-full` の上に、新しい予告カード（幅 約 290pt、高さ 約 98pt）＋くぼみ（64pt角）＋ `silhouette-locked`（58pt）＋ダミー文字＋右にカメラの丸ボタン（84pt）。2枚目: 画面上部… ヘッダーのチップ・ベル・設定・右上の2つの丸ボタン。**部品の縁・金・影が、2枚の中で同じ絵柄に見えるか**を自分でも確かめる。
- カード上のダミー文字（こげ茶 `#4A3B32`、14pt 太字、2行）が読めること。

## 記録と完了

- `manifest.json` の該当項目に、`prompt`、`method`、`processing`、`slice`、`sha256`、`bytes` を記録する。`assets/ui-records/provenance/` に、理由（部品ごとの絵柄のばらつきをそろえる）と作り方を書く。
- 完了したら `git push origin codex/home-assets` まで行い、作り直したファイル名と各画像の `slice`、変えなかった部品（理由つき）、作らなかった任意の画像（理由つき）を報告する。

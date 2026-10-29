# Calendar and upcoming encounter assets

汎用の month-frame / card-cream / photo-well を専用画像で置き換えるための素材セット。画面への適用コードは今回の対象外。

## 制作

- 内蔵 image_gen で4点を個別生成。プロンプト全文は `calendar-card-prompts.json`。生成元ファイル名と SHA-256、最終画像のサイズ・ハッシュは `calendar-card-validation.json`。
- 生成り紙、上左のハイライト、控えめな下向き影で既存UIと統一。台紙は2個の丸い輪と空の見出し帯。カードは淡金の縁と対角の小さなきらめき。くぼみは淡紫と金のにじみ、明るい無地の中央。
- Pillowによる後処理のみ：alpha>8 の外接矩形で余白を整理し、生成された alpha を保持。台紙は見出し帯を190pxに収める上下別リサイズ、曜日帯とカードは端・角を保護したリサイズ、くぼみは4px余白を保つ縮小。詳細は各manifest項目の processing と `build-calendar-card.py`。
- 最終画像に年月・曜日・日付・文言は含めない。プレビューの文字と矢印は合成時だけに描画。

|画像|サイズ|slice 上/右/下/左|
|---|---|---|
|login/calendar-base.png|1000×960|190/90/90/90|
|login/calendar-weekbar.png|840×72|0/36/0/36|
|home/upcoming-card.png|720×200|70/70/70/70|
|home/upcoming-well.png|192×192|56/56/56/56|

`home/upcoming-spark.png` は未作成。カード本体の2個のきらめきで予告の気配を表し、小さなカードへの装飾の重複を避けた。

## 確認

- `previews/calendar-card-calendar.png`：既存の4種類のセルを7列×5行で配置。年月・曜日・日付は確認用。リングと見出しは非重複。
- `previews/calendar-card-home.png`：実際の room-home-full.png の上に、290×98ptのカード・64pt角のくぼみ・既存 abyssinian.webp・ダミー文字・矢印を3倍で合成。文字領域と猫の収まり、背景からの分離を目視確認。
- `previews/calendar-card-stretch.png`：台紙の7列×6行および各画像の9slice拡縮の補助確認。
- 4画像の寸法、RGBA、alpha最小0/最大255、slice境界、既存cell4枚のHEADとのバイト一致を自動検証。
- 実機やアプリ画面への適用確認は行っていない。画像とレジストリ追加のみ。
- このworktreeには依存パッケージがなく、package.jsonにlintスクリプトもないため、アプリのlint/typecheckは実行環境を満たせない。アプリ実装は変更しない。

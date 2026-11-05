# 出会い・コレクション UI 素材の生成記録（2026-11-04）

## 目的と作り方

参考画面 docs/codex/reference/deai-zukan-ui.webp と既存の和風・やわらかいゲーム素材を見本に、出会いと図鑑に必要な背景、板、カード、ボタン、アイコンを built-in image_gen で作成・再作成した。参考画像の切り抜きは使っていない。看板、リボン以外に文字を焼き込まず、画面内の文字や数字はアプリ側で描く。共通ヘッダー、ナビ、カード、ゲージの素材も同じ絵柄へ更新した。

すべて @3x PNG とし、透過部品は透明背景を保持した。横長素材は必要な固定飾りを slice に指定し、9スライスで伸縮する。看板は文字を重ねられる空白を残した。詳細シートは上部の持ち手と角を固定し、下辺の枠を外して画面下端に伸ばせる形にした。サイズ、完全な生成プロンプト、処理内容、スライス、SHA-256、バイト数は app/assets/ui/manifest.json に記録してある。

## 作成・再作成素材

| パス | PNG px | slice (px) | 作成方法 |
|---|---:|---|---|
| badge/complete-ribbon.png | 480×150 | なし | built-in image_gen |
| bg/room-deai-full.png | 1179×2556 | なし | built-in image_gen |
| bg/screen-zukan.png | 1179×2556 | なし | built-in image_gen |
| brand/title-collection.png | 1080×360 | なし | built-in image_gen |
| brand/title-deai.png | 1080×360 | なし | built-in image_gen |
| button/bell-round.png | 168×168 | なし | built-in image_gen |
| button/chip-on.png | 360×132 | top 0, right 60, bottom 0, left 60 | built-in image_gen |
| button/chip.png | 360×132 | top 0, right 60, bottom 0, left 60 | built-in image_gen |
| button/layout-toggle.png | 180×180 | なし | built-in image_gen |
| button/search-bar.png | 1100×150 | top 0, right 84, bottom 0, left 180 | built-in image_gen |
| button/settings-round.png | 168×168 | なし | built-in image_gen |
| button/sort-pill.png | 540×144 | top 0, right 150, bottom 0, left 60 | built-in image_gen |
| deai/counter-front.png | 1179×210 | なし | built-in image_gen |
| deai/fukuro-picked.png | 480×520 | なし | built-in image_gen |
| deai/fukuro.png | 480×520 | なし | built-in image_gen |
| gauge/fill-orange.png | 900×60 | top 0, right 40, bottom 0, left 40 | built-in image_gen |
| gauge/track.png | 900×60 | top 0, right 40, bottom 0, left 40 | built-in image_gen |
| icon/calendar-note.png | 120×120 | なし | built-in image_gen |
| icon/heart-off.png | 120×120 | なし | built-in image_gen |
| icon/heart-on.png | 120×120 | なし | built-in image_gen |
| icon/hourglass.png | 120×120 | なし | built-in image_gen |
| icon/laurel-left.png | 150×240 | なし | built-in image_gen |
| icon/laurel-right.png | 150×240 | なし | derived from built-in image_gen asset |
| icon/maple.png | 120×120 | なし | built-in image_gen |
| icon/nav-deai.png | 100×100 | なし | built-in image_gen |
| icon/nav-home.png | 100×100 | なし | built-in image_gen |
| icon/nav-world.png | 100×100 | なし | built-in image_gen |
| icon/nav-zukan.png | 100×100 | なし | built-in image_gen |
| icon/sparkle-rare.png | 120×120 | なし | built-in image_gen |
| icon/sparkles.png | 120×120 | なし | derived from built-in image_gen asset |
| icon/star-fav.png | 120×120 | なし | built-in image_gen |
| illust/maneki-neko.png | 420×540 | なし | built-in image_gen |
| navbtn/deai-off.png | 240×240 | なし | derived from built-in image_gen asset |
| navbtn/deai-on.png | 240×240 | なし | derived from built-in image_gen asset |
| navbtn/home-off.png | 240×240 | なし | built-in image_gen |
| navbtn/home-on.png | 240×240 | なし | built-in image_gen |
| navbtn/world-off.png | 240×240 | なし | derived from built-in image_gen asset |
| navbtn/world-on.png | 240×240 | なし | derived from built-in image_gen asset |
| navbtn/zukan-off.png | 240×240 | なし | derived from built-in image_gen asset |
| navbtn/zukan-on.png | 240×240 | なし | derived from built-in image_gen asset |
| panel/bar-wood.png | 1200×210 | top 0, right 100, bottom 0, left 100 | built-in image_gen |
| panel/board-hint.png | 1080×660 | top 115, right 64, bottom 64, left 64 | built-in image_gen |
| panel/card-cat-locked.png | 480×570 | top 54, right 60, bottom 70, left 60 | built-in image_gen |
| panel/card-cat-selected.png | 480×570 | top 54, right 60, bottom 70, left 60 | built-in image_gen |
| panel/card-cat.png | 480×570 | top 54, right 60, bottom 70, left 60 | built-in image_gen |
| panel/card-cream.png | 1080×780 | top 60, right 60, bottom 60, left 60 | derived from built-in image_gen asset |
| panel/card-parchment-selected.png | 1080×780 | top 60, right 60, bottom 60, left 60 | built-in image_gen |
| panel/card-parchment.png | 1080×780 | top 60, right 60, bottom 60, left 60 | built-in image_gen |
| panel/card-selected.png | 1080×780 | top 60, right 60, bottom 60, left 60 | derived from built-in image_gen asset |
| panel/card-white.png | 1080×780 | top 60, right 60, bottom 60, left 60 | derived from built-in image_gen asset |
| panel/divider-h.png | 600×12 | top 0, right 12, bottom 0, left 12 | derived from built-in image_gen asset |
| panel/info-table.png | 1080×780 | top 60, right 60, bottom 60, left 60 | derived from built-in image_gen asset |
| panel/pill-currency.png | 420×132 | top 0, right 78, bottom 0, left 78 | built-in image_gen |
| panel/sheet-detail.png | 1179×600 | top 120, right 90, bottom 0, left 90 | built-in image_gen |
| panel/sign-info.png | 1080×510 | top 150, right 72, bottom 48, left 72 | built-in image_gen |
| panel/speech-bubble-up.png | 900×420 | top 100, right 70, bottom 70, left 70 | built-in image_gen |

個別の完全なプロンプトと処理の記録は manifest の各項目を参照。新規素材は31点、既存素材の再作成は25点。生成された画像は作業用 worktree に配置し、素材 registry は tools/build-ui-registry.ps1 から再生成した。

## 出会いの記録の木製化

記録欄の板とアイコンを built-in image_gen で生成した木製素材に変更。木目を淡くして本文の読みやすさを確保し、行アイコンは濃い木でそろえた。参考画面の切り抜きは使用していない。

| パス | PNG px | slice (px) |
|---|---:|---|
| panel/board-hint.png | 1080×432 | 上右下左 48 |
| icon/record-wood-paw.png | 120×120 | なし |
| icon/record-wood-maple.png | 120×120 | なし |
| icon/record-wood-sparkles.png | 120×120 | なし |

生成プロンプト、処理手順、ハッシュは manifest.json の該当項目を参照。

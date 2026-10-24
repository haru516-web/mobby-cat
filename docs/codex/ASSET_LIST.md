# UI画像アセット一覧

出力先は `app/assets/ui/<カテゴリ>/<名前>.png`。**bg/ 以外はすべて透過PNG**（bg/ は不透明で、指定サイズの四角をすみずみまで埋める全面背景。切り抜きイラストにしない）、サイズは @3x 実寸（iPhone 論理幅 393pt ≒ 1179px 基準）。
「9slice」は角丸を保ったまま横/縦に引き伸ばせるよう、四辺中央に伸ばせる無地帯を持たせる（角の半径は書かれた値、伸縮帯は最低 24px）。
文字は **ロゴ・タイトル画像以外には焼き込まない**（ボタンや札のラベルはアプリ側でテキスト描画する）。

参照スクリーン: `docs/ui-reference/01-home.webp` `02-zukan.webp` `03-deai.webp` `04-world.webp`

## 1. brand（文字入り・固定）
| ファイル | サイズ | 内容 |
|---|---|---|
| brand/logo-nekomobby.png | 760×240 | 「ねこモビー」ロゴ（こげ茶＋オレンジ、肉球ワンポイント）。参照01の左上 |
| brand/title-deai.png | 560×240 | 「出会い」タイトル＋肉球。参照03 |
| brand/title-free-pick.png | 1000×330 | 「3匹の中から1匹を無料でお迎え」＋サブコピー無しの見出し飾り（もこもこ雲型の背景込み）。参照03 |
| brand/title-matatabi.png | 720×110 | 「またたびで もっと出会える！」見出し（葉アイコン付き）。参照03 |
| brand/title-travel.png | 900×240 | 「旅するモビー」見出し。参照04 |
| brand/title-world-mission.png | 640×110 | 「世界ミッション」見出し（地球アイコン付き） |
| brand/title-news.png | 640×110 | 「世界のニュース」見出し（メガホン付き） |
| brand/title-collection.png | 560×110 | 「コレクション」見出し（本アイコン付き） |

## 2. bg（背景。文字なし）
| ファイル | サイズ | 内容 |
|---|---|---|
| bg/app-cream.png | 1179×2556 | 全画面共通の生成り色＋ごく淡い肉球/ステッチ柄 |
| bg/room-home.png | 1179×1900 | 猫部屋（窓、観葉植物、キャットタワー、ソファ、ラグ、毛糸玉。猫は描かない）。参照01 |
| bg/room-deai.png | 1179×1400 | 出会い画面上部の暖かい部屋（ぼかし強め・上部は文字が読める明るさ）。参照03 |
| bg/world-hero.png | 1179×900 | 地中海風の街と海、道しるべ看板（JAPAN/FRANCE/KENYA/KOREA の英字は看板に描いてよい）。猫は描かない。参照04 |
| bg/photo-japan.png | 600×460 | 桜と五重塔の風景（ポラロイド内に使用、猫なし） |
| bg/stamp-photo-kenya.png / france / japan / korea | 各 360×280 | 国ごとの切手風写真（サバンナ / エッフェル塔 / 鳥居 / 韓国の古い街並み）。猫の小さなシルエットは可 |
| bg/news-thumb-1.png ～ 3.png | 各 330×330 | 世界ニュース用サムネ（韓国の街 / フランスの街 / ベレー帽） |

## 3. panel（9slice）
| ファイル | サイズ | 角半径 | 内容 |
|---|---|---|---|
| panel/card-cream.png | 192×192 | 48 | クリーム色の汎用カード（柔らかい影つき） |
| panel/card-white.png | 192×192 | 48 | 白カード（図鑑セル・ニュース） |
| panel/card-selected.png | 192×192 | 48 | オレンジ縁取りの選択中カード |
| panel/card-locked.png | 192×192 | 48 | 未所持用のくすんだカード |
| panel/pill-info.png | 300×132 | 66 | 上部の細長いピル（所持数・今日の出会い・お迎え券用） |
| panel/pill-currency.png | 420×132 | 66 | コイン/ジェム表示用のピル |
| panel/polaroid.png | 360×420 | — | ポラロイド写真フレーム（中央の写真領域を明記: 上下左右余白は 24/24/24/84px） |
| panel/sheet-bottom.png | 1179×300 | 上のみ72 | 画面下部に載る角丸シート（図鑑の詳細パネル）。9slice |
| panel/frame-cat-photo.png | 192×192 | 36 | 図鑑グリッドの猫写真用フレーム（写真にマスクして使う内側が抜けた形） |

## 4. button
| ファイル | サイズ | 角半径 | 内容 |
|---|---|---|---|
| button/primary-orange.png | 360×132 | 66 | オレンジのグラデ大ボタン（押下前） |
| button/primary-orange-pressed.png | 360×132 | 66 | 同・押下状態（少し暗く沈む） |
| button/primary-green.png | 360×132 | 66 | またたび用の緑ボタン |
| button/ghost-outline.png | 360×132 | 66 | クリーム地＋オレンジ縁のサブボタン |
| button/ghost-green.png | 360×132 | 66 | 同・緑縁 |
| button/disabled.png | 360×132 | 66 | 無効状態（灰みのベージュ） |
| button/tab-all-on.png | 270×120 | 60 | 「すべて」選択中（オレンジ） |
| button/tab-normal.png | 270×120 | 60 | 「ノーマル」ベージュ |
| button/tab-rare.png | 270×120 | 60 | 「レア」水色 |
| button/tab-limited.png | 270×120 | 60 | 「限定」薄紫 |
| button/camera-round.png | 330×330 | — | 「さつえい」丸ボタン（金縁・白地・カメラアイコンのみ。文字なし）。参照01 |
| button/bell-round.png | 168×168 | — | 通知ベル丸ボタン。ベルは含める |
| button/bell-badge.png | 54×54 | — | 赤い通知ドット |
| button/chip-detail.png | 300×108 | 54 | 「くわしく見る」用の小チップ（虫眼鏡アイコンのみ、文字なし） |
| button/chip-favorite.png | 330×132 | 66 | お気に入りボタン（ハートのみ）。on/off は `-on` `-off` の2枚 |
| button/search-bar.png | 1100×150 | 75 | 検索バー（虫眼鏡アイコン込み、文字なし）。参照02 |

## 5. tabbar
| ファイル | サイズ | 内容 |
|---|---|---|
| tabbar/bg.png | 1179×300 | 下部タブバーの角丸ベース（上のみ72角丸、影つき） |
| tabbar/active-glow.png | 300×300 | 選択タブの背後に置くオレンジのやわらかい光 |
| tabbar/underline.png | 210×30 | 選択タブ下のオレンジ下線 |
| tabbar/home-on.png / home-off.png | 各 150×150 | ホーム（家）。on=オレンジ、off=茶グレー |
| tabbar/deai-on.png / deai-off.png | 各 150×150 | 出会い（猫の顔シルエット） |
| tabbar/zukan-on.png / zukan-off.png | 各 150×150 | 図鑑（開いた本） |
| tabbar/world-on.png / world-off.png | 各 150×150 | 世界（地球） |

## 6. icon（150×150、スタイルは丸みのある太線 or ぷっくり立体のどちらかに統一）
paw, paw-small（60×60）, coin-paw（肉球コイン・金）, gem（青い宝石）, ticket-paw（お迎え券）, matatabi-leaf（緑の葉）, matatabi-bag（麻袋に肉球、360×360 のイラスト）, calendar-today, cat-head（所持数用）, book, search, heart-on, heart-off, chevron-right, flag, pin（現在地）, plane, globe, megaphone, camera, sun, box（所持数用の箱）, calendar-small, question（図鑑の「?」）, lock

## 7. badge
| ファイル | サイズ | 内容 |
|---|---|---|
| badge/rarity-normal.png | 300×108 | 灰ベージュの角丸バッジ（文字なし。ラベルはアプリ側） |
| badge/rarity-rare.png | 300×108 | 水色 |
| badge/rarity-limited.png | 300×108 | 赤〜コーラル |
| badge/rarity-legend.png | 300×108 | 金（きらめき入り） |
| badge/travel-cat.png | 360×108 | 青い「旅猫」用バッジ（地球アイコン入り、文字なし） |
| badge/new.png | 120×120 | NEWの星形（文字なし） |
| badge/owned-count.png | 150×66 | 「×N」を載せるための小ピル |

## 8. gauge
| ファイル | サイズ | 内容 |
|---|---|---|
| gauge/track.png | 900×60 | 進捗バーの溝（9slice 横方向） |
| gauge/fill-orange.png | 900×60 | 進捗バーの中身（オレンジ、9slice 横方向） |
| gauge/fill-yellow.png | 900×60 | 世界ミッション用の黄〜オレンジ |
| gauge/cat-dot-on.png | 120×120 | またたび候補数インジケータ（茶色の猫顔、点灯） |
| gauge/cat-dot-off.png | 120×120 | 同・消灯（薄いベージュ） |

## 9. illust（装飾イラスト。猫モビー本体は描かない、または既存素材を使う）
| ファイル | サイズ | 内容 |
|---|---|---|
| illust/world-map.png | 900×540 | パステルの世界地図＋小さな猫アイコン＋飛行機の航跡 |
| illust/stamp-japan.png | 360×360 | 「JAPAN」の消印（富士山、星、波線の消し印） |
| illust/postmark-lines.png | 300×120 | 郵便の波線消印 |
| illust/ticket-stack.png | 360×300 | お迎え券の束（猫＋ハートの写真つき小カード2枚の重なり） |
| illust/paw-trail.png | 480×240 | 薄い肉球スタンプの足跡列（背景装飾） |
| illust/sparkle.png | 120×120 | きらめき |
| illust/dotted-route.png | 900×120 | 国と国を結ぶ点線＋飛行機の矢印（横長・タイル可） |
| illust/flag-kenya.png / france / japan / korea | 各 120×90 | 小さな国旗（丸みのある切手風） |

## 10. cat（既存素材の加工）
`assets/cat-mobbies/characters/*.png`（34体・正面向き透過）は **そのまま使う。再生成しない。**
追加で必要なもの:
| ファイル | 内容 |
|---|---|
| cat/silhouette-locked.png（512×512） | 未所持用のシルエット＋「?」。参照02のNo.011 |
| cat/shadow-oval.png（400×120） | 猫の足元に敷く楕円の柔らかい影（透過） |
| cat/halo-select.png（600×600） | 選択中の猫の背後に敷く光輪 |

## 11. camera（撮影機能。設計書 8章）
カメラのライブ映像の上に重ねるUIなので、**半透明・影つきで、明るい映像でも暗い映像でも読める**こと。
| ファイル | サイズ | 内容 |
|---|---|---|
| camera/shutter.png | 270×270 | シャッターボタン（白い二重円、肉球ワンポイント） |
| camera/shutter-pressed.png | 270×270 | 同・押下状態 |
| camera/btn-close.png | 132×132 | 閉じる（×）丸ボタン、半透明の暗い地 |
| camera/btn-flip.png | 132×132 | イン/アウトカメラ切替 |
| camera/btn-flash-on.png / btn-flash-off.png | 各 132×132 | フラッシュ切替 |
| camera/btn-save.png | 132×132 | 端末に保存（下向き矢印） |
| camera/btn-share.png | 132×132 | 共有（上向き矢印） |
| camera/btn-retake.png | 132×132 | 撮り直し（回転矢印） |
| camera/btn-cat-picker.png | 132×132 | 写す猫を選ぶ（猫の顔＋小さな＋） |
| camera/topbar-scrim.png | 1179×300 | 上部の黒→透明グラデ（ボタンの視認性確保） |
| camera/bottombar-scrim.png | 1179×600 | 下部の透明→黒グラデ |
| camera/cat-tray.png | 1179×360 | 下部の猫選択トレイ（すりガラス風の角丸、9slice 横方向） |
| camera/cat-tray-slot.png / cat-tray-slot-on.png | 各 210×210 | トレイ内の猫サムネ枠（通常 / 選択中のオレンジ縁） |
| camera/gesture-hint.png | 600×300 | 「ドラッグで移動・ピンチで拡大・2本指で回転」の操作ガイド図（手のアイコンのみ、文字なし） |
| camera/handle-transform.png | 90×90 | 猫を選択中に四隅に出す拡縮ハンドル |
| camera/shadow-soft.png | 480×150 | 床置き用の簡易影（`cat/shadow-oval.png` より薄く広い） |
| camera/flash-white.png | 64×64 | 撮影時の白フラッシュ（全面に引き伸ばす単色。9slice 不要） |
| camera/ar-reticle.png | 480×480 | 将来のAR用の床置き照準リング（初期版では未使用、先行して用意） |

## 12. share（SNS向け出力カード。設計書 8.3。テキストと写真はアプリ側で合成）
写真・猫名・日付・国名などはすべてアプリ側で差し込む。**画像は枠と装飾だけ**にして、差し込み領域を `manifest.json` に矩形（x, y, w, h）で記録する。
| ファイル | サイズ | 内容 |
|---|---|---|
| share/discovery-card.png | 1080×1350 | 猫の発見カード（4:5）。猫画像領域、猫名、出会い日、出現条件のヒント、レア度バッジの各領域。肉球スタンプ・紙テープ装飾 |
| share/discovery-card-story.png | 1080×1920 | 同・9:16縦長版（ストーリーズ・縦動画の静止フレーム） |
| share/travel-card.png | 1080×1350 | 旅猫記念カード。パスポート/航空券風。「前にいた国 → 自分の国」の2枠と矢印、旅行日数・訪問国数・記念写真の領域 |
| share/travel-card-story.png | 1080×1920 | 同・9:16縦長版 |
| share/photo-frame-polaroid.png | 1080×1350 | 撮影写真に重ねるポラロイド風フレーム（下部に日付を入れる余白） |
| share/photo-frame-stamp.png | 1080×1350 | 切手風フレーム（ギザギザ縁＋消印） |
| share/photo-frame-travel.png | 1080×1350 | 旅猫と撮った写真用のフレーム（地図と飛行機の航跡、国旗を置く小枠） |
| share/watermark.png | 360×120 | 右下に入れる小さな「ねこモビー」ロゴ（文字入り可・半透明） |
| share/video-intro.png / video-outro.png | 各 1080×1920 | 9:16動画の冒頭・末尾フレーム（ロゴと肉球の装飾のみ） |

注意: 共有画像に **住所・GPS座標・位置メタデータを埋め込まない**（設計書 8.3）。生成時にEXIFを付けない。

## 受け入れ条件
- ファイル名・サイズは上表と一致。透過部分に白フチが残らないこと（ハロー除去）。
- `app/assets/ui/manifest.json` に 全ファイルの `path / width / height / slice(9slice の場合 top,right,bottom,left) / sha256 / prompt` を記録。
- プロンプトは `assets/cat-mobbies/provenance/` と同形式で `app/assets/ui/provenance/prompts-<カテゴリ>.md` に保存。

# ねこモビー UI画像アセット

- ブランチ: `codex/ui-assets`
- 作成: 163枚（12カテゴリ）。不足: 0枚。余分な納品画像: 0枚。
- 前回納品までの作り直し対象: 25枚。image_genでの再生成: 22回。暗幕2枚・撮影用の影1枚は既存の手続き生成修正を採用。
- `manifest.json`: 最終寸法、SHA-256、9slice余白、生成プロンプト、差し込み矩形。座標は@3x PNGの左上を原点とした実ピクセル。
- `provenance/prompts-<カテゴリ>.md`: 全12カテゴリのプロンプト・元画像・作り直し履歴。`provenance/validation.json`: 全ファイル検査。
- `previews/contact-sheet.png`: 全163枚の一覧。カテゴリ別と共有カードの領域ガイドも `previews/` に保存。

## 使用上の注意

- bg/は不透明（追加のfade-cream-bottomとoverlay-dimは明示された透過例外）。指定の5背景は新しく全面背景として再生成。他の切手・サムネイルも生成り地へ合成して不透明に保存。
- bg/以外はアルファ付き（追加のapp-iconとsplashは指定どおり不透明）。白フラッシュだけは用途上、均一な白の不透明64x64。
- 写真は枠画像の下、文字は上に合成する。`regions` は装飾を避けた安全な内側領域であり、窓全体の境界ではない。
- share/は写真・文字を含めない。ウォーターマーク・動画枠は最新の指示に従って文字なしの肉球・猫耳装飾。ロゴ文字は必要に応じbrand/素材をアプリ側で合成。
- 「?」は単体のicon/question.pngを使用し、未所持シルエットには文字を焼き込まない。消印・看板もbrand以外の文字なし指示を優先。
- 9sliceの値は角や装飾を避ける保守的なキャップ余白。横方向のみの部品はtop/bottom=0。
- UIの状態違いは参照画像を使って形を揃えて再生成。AI生成のため細部の質感差はある。
- 既存の猫34体およびapp/src・App.tsx・package.jsonは変更していない。アプリへの組み込み・実機表示確認はこのアセット作業に含めない。

## カテゴリ別枚数

- badge: 9枚
- bg: 17枚
- brand: 15枚
- button: 23枚
- camera: 20枚
- cat: 3枚
- gauge: 5枚
- icon: 25枚
- illust: 11枚
- panel: 14枚
- share: 10枚
- tabbar: 11枚

## 検証

寸法、ファイル名、PNG形式、bg不透明、その他の透過、EXIF不在、SHA-256、差し込み矩形の範囲と写真窓の透過を全件検査。カテゴリ一覧を目視確認。TypeScript `tsc --noEmit` は成功。lintはpackage.jsonにスクリプトがなく実行不可（Missing script: lint）。

未解消の検査エラー: 0件。

## 13. 追加分

追加25枚、不足0枚。AI生成21枚、指定値を守る技術用ラスタ4枚（グラデーション・単色暗幕・区切り線）。追加分はpreviews/additions-13.pngで確認できる。既存猫34体は参照のみ。

伸縮画像43枚すべてにsliceを設定。うち28枚（既存21枚・新規7枚）の余白を修正。visible alpha>8の境界から四辺の余白が8px以内であることを全件検査。source・修正前後の余白・ハッシュはprovenance/stretch-normalization.jsonに記録。

- speech-bubbleは幅300px固定の縦9slice。下中央のしっぽを横に引き伸ばさない。
- divider-hの中央は12px周期でタイルすると点線の間隔を保てる。sliceとcenterModeをmanifestに記録。
- overlay-dimはRGBA(74,59,50,115)。45%を8bitで丸めた値。fadeはRGB(255,248,240)を保って上alpha0から下alpha255へ変化。
- アプリアイコンは不透明1024角・角丸マスクなし、splashは不透明。見出し以外の追加部品に文字は焼き込んでいない。
- app/srcなどのコードは変更していない。

今回の追加分の再生成は0枚。伸縮43枚は2倍サイズで固定キャップの画素不変を検査し、すべて成功。比較画像はpreviews/stretch-check.png。

## 2026-10-25 UI fixes: room-home style checkpoint

Branch: codex/ui-fixes. Replaced bg/room-home.png only (1179x1900, opaque RGB PNG), built-in image_gen 1 generation. Style approval pending; other assets remain pending. Comparison: previews/regen-compare.png, reference / before / draft. No application code changed.

### room-home draft 02

User requested more detail. Added painted leaf, textile, basket, rug and wood details while preserving soft rounded illustration and empty central space. Replaced room-home only; 2 generations overall. Exact1179x1900 opaque RGB PNG validated. Style approval pending; no other assets or application code changed. Comparison: previews/room-home-detail-compare.png.

## UI fixes: priority 1 complete (2026-10-25)
Approved room-home draft02 retained. Redrawn room-deai (1179x1400) and world-hero (1179x900), one generation each, opaque RGB. Sign words JAPAN / FRANCE / KENYA / KOREA checked. Empty character/text overlay areas checked. Comparison: previews/regen-compare.png. No application code changes.

## UI fixes: priority 2 complete
Redrawn screen-zukan and screen-world, each1179x2556 opaque PNG, one generation each. Painted shelves and sky/map/airplane, pale central and lower overlay areas. Comparison: previews/regen-screens.png.

## UI fixes: generation limit checkpoint (2026-10-25)
Completed and pushed: 5 backgrounds including approved room-home. Generation counts: room-home2; room-deai1; world-hero1; screen-zukan1; screen-world1 (6 successful generations overall).
Pending: photo-japan; stamp-photo-kenya/france/japan/korea; news-thumb-1/2/3; tabbar/bg; illust/empty-notice; illust/empty-history; panel/sheet-detail (12 assets). Existing pending files unchanged. New pending files not created.
Built-in image_gen returned HTTP429 usage_limit_reached; generation stopped. Reset reported: 2026-10-25 21:30:37 JST. Resume ONLY pending assets after recovery; preserve approved style.
Validation: provenance/ui-fixes-validation.json. All5 completed files pass exact dimensions, PNG, opacity, SHA256, bytes and EXIF checks. Application code and cat character source assets unchanged. Images visually inspected; no app/device rendering verification.
Existing stamp/news files are RGB opaque with cream exterior; keep original cutout/scallop silhouettes when resuming. Empty-state illustrations are explicit cat exceptions to background no-cat rule.
Lint attempted: unavailable (no lint script). Typecheck attempted with npx --no-install tsc --noEmit; local dependencies absent, npm registry resolution failed (ENOTFOUND registry.npmjs.org); no pass claimed.

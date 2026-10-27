# breeds2 — 制作途中

実在猫種・毛色100種のうち **115匹生成・採用済み**（当初分85匹＋本依頼バッチj〜lの30匹）。当初リスト100種は完了。本依頼の残りは20匹。先行3匹は指示書指定の質感確認試作。

- 採用ID: abyssinian-blue, abyssinian-fawn, aegean, american-bobtail, american-shorthair-brown-tabby, american-shorthair-calico, american-wirehair, arabian-mau, australian-mist, bambino, bengal-marble, bengal-silver, bengal-snow-lynx, birman-blue-point, birman-chocolate-point, british-bicolor, british-black, british-golden-shaded, british-lilac, british-longhair, british-silver-tabby, burmilla, chartreux, chausie, colorpoint-shorthair, cymric, donskoy, dragon-li, egyptian-mau-bronze, european-burmese, european-shorthair, german-rex, highland-fold, highland-straight, himalayan, japanese-bobtail-longhair, javanese, karelian-bobtail, khao-manee, korat, kurilian-bobtail, laperm, lykoi, maine-coon-black, maine-coon-red-tabby, maine-coon-silver-tabby, mekong-bobtail, mike-neko, minskin, munchkin, napoleon, nebelung, neva-masquerade, norwegian-forest-black-white, norwegian-forest-silver-tabby, oriental-longhair, oriental-shorthair, persian-black-smoke, persian-blue-cream, persian-chinchilla-silver, persian-red-tabby, peterbald, pixie-bob, ragdoll-blue-colorpoint, ragdoll-lilac-bicolor, ragdoll-seal-mitted, savannah, scottish-fold-bicolor, scottish-fold-silver-tabby, scottish-fold-white, scottish-straight, selkirk-rex-longhair, serengeti, siamese-blue-point, siamese-chocolate-point, siamese-flame-point, siberian-blue, skookum, sokoke, sphynx, suphalak, thai, toybob, ukrainian-levkoy, ural-rex
- 形式: 1254×1254 RGBA透過PNG。ユーザー承認の等比縮小と透明中央配置を適用、四辺100px以上の透明余白。描画や配色は変更せず、元生成ファイルを保持。
- Bの再生成採用: 9匹（不採用理由はreview/rejected-breed-*.json）。
- manifest.jsonには実際に生成・検品できた画像のみ登録。
- previews/batch-*.pngは現在の採用分だけを合成した途中の一覧。
- プロンプト: ../provenance/prompts-breeds2-*.md
- 検品: レンズ以外の生体目1つ、十字キー1つ、無地丸ボタン2つ、小物なしを目視。寸法・アルファ・SHA256・bytesと固定ID/名前を機械検証。
- 全体の重複最終検査と100件完成検品は未完了。
- 画像生成の利用上限により停止中。解除予定: 2026-10-26T21:37:00+09:00。未生成15種と、全体比較で追加修正が必要なBの9種はresume-state.jsonを参照。

現在の詳細進捗は ../review/STATUS.md と ../review/progress.json を参照。

## 追加50種（codex/breeds-50）

- 一覧: docs/codex/BREEDS_50_LIST.md（50種、既存221 IDと重複なし）。
- 登録済み: 30匹（バッチj/k/l）。残り20匹（バッチm/n）。再生成: 2匹（russian-white / russian-black の瞳修正）。できなかったもの: なし。
- 各バッチ10匹を1254×1254 RGBA透過PNGとして登録し、目・レンズ・操作部品・毛色/柄を目視確認。SHA-256とbytesを照合。
- 一覧画像: previews/batch-j.png / batch-k.png / batch-l.png。プロンプト: ../provenance/prompts-breeds2-{j,k,l}.md。
- 近似猫比較画像と検品メモ: ../review/breeds50-after-*.png / breeds50-similarity.md。
- 次はバッチmのsomali-fawnから作成し、10匹ごとにcodex/breeds-50へpush。
- 詳細進捗: ../review/breeds50-status.json。

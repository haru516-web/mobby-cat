# breeds2 — 制作途中

実在猫種・毛色100種のうち **71匹生成・採用済み**、残り29匹。B本番はA完了後。先行3匹は指示書指定の質感確認試作。

- 採用ID: aegean, american-bobtail, american-shorthair-brown-tabby, american-shorthair-calico, american-wirehair, arabian-mau, australian-mist, bambino, british-bicolor, british-black, british-golden-shaded, british-lilac, british-longhair, british-silver-tabby, burmilla, chartreux, chausie, colorpoint-shorthair, cymric, donskoy, dragon-li, european-burmese, european-shorthair, german-rex, highland-fold, highland-straight, himalayan, japanese-bobtail-longhair, javanese, karelian-bobtail, khao-manee, korat, kurilian-bobtail, laperm, lykoi, mekong-bobtail, mike-neko, minskin, munchkin, napoleon, nebelung, neva-masquerade, oriental-longhair, oriental-shorthair, persian-black-smoke, persian-blue-cream, persian-chinchilla-silver, persian-red-tabby, peterbald, pixie-bob, ragdoll-blue-colorpoint, ragdoll-lilac-bicolor, ragdoll-seal-mitted, savannah, scottish-fold-bicolor, scottish-fold-silver-tabby, scottish-fold-white, scottish-straight, selkirk-rex-longhair, serengeti, siamese-blue-point, siamese-chocolate-point, siamese-flame-point, skookum, sokoke, sphynx, suphalak, thai, toybob, ukrainian-levkoy, ural-rex
- 形式: 1254×1254 RGBA透過PNG。生成アルファを加工せず保存（最大値254〜255）。
- Bの再生成採用: 7匹（不採用理由はreview/rejected-breed-*.json）。
- manifest.jsonには実際に生成・検品できた画像のみ登録。
- previews/batch-*.pngは現在の採用分だけを合成した途中の一覧。
- プロンプト: ../provenance/prompts-breeds2-*.md
- 検品: レンズ以外の生体目1つ、十字キー1つ、無地丸ボタン2つ、小物なしを目視。寸法・アルファ・SHA256・bytesと固定ID/名前を機械検証。
- 全体の重複最終検査と100件完成検品は未完了。

現在の詳細進捗は ../review/STATUS.md と ../review/progress.json を参照。

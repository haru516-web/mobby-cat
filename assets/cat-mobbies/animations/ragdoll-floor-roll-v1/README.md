# ラグドール：ゴロゴロ

通常枠のラグドール。採用されたスコティッシュフォールド版に合わせた8コマの横寝から仰向け、反対側へ寝返る透過スプライト。

- spritesheet-aligned.png：2048×1024、4列×2行、各512×512、RGBA透過。
- rolling-transparent.webm：アルファ透過、512×512、30fps、8.4秒。
- rolling.mp4：白背景の確認用、512×512、30fps、8.4秒。
- 1→8→7→…→2の14段階を100msずつ、6周。
- `frames/pose-1.png`〜`pose-8.png` は描き分けた元8姿勢。`frames/000.png`〜`013.png` は再生順。
- `generated-sheet.png` は余白を直した生成元。`extract.cjs` と親の `prepare-breed-roll.cjs` で切り出し、位置合わせ。

毛色：白とブルーグレーの長毛バイカラー、青い有機眼と黒いカメラ眼。十字キーと丸ボタンを保持。生成記録：内蔵image_gen。参照：`../../characters/ragdoll.png` と採用済みスコティッシュフォールドの寝返りシート。

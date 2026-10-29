# アプリアイコン候補（未採用）

既存アイコンやアプリ設定は変更せず、背景だけ違う4案を追加。

| 案 | 背景 | 縮小時の所見 |
|---|---|---|
| A | 上 #F6A03C → 下 #F08A5D の縦グラデーション | 穏やかで輪郭が読みやすい。60pxでは背景の差は控えめ |
| B | 明るい中央 → オレンジの四隅の放射状グラデーション | 顔を中心に見せやすい。60pxではAとの差が小さい |
| C | #F28B20 + 直径768px、#FFF8F0・約35%の円 | 縮小しても円が残る。白い毛と円の境界はやや近い明度 |
| D | #F28B20 + 低コントラストの同系色の肉球 | 大きい表示で遊びが出る。60pxでは肉球はほぼ目立たない |

## 作り方

参照画像: `assets/cat-mobbies/characters/ragamuffin.png`。
内蔵 image_gen で元画像を編集し、向かって左の手を軽く上げた共通の透過素材 `foreground.png` を作成。
顔・三毛柄・毛の質感・向かって左の通常眼／右のレンズ眼・胸の十字キーと丸ボタン2個を維持するよう指定した。
生成による局所的な毛並みの差はあるため、元画像とのピクセル同一性を保証する素材ではない。

使用プロンプト:

> Edit identity-preserve. This exact existing ragamuffin cat mascot is the edit target, not inspiration for a new cat. Preserve face, exact calico pattern, fluffy photoreal fur, body, feet, tail, viewer-left normal gold eye and viewer-right camera lens eye, chest black D-pad and exactly TWO round black buttons. Change ONLY viewer-left arm: raise that paw slightly in a natural small hello gesture, paw beside lower cheek, no human fingers. Other arm unchanged. Front facing whole body. Remove contaminated yellow/red edge speckles, clean natural antialiased fur edges with real alpha transparency. No outline, no glow, no backdrop, no text, no shadow. Square image with full subject entirely visible and generous 10% margin. This will be a single shared foreground used identically in four app icon background candidates.

`build.py` は Pillow / NumPy で透過縁の高彩度な赤・黄の残留を除き、共通素材を高さ778px（約76%）に配置する。四辺の余白は約12%。背景と弱い足元の影を合成し、不透明RGB PNGとして保存する。4案で前景・サイズ・座標・影は共通。

再作成: このフォルダで `python build.py`（Pillow、NumPyが必要）。
`audit.json` に前景配置・各候補の寸法・モード・SHA-256を記録。

`contact-sheet.png` は各案の1024 / 180 / 120 / 60pxと、180pxの角丸プレビューを実寸配置。閲覧アプリの全体表示では縮小されるため、100%表示でも確認する。角丸表示は比較用の近似マスクで、iOS実機表示の検証ではない。

縮小確認では全案で猫の耳・顔・左右で違う目が識別できる。60pxでは毛の細部、レンズ内の反射、十字キーの溝は読みにくくなり、手を上げる仕草も180pxより弱くなる。角丸プレビューでは耳・手・尾・足の欠けはない。

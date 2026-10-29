# アプリアイコン候補（未採用）

既存アイコンやアプリ設定は変更せず、背景だけ違う4案を追加。

| 案 | 背景 | 縮小時の所見 |
|---|---|---|
| A | 2色のオレンジの太い扇形14本と、クリームへ溶ける中心光 | 60pxでも放射の方向が残る。4案では最も動きが強い |
| B | 幅70%・高さ85%のアーチ窓、薄オレンジの細枠、淡黄からクリームの内側 | 明るい面で顔が読みやすい。60pxでは細い窓枠がほぼ消える |
| C | 薄桃からオレンジの夕焼け、下から40%の地平線、直径65%の沈む太陽 | 落ち着いた印象。太陽は猫の左後ろに一部が見え、60pxでは形が弱まる |
| D | オレンジの縦グラデーションとクリームの図鑑カード3枚、左右±12度、細いこげ茶枠 | 収集の意味が伝わる。60pxではカード同士の細い境界が読みにくい |

## 作り方

参照画像: `assets/cat-mobbies/characters/ragamuffin.png`。
内蔵 image_gen で元画像を編集し、向かって左の手を軽く上げた共通の透過素材 `foreground.png` を作成。
顔・三毛柄・毛の質感・向かって左の通常眼／右のレンズ眼・胸の十字キーと丸ボタン2個を維持するよう指定した。
生成による局所的な毛並みの差はあるため、元画像とのピクセル同一性を保証する素材ではない。

使用プロンプト:

> Edit identity-preserve. This exact existing ragamuffin cat mascot is the edit target, not inspiration for a new cat. Preserve face, exact calico pattern, fluffy photoreal fur, body, feet, tail, viewer-left normal gold eye and viewer-right camera lens eye, chest black D-pad and exactly TWO round black buttons. Change ONLY viewer-left arm: raise that paw slightly in a natural small hello gesture, paw beside lower cheek, no human fingers. Other arm unchanged. Front facing whole body. Remove contaminated yellow/red edge speckles, clean natural antialiased fur edges with real alpha transparency. No outline, no glow, no backdrop, no text, no shadow. Square image with full subject entirely visible and generous 10% margin. This will be a single shared foreground used identically in four app icon background candidates.

背景は `build.py` の単純な幾何形状とグラデーションで作成。Bは `app/assets/ui/opening/bg.png` を目視参照し、窓のアーチ形と柔らかい暖色光に寄せた。細かい風景や飾りは加えていない。Cの太陽はキャラクターに完全に隠れないよう中心を左へ112px寄せ、中心の高さは地平線上に置いた。

`build.py` は Pillow / NumPy で透過縁の高彩度な赤・黄の残留を除き、共通素材を高さ778px（約76%）に配置する。四辺の余白は約12%。背景と弱い足元の影を合成し、不透明RGB PNGとして保存する。4案で前景・サイズ・座標・影は共通。

再作成: このフォルダで `python build.py`（Pillow、NumPyが必要）。
`audit.json` に前景配置・各候補の寸法・モード・SHA-256を記録。

`contact-sheet.png` は各案の1024 / 180 / 120 / 60pxと、180pxの角丸プレビューを実寸配置。閲覧アプリの全体表示では縮小されるため、100%表示でも確認する。角丸表示は比較用の近似マスクで、iOS実機表示の検証ではない。

縮小確認では全案で猫の耳・顔・左右で違う目が識別できる。60pxでは毛の細部、レンズ内の反射、十字キーの溝は読みにくくなり、手を上げる仕草も180pxより弱くなる。角丸プレビューでは耳・手・尾・足の欠けはない。A〜Dは今回の背景案で上書き済みで、旧背景案の画像は作業フォルダに残していない。

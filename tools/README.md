# tools（PowerShell と Node のスクリプト）

リポジトリのルートで実行する。`powershell -NoProfile -ExecutionPolicy Bypass -File tools\<名前>.ps1`

| スクリプト | いつ使う | 入力 → 出力 |
|---|---|---|
| `build-app-assets.ps1` | 猫を追加・差し替えたあと | `assets/cat-mobbies/**/manifest.json` の元画像 → `app/assets/cats/*.webp`（512px）と `app/src/data/catalog.ts`。レア度と種別（猫種／条件猫／世界の猫／旅猫）もここで決まる。**ffmpeg が必要。数分かかる** |
| `build-ui-registry.ps1` | UI画像を追加・差し替えたあと | `app/assets/ui/**/*.png` と `manifest.json`（伸縮位置・差し込み位置）→ `app/src/ui/uiAssets.ts` |
| `make-procedural-ui.ps1` | 撮影画面のグラデーションと影を作り直すとき | → `app/assets/ui/camera/` の3枚（画像生成を使わず、計算で作る） |
| `make-audio.cjs`（Node。`node tools/make-audio.cjs`） | BGM・効果音を作り直す・調整するとき | 合成 → `app/assets/audio/bgm・sfx/*.m4a`（15個。外部素材なし。ffmpeg が必要。約15秒） |
| `import-cat-assets.ps1` | 最初の34体を旧プロジェクトから取り込んだ1回きりのもの（記録として残している） | 旧プロジェクト → `assets/cat-mobbies/` |

生成されるファイル（`catalog.ts`、`uiAssets.ts`、`app/assets/cats/`）は、手で編集しない。

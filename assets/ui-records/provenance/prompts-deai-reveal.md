# 出会い：レア度ラベルとひらく演出

作業ブランチ: `codex/deai-reveal`。作業場所: `.worktrees/deai-reveal`。
依頼書は本体の未コミット `docs/codex/DEAI_REVEAL_PROMPT.md` を読み取り、画像作成だけに適用。
生成方法は全8点とも **built-in image_gen**。外部API、手描き代替、既存画像の切り抜きは使用していない。
最終プロンプト全文と生成元パスは `deai-reveal-jobs.json` に保存。

## ビジュアル方針

`docs/codex/CODEX_PROMPT.md` のビジュアルルールに従い、生成り紙・丸い形・ぷっくりした質感・左上の細いハイライト・低コントラストの下向き影を基準にした。
既存 `badge/rarity-rare.png` と `bg/room-deai-full.png` を確認した。
依頼書の明示的な例外として、ラベル4点だけ日本語を画像生成時に焼き込んだ。文字の後付けはしていない。

| 最終ファイル | 寸法 | 目的 |
|---|---|---|
| badge/label-normal.png | 240×80 | クリーム、こげ茶「ノーマル」 |
| badge/label-rare.png | 240×80 | 青、白「レア」、きらめき1つ |
| badge/label-legend.png | 240×80 | 金、白「でんせつ」、きらめき2つ |
| badge/label-world.png | 240×80 | 薄紫、「世界」と小さな地球 |
| deai/mystery-cat.png | 512×512 | 布で顔・体・柄をすべて隠す共通候補 |
| deai/reveal-rays.png | 1024×1024 | 猫の後ろで回転する白〜金の光 |
| deai/reveal-burst.png | 768×768 | 正体が出る瞬間の光の輪 |
| deai/reveal-dim.png | 1179×2556 | 深いこげ茶〜紺の暗幕 |

## 後処理と再現

`build-deai-reveal.py` は Pillow でサイズ・透過を正規化し、manifest の追記、ハッシュ記録、既存素材を使った確認用合成を行う。
バッジは同じ外接寸法232×72・余白4pxに揃える。形は丸いカプセルで統一し、9sliceを付けない。
猫と光は生成されたアルファを維持して、縦横比を保ったまま指定キャンバスへ収める。
暗幕は生成した色を維持し、全面のアルファ値を179〜204（70.2〜80%）に正規化する。
最終実測は200〜203（78.4〜79.6%）。暗幕だけは画面全体への伸長用に四辺0pxのsliceとstretchAxes x/yを記録し、光と猫は縦横比を維持した拡大縮小を想定する。
生成元PNGは上書きしない。実行には `deai-reveal-jobs.json` のローカル生成元が必要。

`tools/build-ui-registry.ps1` で `app/src/ui/uiAssets.ts` を再生成する。既存8項目の並べ替えだけの差分が出たため、依頼書の許可に従い、既存行を元の順序に戻し、生成された新規8項目の行だけを末尾に追記する。アプリの動作コードは変更しない。
既存 `badge/rarity-*.png`、`badge/travel-cat.png`、`cat/silhouette-locked.png` は維持する。

## 確認画像

- `previews/deai-reveal-badges.png`: 既存白カード上に66×22pt相当の1xラベルと拡大表示。
- `previews/deai-reveal-candidates.png`: 既存出会い背景上に3列×2行、開封猫2点と共通候補4点。
- `previews/deai-reveal-sequence.png`: 暗幕と共通候補／光の輪と猫／光の筋と猫。

確認画像はレイアウト検討用の合成であり、実機画面のキャプチャやアニメーションの動作確認ではない。
寸法・RGBA・アルファ範囲・最終SHA256・bytes・生成元SHA256は `deai-reveal-validation.json` に記録する。

## 静的チェック

生成前のTypeScriptチェックはエラー出力なし。lintは既存のアプリコードで143件（136 errors、7 warnings）を検出した。
例: `account.tsx` の render 中の ref 更新、`game.tsx` の effect 内 setState、`base.tsx` の render 中の ref 参照。
依頼範囲外のため動作コードは修正しない。最終レジストリ再生成後のTypeScriptチェックとgit diff --checkは通過。
全8点の寸法・RGBA・透過・ハッシュを確認し、確認画像3点も目視した。生成のやり直しは0点、不足は0点。

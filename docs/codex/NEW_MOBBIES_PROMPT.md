# Codex 作業プロンプト（新規 猫モビーの生成）

作業ブランチ: `codex/new-mobbies`（`main` から分岐）。作業フォルダは **`D:\mobby-cat\.worktrees\new-mobbies`**（git worktree。UI素材用の `codex/ui-assets` とは別フォルダなので混ざらない）。
このブランチで **猫モビーの画像だけ** を追加する。コード（`app/`）、UI素材（`app/assets/ui/`）、既存の猫34体は変更しない。

---

あなたは iOS 向けコレクションゲーム「ねこモビー」の、新しい猫モビーのキャラクター画像を作る担当です。
既存の34体（猫種ベース）に加えて、日常・暦・天気・コレクション・世界イベントなどの出現条件に対応する **キャラクターもの** の猫モビーを生成します。

## 読むもの
1. `docs/appearance-catalog.md`（名前・出現条件・由来の企画台帳）
2. `docs/codex/NEW_MOBBIES_LIST.md`（今回作る猫の一覧。バッチ A〜I の100匹、各猫のID・名前・ビジュアル案。バッチ I の名前は仮）
3. `assets/cat-mobbies/README.md`、`assets/cat-mobbies/provenance/prompts-batch30.md`（既存34体の生成方法。**同じ built-in image_gen を使い、同じ共通プロンプトの考え方で作る**）
4. 参照画像: `assets/cat-mobbies/characters/bengal.png` と `ragdoll.png`（必ず参照1・2として使う。毛の質感・目・ボタンの基準）
5. `docs/ui-reference/` の4枚（アプリ内での見え方の目安。旅猫の見た目は `04-world.webp`）

## 共通仕様（既存34体と同じモビーのルール）
- **体型**: ずんぐりした丸みのある四角い「頭と体が一体」のシルエット。首・別の頭はない。短い腕と2本の短い足。**正面向き・全身**。
- **目**: 生体の猫の目が **画面左に1つ**（艶のある虹彩、大きな丸い黒目、白いハイライト）。**画面右にカメラレンズが1つ**（黒い縁、緑の反射ガラス）。目は常にこの組み合わせ。
- **ボタン**: 胸元の **左下に黒い十字キー1つ**、**右下に黒い丸ボタンが斜めに2つ**。丸ボタンは無地（肉球は付けない）。位置と大きさは参照画像に合わせる。
- **毛**: 一本一本の流れが見える、リアルな動物の毛並み。フェルト・ぬいぐるみ風の平坦な質感にしない。小さな鼻、W字の口、ひげ。
- **モビーらしさを最優先**: 見た目が変わっても、上の識別要素（片目レンズ・十字キー・丸ボタン2つ・四角いシルエット）は必ず保つ。
- **小物・衣装**: 既存34体は小物なしだが、**新規は NEW_MOBBIES_LIST のビジュアル案にある小物・衣装・ポーズを描いてよい**。ただし、小物が識別要素（レンズ・十字キー・ボタン）を隠さないこと。小物は **1〜2個まで** に抑え、シルエットが崩れない範囲にする。
- **文字は入れない**。例外: 数字（22、777、10 など）だけは小物として自然に読める範囲で入れてよい。かな・英字・透かしは入れない。
- **背景**: 透過PNG。チェッカーボードや格子模様は描かない。キャラクターは中央、周囲に十分な透明の余白。
- **照明**: やわらかいスタジオ光、品質の高いキャラクターレンダ。既存34体と並べて違和感がないこと。
- **サイズ**: 1254×1254（既存と同じ）。アルファ付きPNG。

## 出力
- 画像: `assets/cat-mobbies/new/<バッチ>/<ID>.png`（例: `assets/cat-mobbies/new/a/genkai.png`）。バッチは小文字の a〜i。
- 管理用: `assets/cat-mobbies/new/manifest.json`（**既存の `assets/cat-mobbies/manifest.json` は触らない**）。各猫について `id / name / batch / condition(台帳の出現条件) / file / width / height / sha256 / status("concept") / prompt` を記録。
- プロンプト記録: `assets/cat-mobbies/provenance/prompts-new-<バッチ>.md`（既存の prompts-batch30.md と同形式）。
- 一覧画像: `assets/cat-mobbies/new/previews/batch-<バッチ>.png`（バッチごとの全員の並び。確認用。生成による再描画でよい）。

## 手順
1. `D:\mobby-cat\.worktrees\new-mobbies` に移動し、ブランチが `codex/new-mobbies` であることを確認する。
2. **最初に3匹を試作して質感を確定**する: `genkai`（げんかい）、`santa`（さんた）、`traveling-mobby`（旅するモビー）。既存34体と並べて、モビーの識別要素・毛の質感・目が一致しているか確認する。ずれたらプロンプトを直して作り直し、確定後に残りへ進む。
3. バッチ A → B → C → D → E → F → G → H → I の順に生成する。**1バッチ終えるごとに**、画像・manifest・プロンプト記録・一覧画像をコミットする（例: `Add new mobbies: batch a`）。
4. 各画像を確認する。モビーの識別要素が欠けているもの、レンズ以外に目が2つ以上あるもの、ボタンの数が違うもの、背景が透過でないもの、不要な文字が入ったものは **作り直す**。
5. 全バッチが終わったら `assets/cat-mobbies/new/README.md`（枚数、作り直した枚数、気になった点）を作り、`git push origin codex/new-mobbies` まで行う。

## 補足：れあもびー・うゆもびー
別の旧プロジェクト由来の `rea-mobby` と `uyu-mobby` は、アプリ側の別ブランチ（`feature/image-ui`）に取り込み済み。目の質感が既存34体と少し違う旧系統なので、**今回の生成の基準にはしない**（基準は上の34体、特に bengal と ragdoll）。このブランチには存在しないので、重複して作らない。

## 特に注意する猫
- **traveling-mobby（旅するモビー）**: アプリの看板。ここは丁寧に作る。参照 `docs/ui-reference/04-world.webp` の縞トラの旅猫を基にする。
- **maboroshi-kuroneko（まぼろし黒猫）**: 半透明感のある幻想的な黒。透明な部分があっても、レンズとボタンは不透明にして識別要素を残す。
- **toumei（透明モビー）**: 同上。輪郭と中身が淡く透けるが、レンズ・十字キー・ボタンは見える。
- **country-100（ちきゅうモビー）**: 体全体が地球柄でも、四角いシルエットとボタンは保つ。
- **bunshin（ぶんしんモビー）**: 残像の表現でも、メインの1体ははっきり描き、分身は半透明で背後に。

## やらないこと
- `app/` 以下、`docs/codex/ASSET_LIST.md` など他ブランチの作業物の変更。
- 既存34体の再生成・上書き、既存 `manifest.json` の編集。
- 保留リスト（`NEW_MOBBIES_LIST.md` 末尾）の猫の生成。
- `main` や `codex/ui-assets` への直接コミット。

## 簡易版（Codexに貼る用）
```
リポジトリ haru516-web/mobby-cat の codex/new-mobbies ブランチで、フォルダ D:\mobby-cat\.worktrees\new-mobbies を使って作業してください（main や codex/ui-assets には触れない）。
目的: 新しい猫モビーのキャラクター画像（100匹）を built-in image_gen で生成する。
docs/codex/NEW_MOBBIES_PROMPT.md と docs/codex/NEW_MOBBIES_LIST.md の指示に従う。まず genkai・santa・traveling-mobby の3匹を試作して既存34体と並べて質感を確定し、その後バッチ A〜I を順に生成。1バッチごとにコミットし、最後に git push origin codex/new-mobbies まで行う。画像は assets/cat-mobbies/new/<バッチ>/<ID>.png、管理は assets/cat-mobbies/new/manifest.json（既存 manifest.json は触らない）。
```

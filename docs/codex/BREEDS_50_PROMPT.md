# Codex 依頼④ 実在する猫のモビー 50種の追加（残り15種＋新規35種）

- ブランチ: `codex/new-mobbies-2`（作業フォルダ `.worktrees/new-mobbies-2` をそのまま使う）
- 触ってよいもの: `assets/cat-mobbies/breeds2/**`、`assets/cat-mobbies/provenance/`、`assets/cat-mobbies/review/`、`docs/codex/` の記録。**コード（`app/**`）、UI画像、既存の猫の画像は変更しない。**

## 0. 最新の状態を取り込む

```bash
cd .worktrees/new-mobbies-2
git fetch origin
git merge origin/feature/breeds2       # 最新の221匹が入る。コンフリクトは報告
git branch --show-current              # codex/new-mobbies-2 を確認
```

比較対象は `assets/cat-mobbies/{characters,new,breeds2}/` の **221匹**（旅猫は別の依頼で作り直し中なので無視してよい）。

## 1. 作るもの（合計50種）

### A. `docs/codex/BREEDS_100_LIST.md` の未作成15種（ID・名前・見た目の指定はリストのまま）
egyptian-mau-smoke, ocicat-silver, burmese-blue, burmese-champagne, russian-white, russian-black, kijitora, saba-tora, chatora, sabi-neko, kuro-neko, shiro-neko, hachiware, haiiro-neko, kijishiro

- 日本の毛色9種（キジトラ〜キジシロ）は、**日本でなじみの身近な猫**として、短毛の雑種（日本猫）らしい姿にする。耳・顔・体型は、既存の猫種（アメリカンショートヘアなど）と見分けがつくこと。

### B. 新規35種（Codex が選ぶ）
- 既存221匹にいない**実在の猫種・毛色**を35種選ぶ。ID（小文字ハイフン）・日本語名・見た目の指定（English）を `docs/codex/BREEDS_50_LIST.md` に表で書く（形式は `BREEDS_100_LIST.md` に合わせる）。
- **先に一覧を書いてコミット・push**（作る前に確認できるように）。そのまま作業は止めず、続けて生成してよい。
- 選び方: ①まだ猫種として入っていないもの（セイシェルワ、ラパーマ、ブリティッシュの未登場毛色など。重複は `manifest.json` 3つのIDで必ず確認）②毛色・毛の長さ・耳・顔つきが**既存と違うもの**を優先。③**同じ猫種の毛色違いは、1猫種につき最大3種まで**。猫種の数を広げる。

## 2. 共通仕様（モビーの型）

`docs/codex/MOBBIES_V2_PROMPT.md` の「共通仕様」と同じ。ずんぐりした丸みのある四角い頭と体が一体。片目（画面左・生体の猫の目）、画面右にカメラレンズ、胸元の左下に十字キー、右下に黒い丸ボタン2つ。リアルな毛並み。1254×1254の透過PNG（周囲に十分な透明の余白）。**文字・透かし・小物・衣装は入れない。** 参照画像は `assets/cat-mobbies/characters/bengal.png` と `ragdoll.png`（毎回使う）。実在の猫種の特徴（耳・顔・毛・模様・体型）を正しく。

## 3. 似すぎないこと（最優先）

- 既存221匹と**サムネイル（256px・512px）で見分けがつく**こと。「毛色＋模様」「毛の長さ」「顔つき」「体のバランス」のうち**3つ以上が同じなら作り直す**。
- 特に、キジトラ・サバトラ・茶トラ・黒猫・白猫・グレーは、既存にも近い猫が多い。**作る前に、近い既存猫を5匹並べた確認画像を作る**（`review/` に保存）。
- 1バッチ作るごとに、そのバッチ＋近い既存猫の確認画像で見分けを確認する。

## 4. 出力と進め方

- バッチは続きの `j`〜`n`（1バッチ10匹）。`j`・`k`に A の15種＋B の5種、`l`〜`n` に B の30種を入れてよい。
- 画像: `assets/cat-mobbies/breeds2/<バッチ>/<ID>.png`。管理: **`assets/cat-mobbies/breeds2/manifest.json` に追記**（形式は既存エントリと同じ。`kind: "breed"`、`status: "concept"`）。一覧画像: `breeds2/previews/batch-<バッチ>.png`。プロンプト記録: `provenance/prompts-breeds2-<バッチ>.md`。
- **1バッチ終えるごとに**コミットして `git push origin codex/new-mobbies-2`。生成の上限で止まっても、そこまでの成果が残るようにする。
- 型が崩れたもの（レンズ以外に目が2つ以上、ボタンの数違い、背景が透過でない、文字入り、猫種の特徴が違う）は作り直す。
- 最後に `assets/cat-mobbies/breeds2/README.md` を更新（枚数、作り直した枚数、できなかったもの）。

## 5. やらないこと

コード（`app/**`）・UI画像・既存の猫の画像の変更。ルートのフォルダでの作業。ID・名前の変更。アプリへの組み込み（こちらで行う）。

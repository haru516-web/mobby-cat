# Codex 依頼② 似すぎている猫モビーの作り直し ＋ 実在の猫種100種の新規作成

- ブランチ: `codex/new-mobbies-2`（`main` から分岐済み・GitHub にも作成済み）
- 作業フォルダ: `<リポジトリのルート>/.worktrees/new-mobbies-2`（git worktree。Codex が自分で作る。手順は下の「0. 作業の始め方」）
- 触ってよいもの: **猫モビーの画像と、その記録だけ**（`assets/cat-mobbies/**`、`docs/codex/` の記録）。**コード（`app/**`）、UI画像（`app/assets/ui/**`）は変更しない。**
- 別の端末で、もう1件の Codex（UI画像の依頼①、ブランチ `codex/ui-fixes`）が同時に動く。**そちらのファイル（`app/assets/ui/**`、`assets/ui-records/**`）には触れない。**

この依頼は2つの作業からなる。**先に A（作り直し）、次に B（新規100種）。**

---

## 0. 作業の始め方（worktree）

リポジトリ: `haru516-web/mobby-cat`（GitHub）。すでに手元にあれば、そのルートで次を実行する。なければ `git clone https://github.com/haru516-web/mobby-cat.git` してから。

```bash
git fetch origin
git worktree add .worktrees/new-mobbies-2 codex/new-mobbies-2   # ブランチは作成済み。無ければ origin/codex/new-mobbies-2 から
echo ".worktrees/" >> .git/info/exclude                          # worktree フォルダを git の管理対象外にする
cd .worktrees/new-mobbies-2
git branch --show-current                                        # codex/new-mobbies-2 であることを確認
```

- **以降の作業はすべて `.worktrees/new-mobbies-2` の中だけ**で行う。元のフォルダ（ルート）と他のブランチは触らない。ブランチも切り替えない。
- **10枚を目安にコミットし、そのたびに `git push origin codex/new-mobbies-2`**（画像が大きいので、こまめに押して成果を残す）。

## 1. 読むもの

1. `docs/game-design.md`（企画）、`docs/appearance-catalog.md`（猫の台帳）
2. `docs/codex/NEW_MOBBIES_PROMPT.md`（**前回の100匹の指示書。「共通仕様」はそのまま使う**）、`docs/codex/NEW_MOBBIES_LIST.md`
3. `assets/cat-mobbies/README.md`、`assets/cat-mobbies/new/README.md`、`assets/cat-mobbies/provenance/*.md`（生成方法）
4. 参照画像（毎回必ず参照1・2として使う）: `assets/cat-mobbies/characters/bengal.png` と `ragdoll.png`
5. `docs/codex/BREEDS_100_LIST.md`（**B で作る100種の一覧**）

## 2. 共通仕様（モビーの型）— 全員これを守る

- **体型**: ずんぐりした丸みのある四角い「頭と体が一体」のシルエット。首・別の頭はない。短い腕と2本の短い足。正面向き・全身。
- **目**: 生体の猫の目が **画面左に1つ**（艶のある虹彩、大きな丸い黒目、白いハイライト）。**画面右にカメラレンズが1つ**（黒い縁、緑の反射ガラス）。
- **ボタン**: 胸元の **左下に黒い十字キー1つ**、**右下に黒い丸ボタンが斜めに2つ**（無地、肉球は付けない）。
- **毛**: 一本一本の流れが見える、リアルな動物の毛並み。小さな鼻、W字の口、ひげ。
- **背景**: 透過PNG。チェッカーボードや格子は描かない。キャラクターは中央、周囲に十分な透明の余白。やわらかいスタジオ光。
- **サイズ**: 1254×1254、アルファ付きPNG。**文字・透かし・小物・衣装は入れない**（B の実在猫種）。A の作り直しでは元の小物（その猫のコンセプトの一部）は残す。

---

## 3. 作業 A：似すぎている既存モビーの作り直し

### 何が問題か
今いる猫モビー（猫種36体＋新規100匹＝136匹）の中に、**見た目が似すぎている猫が多い**。特に、`rea-mobby`（茶と黒のキジ三毛風のふわふわ長毛）や `bengal`・`ragdoll` を手本にした結果、**同じ毛の質感・同じ顔つき・同じ体のバランス・同じ茶色系の配色**に寄っている。図鑑のマス（小さなサムネイル）で並ぶと、見分けがつかない。

### 手順
1. **監査する**: 136匹を毛色のグループ別（茶・オレンジ系／灰・黒系／白・クリーム系／ポイント系／模様系…）に並べた確認画像を作り、**サムネイル（512px、3列）で見分けがつかない組・グループ**を洗い出す。
   - 結果を `assets/cat-mobbies/review/similarity.md` に書く（グループ、該当ID、似ている点、直す方針）。確認画像は `assets/cat-mobbies/review/groups-*.png`。
   - 目安：「毛色＋模様」「毛の長さ」「顔つき」「体のバランス」のうち **3つ以上が同じ**なら似すぎ。
2. **作り直す**: 似すぎている猫を、**そのファイル名のまま**描き直す（`id`・名前・出現条件・小物のコンセプトは変えない）。
   - 変えるのは **毛色・模様・毛の長さと質感・耳の形と大きさ・顔つき（目の位置と大きさ・鼻と口）・体のバランス（ふっくら／すらり）・ポーズ・表情**。
   - **モビーの型（上の共通仕様）は崩さない**：片目レンズ・十字キー・丸ボタン2つ・四角いシルエット。
   - `rea-mobby` と同じ配色・同じ長毛のキジ三毛は **もう増やさない**。
3. **一覧のなかで同じ見た目のグループは最大2匹まで**にする。

### 記録
- `assets/cat-mobbies/manifest.json`（猫種36）と `assets/cat-mobbies/new/manifest.json`（新規100）の該当エントリの `sha256`・`bytes`・`prompt` を更新し、`"regen": true` と `"regenReason": "<似ていた相手と、変えた点>"` を足す。
- `assets/cat-mobbies/provenance/prompts-regen-<グループ>.md` にプロンプトを残す。

### 件数
決まった件数はない。**似ている猫を全部洗い出して直す**（監査の結果を先に報告してよい）。

---

## 4. 作業 B：実在する猫種100種の新規作成

- **作る一覧は `docs/codex/BREEDS_100_LIST.md`**（ID・名前・見た目の指定が決まっている。**ID・名前は変えない**）。
- 既存36種にいない猫種・毛色を100種選んだもの。**ラグドール**など実在の人気猫種の別の毛色も含む。
- **実在の猫種の特徴を正しく**（耳・顔・毛の長さ・模様・体型）。モビーの型の中で、猫種らしさが伝わるようにする。
- 既存の猫と **サムネイルで見分けがつく**こと（特に、毛色が近い組は体型・耳・顔つき・毛の質感で差を出す）。
- 小物・衣装は付けない。

### 出力
- 画像: `assets/cat-mobbies/breeds2/<バッチ>/<ID>.png`（バッチは小文字 a〜j。1バッチ10匹）。
- 管理: `assets/cat-mobbies/breeds2/manifest.json`（**既存の manifest は編集しない**）。各猫について `id / name / batch / kind("breed") / file / width / height / sha256 / status("concept") / prompt` を記録。形式は `assets/cat-mobbies/new/manifest.json` に合わせる（`condition` は不要）。
- 一覧画像: `assets/cat-mobbies/breeds2/previews/batch-<バッチ>.png`。
- プロンプト記録: `assets/cat-mobbies/provenance/prompts-breeds2-<バッチ>.md`。

---

## 5. 進め方

1. **まず試作**: A から2匹（似ていた中の代表）、B から3匹（`ragdoll-seal-mitted`、`savannah`、`mike-neko`）を作り、既存36体と並べて質感と見分けやすさを確認する。ずれていたらプロンプトを直してから本番へ。
2. A（監査 → 作り直し）を終える。途中経過は `similarity.md` に追記。
3. B を a → j の順に作る。**1バッチ終えるごとに**画像・manifest・プロンプト記録・一覧画像をコミットして push（例: `Add breeds2: batch a`）。
4. 各画像を確認する。型が崩れているもの（レンズ以外に目が2つ以上、ボタンの数違い、背景が透過でない、文字入り、猫種の特徴が違う）は **作り直す**。
5. 完了したら `assets/cat-mobbies/breeds2/README.md`（枚数、作り直した枚数、気になった点）と `assets/cat-mobbies/review/similarity.md`（最終版）を整える。`git push origin codex/new-mobbies-2` まで。

## 6. やらないこと

- コード（`app/**`）、UI画像（`app/assets/ui/**`）の変更。`main` や他のブランチへのコミット。ルートのフォルダでの作業。
- 既存の `assets/cat-mobbies/manifest.json` と `new/manifest.json` の **A の作り直し以外の編集**。
- ID・名前の変更。
- アプリへの組み込み（`app/assets/cats/**`、`app/src/data/catalog.ts`）。これはこちらで `tools/build-app-assets.ps1` を実行して行う。

# Codex 依頼：透過不良の動きシート25枚を再生成する（2回目）

前回の再生成（`SPRITE_REGEN_PROMPT.md`）のあとも、縁の白いふち・ギザギザ・もやが残っているシートがある。ユーザーが一覧ページで目視して選んだ **`app/assets/cat-act/` の次の25枚（これで全部。一覧にないものは触らない）** を、**補正や切り抜き直しではなく、背景が最初から完全に透明な状態で「描き直し（再生成）」** する。既存シートは、ポーズの参照としてだけ使う（絵の素材としてコピーしない）。

```
somali-cover
denchigire-fall, denchigire-sleep, denchigire-angry
oriental-longhair-hiss
birman-blue-point-sleep, birman-blue-point-peekaboo, birman-blue-point-hiss
norwegian-forest-sleep
kikan-fall
british-longhair-angry, british-longhair-peekaboo
highland-fold-peekaboo, highland-fold-fall
cornish-rex-black-white-fall, cornish-rex-black-white-angry
bengal-cover
genkai-cover
laperm-black-cover
american-curl-hiss
karelian-bobtail-angry, karelian-bobtail-peekaboo
country-01-cover
munchkin-peekaboo
mantan-hiss
```

## 再生成のやり方

- 元になる猫の画像は `app/assets/cats/<id>.webp`（id は `app/src/data/catalog.ts`）。デザイン（顔・毛色・模様・お腹の十字キーとボタン・アクセサリー）は**変えない**。
- 動き（sleep＝鼻ちょうちんで寝る／peekaboo＝いないいないばあ／fall＝ひっくり返る／angry・hiss＝怒る／cover＝肉球で全面を覆う）、8コマの順番、コマごとのポーズ、猫の大きさと位置は、**今のシートと同じ**にする。
- 生成時の背景は、猫に使われていない単色（マゼンタ `#ff00ff` やグリーンなど）にし、そこから**完全に透明**にする。猫の外側に、白・ベージュ・クリーム・マゼンタの縁、半透明のもや、影、光のにじみ、点ゴミを**一切残さない**。毛のふわふわした縁は 1〜2px の自然なぼかしにとどめる。
- 白・クリーム色の猫（birman、highland-fold、british-longhair など）は、体まで透明に抜けやすい。**体を削らない**。穴・欠けを作らない。
- 補正ツール（`tools/fix-sprite-halo.mjs` など）で後から直す前提にしない。生成した時点で透過がきれいであること。

## シートの仕様（変えない）

- WebP、アルファ付き。**cat-act は 768×384**（4列×2行、1コマ 192×192）。コマ順は左上から右へ、次の行へ（0〜7）。
- 8コマはすべて別のコマ（重複・空コマなし）。`*-cover` は4コマ目以降が全面の肉球で、コマの端まで絵が来るのは仕様。
- ファイル名・置き場所は今のまま。

## 絶対に守ること

- 猫のデザインを変えない。実在する猫（`catalog.ts` の id と名前）だけを使う。`ui-reference` のモック猫は使わない。
- 体（毛・耳・しっぽ・足）を削らない。
- 上の25枚以外の素材・コードは触らない。ビルド（EAS Build、`expo run` など）はしない。

## 確認のしかた（完了条件）

1. 再生成したシートごとに、黒・マゼンタ・白の3色に重ねた画像を作り、目で見て、白い縁・ギザギザ・もや・穴・ゴミがないことを確認する。
2. `node tools/audit-sprite-alpha.mjs <出力フォルダ>` を実行し、25枚の `haloMax` を確認する。0.3 超が残るなら見た目で確認し（白い猫は誤検出しやすい）、本当に縁が残っていれば作り直す。
3. 接地位置の表を作り直す：`node tools/build-cat-feet.mjs`
4. `cd app && npx tsc --noEmit` が通ること。

## ブランチ

`codex/sprite-regen2`（`fix/deai-zukan-audit` の `588359a9` から切ってある）。**作業ツリーは Codex が作る**：

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/sprite-regen2 codex/sprite-regen2
```

※別端末の場合は、先に `git fetch origin` し、自分の環境のリポジトリのパスに読み替える（ブランチは `origin/codex/sprite-regen2`）。作業は作った worktree の中だけで行い、リポジトリのルートは使わない。
コミットは、素材（`app/assets/cat-act/…`）と `app/src/data/catFeet.json` だけ。完了したら、作り直したシートの一覧と、直せなかったシートがあればその理由を報告する。

# Codex 依頼：透過不良の猫素材72枚を再生成する（3回目）

ユーザーが全アニメ確認ページ（動き1,604＋ごろごろ270＋静止画270）を目視して「NG」にした **次の72枚（これで全部。一覧にないものは触らない）** を、**補正や切り抜き直しではなく、背景が最初から完全に透明な状態で「描き直し（再生成）」** する。既存の素材は、ポーズ・デザインの参照としてだけ使う（絵の素材としてコピーしない）。過去の再生成（`SPRITE_REGEN_PROMPT.md`、`SPRITE_REGEN2_PROMPT.md`）と同じ方針。

## 対象

### 動きシート `app/assets/cat-act/<名前>.webp`（69枚）
```
asian-ticked-tabby-cover
birman-blue-point-fall
birman-hiss
british-black-hiss
british-longhair-fall
chausie-angry, chausie-peekaboo, chausie-sleep
cornish-rex-angry, cornish-rex-fall, cornish-rex-hiss, cornish-rex-peekaboo, cornish-rex-sleep
cornish-rex-black-white-peekaboo, cornish-rex-black-white-sleep
country-04-fall, country-04-peekaboo, country-04-sleep
country-05-fall, country-05-hiss, country-05-peekaboo, country-05-sleep
country-07-fall, country-07-sleep
country-100-angry, country-100-fall, country-100-peekaboo, country-100-sleep
donskoy-angry, donskoy-fall, donskoy-peekaboo, donskoy-sleep
egyptian-mau-bronze-angry, egyptian-mau-bronze-fall, egyptian-mau-bronze-peekaboo
german-rex-angry, german-rex-peekaboo
highland-fold-angry
javanese-sleep
karelian-bobtail-fall, karelian-bobtail-sleep
kijishiro-hiss
kikan-angry, kikan-hiss, kikan-peekaboo, kikan-sleep
maine-coon-silver-tabby-angry, maine-coon-silver-tabby-peekaboo, maine-coon-silver-tabby-sleep
mantan-fall, mantan-peekaboo, mantan-sleep
munchkin-angry
napoleon-peekaboo, napoleon-sleep
nekonohi-fall
norwegian-forest-angry, norwegian-forest-fall, norwegian-forest-peekaboo
ragdoll-angry, ragdoll-fall
sanbiki-sleep, sanbiki-peekaboo
savannah-hiss
scottish-fold-fall
scottish-straight-hiss
shingetsu-angry, shingetsu-fall
world-traveler-fall
```

### ごろごろシート `app/assets/cat-roll/<名前>.webp`（1枚）
```
country-09
```

### 静止画 `app/assets/cats/<名前>.webp`（2枚）
```
rea-mobby
uyu-mobby
```
静止画は猫の元画像そのもの。同じ猫のほかの素材（動き・ごろごろ）の見た目の基準になるので、デザインは変えず、透過だけきれいにする。元画像（`assets/cat-mobbies/**/manifest.json` が指す元）がある場合は、そちらを直してから `tools/build-app-assets.ps1` 相当の手順で `app/assets/cats/*.webp`（512px）を作り直してよい。ただしこの2枚以外の猫を巻き込まない（ffmpeg が必要。難しければ `app/assets/cats/` のファイルだけを直接差し替える）。

## 再生成のやり方

- 元になる猫の画像は `app/assets/cats/<id>.webp`（id は `app/src/data/catalog.ts`）。デザイン（顔・毛色・模様・お腹の十字キーとボタン・アクセサリー）は**変えない**。
- 動き（sleep＝鼻ちょうちんで寝る／peekaboo＝いないいないばあ／fall＝ひっくり返る／angry・hiss＝怒る／cover＝肉球で全面を覆う）、8コマの順番、コマごとのポーズ、猫の大きさと位置は、**今のシートと同じ**にする。
- 生成時の背景は、猫に使われていない単色（マゼンタ `#ff00ff` やグリーンなど）にし、そこから**完全に透明**にする。猫の外側に、白・ベージュ・クリーム・マゼンタの縁、半透明のもや、影、光のにじみ、点ゴミを**一切残さない**。毛のふわふわした縁は 1〜2px の自然なぼかしにとどめる。
- 白・クリーム色の猫は体まで透明に抜けやすい。**体を削らない**。穴・欠けを作らない。
- 補正ツール（`tools/fix-sprite-halo.mjs` など）で後から直す前提にしない。生成した時点で透過がきれいであること。

## シートの仕様（変えない）

- WebP、アルファ付き。**cat-act は 768×384**（4列×2行、1コマ 192×192）、**cat-roll は 1024×512**（1コマ 256×256）。コマ順は左上から右へ、次の行へ（0〜7）。
- 8コマはすべて別のコマ（重複・空コマなし）。`*-cover` は4コマ目以降が全面の肉球で、コマの端まで絵が来るのは仕様。
- 静止画は今のファイルと同じ大きさ・アルファ付き WebP。
- ファイル名・置き場所は今のまま。

## 絶対に守ること

- 猫のデザインを変えない。実在する猫（`catalog.ts` の id と名前）だけを使う。`ui-reference` のモック猫は使わない。
- 体（毛・耳・しっぽ・足）を削らない。
- 上の72枚以外の素材・コードは触らない。ビルド（EAS Build、`expo run` など）はしない。

## 確認のしかた（完了条件）

1. 再生成したものごとに、黒・マゼンタ・白の3色に重ねた画像を作り、目で見て、白い縁・ギザギザ・もや・穴・ゴミがないことを確認する。
2. `node tools/audit-sprite-alpha.mjs <出力フォルダ>` を実行し、`haloMax` を確認する。0.3 超が残るなら見た目で確認し（白い猫は誤検出しやすい）、本当に縁が残っていれば作り直す。
3. 接地位置の表を作り直す：`node tools/build-cat-feet.mjs`
4. `cd app && npx tsc --noEmit` が通ること。

## ブランチ

`codex/sprite-regen3`（`fix/deai-zukan-audit` の `6c6c6872` から切ってある）。**作業ツリーは Codex が作る**：

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/sprite-regen3 codex/sprite-regen3
```

※別端末の場合は、先に `git fetch origin` し、自分の環境のリポジトリのパスに読み替える（ブランチは `origin/codex/sprite-regen3`）。作業は作った worktree の中だけで行い、リポジトリのルートは使わない。
コミットは、素材（`app/assets/cat-act/…`、`cat-roll/…`、`cats/…`）と `app/src/data/catFeet.json` だけ。完了したら、作り直したものの一覧と、直せなかったものがあればその理由を報告する。

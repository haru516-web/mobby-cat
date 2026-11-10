# Codex 依頼：透過不良シートの「再生成」＋れあもびー／うゆもびーの口ありやり直し

前回（`SPRITE_FINAL_FIX_PROMPT.md`）は既存シートの補正・切り抜き直しが中心だった。それでも白い縁・もやが残っているシートがある（ユーザーが目視で確認）。
今回は **補正や切り抜き直しをしない。既存の絵を土台にせず、背景が最初から完全に透明な状態で「描き直し（再生成）」する。** 既存シートをさらに修正するのではなく、新しく作って置き換えること。

作業は3つ。**順番どおりに**行う（③は②の完成に依存する）。

---

## ① 透過不良の動きシート32枚を再生成する

対象は `app/assets/cat-act/` の次の32枚（ユーザーが目視で選んだもの。これで全部。一覧にないものは触らない）。

```
amayadori-sleep, amayadori-fall, amayadori-angry, amayadori-peekaboo
birman-blue-point-fall, birman-blue-point-angry, birman-blue-point-hiss
denchigire-peekaboo
nekonohi-cover
scottish-fold-fall, scottish-fold-angry, scottish-fold-peekaboo
highland-fold-angry, highland-fold-fall
sabi-neko-hiss
british-longhair-fall, british-longhair-hiss
ragdoll-angry, ragdoll-peekaboo, ragdoll-fall
country-30-cover
chausie-fall
maine-coon-silver-tabby-fall
norwegian-forest-peekaboo, norwegian-forest-fall, norwegian-forest-angry
shirokuro-cover
munchkin-fall
ocicat-silver-hiss
mantan-cover
cornish-rex-cover
taiyou-cover
burmese-cover
```

（実数32枚。`uyu-mobby-cover` と、れあもびーの `rea-mobby` は③の対象なので、ここには含めない。）

### 再生成のやり方

- 元になる猫の画像は `app/src/data/catalog.ts` の画像（`app/assets/cats/<id>.webp`）。デザイン（顔・毛色・模様・お腹の十字キーとボタン・アクセサリー）は**変えない**。
- 動き（sleep＝鼻ちょうちんで寝る／peekaboo＝いないいないばあ／fall＝ひっくり返る／angry・hiss＝怒る／cover＝肉球で全面を覆う）、8コマの順番、コマごとのポーズ、猫の大きさと位置は、**今のシートと同じ**にする（今のシートはポーズの参照としてだけ使う。絵の素材としてコピーしない）。
- 生成時の背景は、猫に使われていない単色（例：マゼンタ `#ff00ff` やグリーン）にし、そこから**完全に透明**にする。猫の外側に、白・ベージュ・クリーム・マゼンタの縁、半透明のもや、影、光のにじみ、点ゴミを**一切残さない**。毛のふわふわした縁は 1〜2px の自然なぼかしにとどめる。
- 白・クリーム色の猫（ragdoll、birman、shirokuro、highland/scottish-fold など）は、体まで透明に抜けやすい。**体を削らない**。穴・欠けを作らない。
- 補正ツール（`tools/fix-sprite-halo.mjs` など）で後から直す前提にしない。生成した時点で透過がきれいであること。

---

## ② れあもびー／うゆもびーの正面画像を、口ありで再生成する

`app/assets/cats/rea-mobby.webp` と `app/assets/cats/uyu-mobby.webp`（どちらも 512×512 くらいの正面立ち姿）には**口がない**。他の猫と同様に、**口あり**で描き直す。

- **今の正面画像を参考（リファレンス）にして**、デザインは変えずに口だけ足す：
  - れあもびー：三毛（黒・茶・オレンジのぶち）、左目は黄緑の丸い目、右目はカメラレンズ、茶色の首輪と肉球のチャーム、お腹の十字キーとボタン2つ。
  - うゆもびー：ふわふわのベージュ〜グレーの毛、左目は丸い白目の大きな黒目、右目はカメラレンズ、首元に小さな玉飾りと鈴、お腹の十字キーとボタン2つ。
- 口は、他のモビー（例：`app/assets/cats/` の別の猫）の口の描き方・大きさ・位置に合わせる。表情は自然で、かわいい通常顔。
- **背景は完全な透明**。縁の白・ベージュのふち、もや、影を付けない。
- 同じファイル名・同じサイズ・WebP（アルファ付き）で `app/assets/cats/rea-mobby.webp`、`app/assets/cats/uyu-mobby.webp` を置き換える。
- `app/assets/cat-roll/rea-mobby.webp`、`app/assets/cat-roll/uyu-mobby.webp`（ごろごろ）も、新しい正面画像が決まったら③と同じ方法で作り直す（正面画像に口がなければ、ごろごろにも口がない）。

**ここで一度止めて、ユーザーに完成した2枚の正面画像を見せて承認をもらう。** 口の位置・形が気に入らなければ直す。承認が出てから③に進む。（承認を待てない場合は、③を先に進めず、②までをコミットして報告する。）

---

## ③ れあもびー／うゆもびーの動きシート全部を、②の正面画像から再生成する

承認された新しい正面画像（口あり）を元に、2匹の動きシートを**すべて**作り直す。

- `app/assets/cat-act/rea-mobby-{sleep,peekaboo,fall,angry,hiss,cover}.webp`
- `app/assets/cat-act/uyu-mobby-{sleep,peekaboo,fall,angry,hiss,cover}.webp`
- `app/assets/cat-roll/rea-mobby.webp`、`app/assets/cat-roll/uyu-mobby.webp`

（合計14枚。口あり・口の位置が全コマで一致していること。angry／hiss は口を開けた表情、sleep は鼻ちょうちんなど、動きごとの表情は他の猫の同じ動きのシートに合わせる。）
①と同じ方法（背景が最初から透明、縁の白・もや・ゴミなし）で作り、ポーズ・コマ順・大きさ・位置は、今のシートと同じにする。

---

## シートの仕様（変えない）

- WebP、アルファ付き。**cat-act は 768×384**（4列×2行、1コマ 192×192）、**cat-roll は 1024×512**（1コマ 256×256）。コマ順は左上から右へ、次の行へ（0〜7）。
- 8コマはすべて別のコマ（重複・空コマなし）。
- ファイル名・置き場所は今のまま。

## 絶対に守ること

- 猫のデザイン（顔・毛色・模様・お腹の十字キーとボタン・アクセサリー）を変えない（②で足す「口」だけが例外）。
- 実在する猫の名前・画像だけを使う（`app/src/data/catalog.ts` の id と名前）。`ui-reference` のモック猫は使わない。
- 体（毛・耳・しっぽ・足）を削らない。
- 上の対象以外の素材・コードは触らない。ビルド（EAS Build、`expo run` など）はしない。

## 確認のしかた（完了条件）

1. 再生成したシートごとに、暗い背景（黒）・マゼンタ・白の3色に重ねた画像を作り、目で見て、白い縁・ギザギザ・もや・穴・ゴミがないことを確認する。
2. 次のツールで、再生成した全シートの数値を確認する：

   ```bash
   node tools/audit-sprite-alpha.mjs <出力フォルダ>
   ```

   `haloMax` が 0.3 を超えるものがあれば、見た目で確認し（白い猫は誤検出しやすい）、本当に縁が残っているなら作り直す。
3. 新しいシートで、接地位置（足元）の表を作り直す：

   ```bash
   node tools/build-cat-feet.mjs
   ```

4. `cd app && npx tsc --noEmit` が通ること。

## ブランチ

`codex/sprite-regen`（現在の `fix/deai-zukan-audit` の先頭から切ってある）。**作業ツリーは Codex が作る**：

```bash
git -C D:/mobby-cat worktree add D:/mobby-cat/.worktrees/sprite-regen codex/sprite-regen
```

作業は **`D:/mobby-cat/.worktrees/sprite-regen` の中だけ**で行う（`D:/mobby-cat` のルートは使わない）。
コミットは、素材（`app/assets/cats/…`、`app/assets/cat-act/…`、`app/assets/cat-roll/…`）と `app/src/data/catFeet.json` だけ。②の完了時と、③の完了時でコミットを分ける。
完了したら、作り直したシートの一覧と、直せなかったシートがあればその理由を報告する。

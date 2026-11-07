# Codex 依頼：ホームの猫の動き素材の「縁のにじみ」を作り直す

ホームで猫が動くと、猫のまわりにベージュの霞や四角い残りが付いて見える素材がある（例：きかんモビー）。原因は切り抜き（透過）の失敗で、背景の色が不透明のまま縁に残っている。
Claude が自動補正を試したが、**実機で見るとまだ白いふちが残っていて、不十分**だった（ユーザーが確認）。確実に直すため、ここで作り直してほしい。

**重要：下の一覧は、Claude の数値診断で見つけた分だけ。取りこぼしがある。** 猫の絵の外側に、白・ベージュのふち（シールのような縁取り）が見える素材を、`app/assets/cat-act` の全1,350シート（270匹×sleep/peekaboo/fall/angry/cover は cover を除く1,080）から、**目で見て**探して、全部直すこと。一覧は優先順位の目安にする。

（`*-cover.webp` は肉球で画面を覆う動きの素材。最後のコマが肉球で全面を覆うのは仕様なので、対象外。）

## 対象（まずここから。全シートの目視確認は必須）

`app/assets/cat-act/<id>-<動作>.webp`（動作は sleep / peekaboo / fall / angry）。1つだけ `app/assets/cat-roll/country-09.webp`。
優先「高」から順に。「低（目視で確認）」は、すでにきれいな可能性がある。見て、問題がなければ触らない。

| 優先 | id | 名前 | 作り直すシート（半透明の割合） | 元の猫画像 |
|---|---|---|---|---|
| 高 | tonkinese-champagne-mink | トンキニーズ（シャンパンミンク） | angry(0.44)、sleep(0.55)、peekaboo(0.45)、fall(0.55) | `assets/cat-mobbies/breeds2/n/tonkinese-champagne-mink.png` |
| 高 | german-rex | ジャーマンレックス | sleep(0.39)、peekaboo(0.52)、angry(0.51) | `assets/cat-mobbies/breeds2/c/german-rex.png` |
| 高 | shingetsu | しんげつモビー | sleep(0.36)、peekaboo(0.44)、angry(0.40)、fall(0.50) | `assets/cat-mobbies/new/c/shingetsu.png` |
| 高 | abyssinian-fawn | アビシニアン（フォーン） | angry(0.37)、peekaboo(0.34)、sleep(0.16)、fall(0.46) | `assets/cat-mobbies/breeds2/h/abyssinian-fawn.png` |
| 高 | chausie | チャウシー | fall(0.40) | `assets/cat-mobbies/breeds2/d/chausie.png` |
| 高 | shikaku | 四角モビー | sleep(0.39) | `assets/cat-mobbies/new/h/shikaku.png` |
| 高 | pittari | ぴったりモビー | sleep(0.39) | `assets/cat-mobbies/new/b/pittari.png` |
| 高 | kikan | きかんモビー | peekaboo(0.33)、fall(0.21) | `assets/cat-mobbies/new/a/kikan.png` |
| 高 | donskoy | ドンスコイ | fall(0.33) | `assets/cat-mobbies/breeds2/c/donskoy.png` |
| 中 | munchkin | マンチカン | fall(0.28) | `assets/cat-mobbies/breeds2/b/munchkin.png` |
| 中 | maine-coon-silver-tabby | メインクーン（シルバータビー） | angry(0.22)、sleep(0.28) | `assets/cat-mobbies/breeds2/h/maine-coon-silver-tabby.png` |
| 中 | mantan | まんたんモビー | fall(0.28) | `assets/cat-mobbies/new/a/mantan.png` |
| 中 | country-100 | ちきゅうモビー | sleep(0.27) | `assets/cat-mobbies/new/e/country-100.png` |
| 中 | javanese | ジャバニーズ | angry(0.20)、peekaboo(0.23)、fall(0.22)、sleep(0.24) | `assets/cat-mobbies/breeds2/a/javanese.png` |
| 中 | ragamuffin-cream-white | ラガマフィン（クリーム＆ホワイト） | fall(0.24)、angry(0.17)、peekaboo(0.17) | `assets/cat-mobbies/breeds2/n/ragamuffin-cream-white.png` |
| 中 | sanbiki | さんびきモビー | sleep(0.21)、peekaboo(0.19)、angry(0.20)、fall(0.21) | `assets/cat-mobbies/new/d/sanbiki.png` |
| 中 | country-03 | さんかくモビー | fall(0.20)、peekaboo(0.17)、angry(0.18) | `assets/cat-mobbies/new/e/country-03.png` |
| 中 | highland-fold | ハイランドフォールド | sleep(0.19) | `assets/cat-mobbies/breeds2/b/highland-fold.png` |
| 中 | scottish-fold | スコティッシュフォールド | angry(0.18)、fall(0.19)、peekaboo(0.18) | `assets/cat-mobbies/characters/scottish-fold.png` |
| 低（目視で確認） | country-09 | きゅうせいしゅモビー | roll(0.18) | `assets/cat-mobbies/new/e/country-09.png` |
| 低（目視で確認） | turkish-van-cream | ターキッシュバン（クリーム） | peekaboo(0.17)、angry(0.17)、fall(0.16) | `assets/cat-mobbies/breeds2/m/turkish-van-cream.png` |
| 低（目視で確認） | maine-coon | メインクーン | fall(0.17) | `assets/cat-mobbies/characters/maine-coon.png` |

「半透明の割合」は、絵のある画素のうち alpha が 9〜245 のものの割合。きれいな素材は 0.07〜0.10、にじみのある素材は 0.2〜0.5。

### 第2陣：Claude が仮補正した25シート（こちらもあとで作り直す）

自動補正で、霞の大半は消えたが、薄い霞・四角い残りがまだ見えるもの（半透明の割合が 0.17〜0.55）。上の49シートを終えたら、同じ方法で作り直す。現状の絵は、これでも補正前よりはきれいなので、急がなくてよい。

`chausie-angry`ã`chausie-peekaboo`ã`chausie-sleep`ã`cornish-rex-fall`ã`country-04-angry`ã`country-04-fall`ã`country-04-peekaboo`ã`country-04-sleep`ã`country-05-angry`ã`country-05-fall`ã`country-05-peekaboo`ã`country-05-sleep`ã`country-06-sleep`ã`country-07-sleep`ã`donskoy-angry`ã`donskoy-peekaboo`ã`donskoy-sleep`ã`kikan-angry`ã`kikan-sleep`ã`maine-coon-silver-tabby-peekaboo`ã`mantan-angry`ã`mantan-peekaboo`ã`mantan-sleep`ã`munchkin-angry`ã`munchkin-peekaboo`ã

## シートの仕様（変えない）

- WebP、**768×384**、アルファ付き。4列×2行、1コマ **192×192**、コマ順は左上から右へ、次の行へ（0〜7）。
- 動きは今のシートと同じ：sleep（鼻ちょうちんで寝る）、peekaboo（いないいないばあ）、fall（ひっくり返る）、angry（怒る）。8コマの順番・コマごとのポーズ・猫の大きさと位置も、**今のシートのまま**。
- ファイル名は同じ（`<id>-<動作>.webp`）。置き場所も同じ。

## やってほしいこと

**方法A（優先）：今のシートの絵はそのまま、切り抜きだけやり直す。**
1. 今のシート（`app/assets/cat-act/…`）を、1コマずつ取り出す。
2. 各コマを、背景除去（例：rembg の isnet/u2net、または SAM 系）で切り抜き直し、猫の形に沿った**きれいなアルファ**にする。縁のベージュの霞・四角い残りは、**全部透明**にする。毛のふわふわした縁は、1〜2px の自然なぼかしにとどめる。
3. 縁の色が背景に染まっているので、縁の2〜3pxは、すぐ内側の毛の色に寄せて（デコンタミ）、白っぽいふちを消す。
4. 8コマを同じ並びに戻して、WebP（quality 90 前後）で書き出す。

方法Aで形が崩れる素材（毛の薄い猫、白やクリーム色の猫は、背景と毛の色が近くて難しい）は、**方法B**：元の猫画像から、同じ動き・同じ構図で、**背景が完全に透明な**シートを描き直す。背景色の霞・影・光のにじみは入れない。

## 絶対に守ること

- 背景の色（ベージュ・白）が、猫のまわりに**残らない**こと。ホームの床はオレンジ色の木の床。白やベージュのふちが見えたらやり直し。
- 体（毛・耳・しっぽ・足・アクセサリー）を**削らない**こと。白・クリーム色の猫は、体まで透明にしてしまいやすい。
- 猫のデザイン（顔・毛色・模様・お腹の十字キーとボタン・アクセサリー）を**変えない**こと。
- 実在する猫の名前・画像だけを使う（`app/src/data/catalog.ts` の id と名前）。
- ほかの素材・コードは触らない。

## 確認のしかた（完了条件）

1. 直したシートごとに、ホームの床の色（`#b5702e`）の上に重ねた画像を作って、目で見て、白いふち・四角い残りがないことを確認する。
2. 次のコマンドで、どの素材も **clean**（「半透明の割合」が 0.18 未満）になること：

```bash
node tools/fix-sprite-halo.mjs <一時フォルダ>
```

   出力の `--- regen` と `--- fixed` に、直した素材の名前が出ないこと。
3. 影の位置の表を作り直す：

```bash
node tools/build-cat-feet.mjs
```

4. `cd app && npx tsc --noEmit` が通ること。

## ブランチ

`codex/alpha-regen`（作業ツリーは Codex が作る）。コミットは、素材（`app/assets/cat-act/…`）と `app/src/data/catFeet.json` だけ。

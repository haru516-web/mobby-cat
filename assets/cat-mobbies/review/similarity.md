# 既存136匹の類似監査

監査日: 2026-10-25。対象ブランチ: codex/new-mobbies-2。
状態: 初回監査と指定5匹の試作比較を完了。A本番の再描画中。A最終再監査とB本番は未完了。

## 方法

characters 36匹と new 100匹を全件確認。groups-*.png は元PNGをアルファ合成した比較画像（1枠512px、3列、ID付き）。色分布による仮分類は warm 95 / light 14 / dark 7 / grey-color 20。小物や肌の色にも影響されるため、これは猫種や毛色の厳密な分類ではない。全13ページを目視した。

判定は毛色と模様・毛丈・顔・体の比率の4項目。3項目以上が近い組を再描画対象とする。小物だけの違いは差別化と数えない。bengal/ragdollは型の参照として保持、rea-mobby/uyu-mobbyは旧キャラクターの基準として保持する。下表は再描画前の判定であり、完了を意味しない。

## 類似グループと変更方針

| グループ | 該当ID | 似ている点 | 保持・再描画方針 |
|---|---|---|---|
| 長毛キジ三毛の反復 | rea-mobby, shikaku, tomodachizure, bunshin, traveling-mobby, country-30, shachou, kikan, collector | 黒茶オレンジ、放射状の長毛、立ち耳と丸い目、同じ正方形の比率 | rea-mobbyを保持。他は再描画。shikakuは銀白黒の短毛で横広、tomodachizureは白ライラックの大耳短毛。bunshinは青灰の短い巻き毛、travelingは短毛の赤茶トラに白い口元、country-30はアイボリーのワイヤー毛、shachouは銀の短毛、kikanは黒白の粗毛、collectorは青クリームの折れ耳。元の小物コンセプトを保持 |
| 茶色単色の丸顔 | havana-brown, burmese, halloween, mushoku, bouken-ou | 茶の単色、丸顔・小耳、幅高さと口元が近い | havana-brownは大耳と長いマズル、burmeseは幅広の頬、halloweenは黒煙の短毛、mushokuは白茶の波毛、bouken-ouは淡い砂色の粗毛に変える |
| 茶長毛猫種 | siberian, maine-coon, somali, norwegian-forest | 茶の長毛、白い顎、同程度の耳と頬と体幅 | 全4匹の猫種差を強める。siberianは冷たい銀タビーの密な三重毛で樽型、maine-coonは大きな房耳と四角いマズル、somaliは均一なソレルの軽い毛と大耳、norwegianは三角の顔と長いガードヘア |
| 茶白の汎用顔 | world-traveler, nyanpo, hisashiburi, hyakunin, ouji, shitsukoi, nyannyan, turkish-van, chokotto, hodohodo, nekonohi | 薄茶白、似た長さの毛、丸眼と頬、同じ胴比率 | turkish-vanは頭尾だけ赤いバン模様を強化して保持。ほかは毛色・毛丈・耳・体幅の複数を変更。各条件の小物は保持。world-traveler=黒白短毛大耳、nyanpo=麦色の粗毛、hisashiburi=白にチョコ小斑の短毛、hyakunin=ライラック巻き毛、ouji=青灰の短毛丸頬、shitsukoi=銀白の折れ耳、nyannyan=クリーム短毛横広、chokotto=淡いピンク灰の短毛小柄、hodohodo=青クリーム短毛、nekonohi=白い長毛で小耳 |
| 橙の長毛 | osanpo, tekuteku, mainichi, lucky, mantan, hinata, country-50 | 橙とクリーム、ふわふわ毛、顔と体比率 | 全員を個別化。osanpo=砂色短毛大耳、tekuteku=濃赤の細い縞で引き締める、mainichi=橙白の短い波毛、lucky=金の短毛で幅広頬、mantan=明橙の短毛大丸耳、hinata=淡杏の長毛折れ耳、country-50=金色の長い巻き毛 |
| 黒白の長毛 | sakasama, country-08, juunyan, usotsuki | ハチワレ、長毛、丸い目と同じ胴比率 | sakasamaは黒白の片側配色を保持。country-08=黒白大斑の短毛と丸耳、juunyan=白地に黒点の巻き毛、usotsuki=黒い短毛に細い白線で大耳 |
| 灰茶の疲れ顔 | genkai, denchigire, toshikoshi, issei-nenne, samishigari, nebosuke | 淡灰茶の毛、半眼・低い耳、幅広胴 | genkai/denchigireは疲れ表現を保ち短毛銀縞/青灰の波毛に分化。toshikoshi=白黒短毛丸頬、issei-nenne=淡青長毛小耳、samishigari=ミルク茶の短毛大耳、nebosuke=クリームの長い巻き毛 |
| ピンク白 | tanjoubi, sakura, country-20, asa | ピンク白、同じ毛丈と頬と体比率 | tanjoubi=短毛ピンク白大斑で丸耳、sakura=濃い桜の先端色と白胸の絹毛で大耳、country-20=淡桃の短い巻き毛、asa=桃と白の短毛で横広 |
| 白の長毛 | persian, turkish-angora, santa, yukidaruma, country-01, country-07, oiwai | 白長毛、同じ目と頬と体幅 | persianは平たい顔と非常に小さい耳、turkish-angoraは大耳と軽い絹毛。santa=白い短毛丸頬、yukidaruma=白い巻き毛で極端に横広、country-01=アイボリー短毛大耳、country-07=虹の尾を保ち白いワイヤー毛、oiwai=白い短毛に桃色の小斑 |
| 氷青白 | country-06, hatsuyuki, country-75, aotsuki, tsuyu | 青白の長毛、丸い目、同じ胴体 | country-06=氷青の短い縮れ毛、hatsuyuki=白に淡青の先端色と小丸耳、country-75=銀白の絹長毛と大耳、aotsuki=青銀の短毛と大丸耳、tsuyu=淡青白の短い波毛 |
| 虹白 | kiseki, pittari | 虹色白、毛丈・顔・胴比率すべて近い | 2匹だが見分けにくいためpittariを短い波毛・広い丸耳・横長の体に変更。数字札は保持 |
| 夜空 | hoshizora, tanabata, uchuu, nemurio, yofukashi, mayonaka, shingetsu | 紺灰の長毛、丸い目・頬と同程度の胴比率。hoshizora/tanabata/uchuuは星柄も重複 | hoshizora保持。tanabata=濃紺の短い波毛と大耳、uchuu=銀黒の短い毛と幅広体、nemurio=紺の巻き毛小耳、yofukashi=青灰の短毛大丸耳、mayonaka=青黒の滑らかな短毛、shingetsu=チャコールの粗い長毛と低い耳 |
| 紫黒 | yami, noroware, himitsu | 暗紫長毛、同じ輪郭と目位置 | yamiを保持、noroware=紫黒短いワイヤー毛で大耳、himitsu=銀紫の短い巻き毛と小丸耳 |
| 青灰猫種 | british-shorthair, russian-blue | 青灰単色、同程度の毛丈、丸顔と胴比率 | britishは密な毛と丸頬を強化、russianは大耳と細い顔、銀の毛先で差を強化。britishの肉球入りボタンも無地へ |
| ポイント猫種 | siamese-seal-point, tonkinese, birman, balinese, ragdoll, snowshoe | ポイント/白い胴、似た猫目と丸頬と胴比率 | ragdollとsnowshoeは白模様が異なるため保持。siamese=滑らかな極短毛と大耳、tonkinese=均一なミンクの短毛と中耳、birman=白手袋を強調し幅広頬、balinese=細い絹毛・大耳・細い顔。siameseの肉球入りボタンも無地へ |

## 初回で再描画不要と判定したもの

bengal, toyger, ocicat, abyssinian, singapura, exotic-shorthair, scottish-fold, cornish-rex, devon-rex, selkirk-rex, japanese-bobtail, ragamuffin, american-curl, american-shorthair, egyptian-mau, manx, bombay, hanbun, shirokuro, amayadori, bishonure, cameraman, uruu, country-02, country-03, country-04, country-05, country-09, country-10, country-100, world-marathon, ondo, yuugure, juuden, shinirimobby, hanakin, mangetsu, nikukyuu, gorogoro, pyonpyon, taiyou, hiruyoru, maboroshi-kuroneko, toumei。似た組のうち模様・毛丈・耳・表情の差が十分あるもの、または固有の全身配色を持つもの。最終再監査で再評価する。

## 試作と品質確認

試作順: A shikaku / tomodachizure、その後B ragdoll-seal-mitted / savannah / mike-neko。Bの3匹は指示書指定の質感確認用例外であり、B本番はA完了後。参照1=bengal、参照2=ragdoll。各生成プロンプトと原出力は別途記録。未生成を完了扱いしない。


## 試作の進捗

- tomodachizure: 採用。白ライラックの短毛、大耳、角形胴へ再描画。肩の顔なし猫ぬいぐるみと首輪を保持。new/manifest.json を更新済み。
- shikaku初稿: 不採用。白黒配色が manx / sakasama に近いため。比較用に prototype-shikaku-rejected.png に保存し、元ファイルは復元済み。次稿は淡いキャラメルの極短毛、横広の食パン型、小さく低い丸耳、琥珀目。
- ragdoll-seal-mitted: Bの質感確認用試作として採用。B本番はA完了後。
- prototype-vs-existing-36-01〜04.png: 試作3枚と既存36匹を合成。groups-*.pngは再描画前の監査資料として保持。
- 前回の停止理由: built-in image_gen HTTP 429 usage_limit_reached。サービス提示回復時刻は2026-10-25 21:30:37 JST。上限回復後、ユーザーの続行指示で再開。
- 未完了: Aの残りの再描画と最終再監査、Bの残り99匹。「同じ見た目は最大2匹」の達成はまだ検証していない。

初回保持判定の補足: hakubutsukan, hatsuhinode, ichiichi, ijike, omatsuri, ousama, sanbiki, shoku, zorome, uyu-mobby は初回では保持。最終再監査の対象には含める。

## 再開後の試作確定

指定5匹が揃い、既存36匹と並べて質感・型を目視確認した。shikaku再試作を採用し、元のキャラ案に合わせたキャラメル単色短毛・低い丸耳・四角い体に変更。savannah（d）は大きな耳と黒い斑点、mike-neko（j）は短毛の白黒橙と長い尾で採用。全5匹1254×1254 RGBA透過。mike-nekoのアルファ最大値は254（ほぼ不透明）であり、生成アルファを変更せず保存した。A採用2匹、B試作3匹。ここからA本番へ進む。

## 全136匹の再監査（2026-10-26）

初回計画74匹の再描画後、after/groups-*.png 全13枚（512px、3列）を目視。rea-mobby と同じ黒茶橙の長毛キジ三毛の反復は解消。近い組として hakubutsukan/cameraman、bishonure/amayadori、siberian/maine-coon、sakasama/manx、hoshizora/tanabata、british-shorthair/ouji を確認し、各組2匹まで。毛色が近くても、巻き毛/直毛、折れ耳/大耳、斑の配置、マズルと胴比率で差を確認した。

追加検出: juuden / shinirimobby / mangetsu の黄色い長毛・立ち耳・丸顔が3匹に残っていた。shinirimobby を淡いレモンの短い粗毛・小さい折れ耳・低い横広胴へ追加再描画する。Aはこの追加1匹の採用と再確認まで未完了。

余白: 一部生成は毛先や耳が端に寄るため、透明余白の機械的な統一についてユーザーへ確認中。承認前のPNG加工はしていない。

## A 描き分け完了（2026-10-26）

追加shinirimobbyを採用。黄色長毛のjuuden/mangetsuに対し、淡いレモン短毛・小折れ耳・ミント目・低い横広体で分離した。初回74匹＋再監査追加1匹＝75匹を元ファイル名のまま再描画。全136匹の目視再監査で、同じ見た目の組は最大2匹までと判定した。after/は追加前の全件比較、追加後のshinirimobbyはregenerated一覧とaccepted記録で確認できる。Aの識別性の作業を終え、B本番へ移る。全画像共通の余白仕上げは別途確認待ち。

## B 85種追加後の全221匹比較（2026-10-26・未完了）

combined/groups-*.pngの全20枚を512px・3列で目視。a〜h各10種とiの4種、jの指定試作1種を保存。Bの制作中修正は9種（短尾4、eの3、hの2）を採用済み。i残り6種は生成の利用上限で失敗し、j残り9種は未着手。解除予定は2026-10-26 21:37日本時間。生成失敗はdrafts-batch-i.json、再開順と詳細方針はresume-state.jsonに保存。

Bを加えた全体では、次の6組・Bの9種に追加修正が必要。全236匹の最終合格とはしていない。ID・名前・指定毛色は維持し、耳・顔・体型・模様の強さで分離する。

| 組 | 近いID | 修正するBのIDと方針 |
| --- | --- | --- |
| 灰単色短毛 | british-shorthair, russian-blue, chartreux, korat | chartreuxは小耳・低い横広頬・密な毛、koratはハート型の顔・大耳・縦長四角胴 |
| 銀タビー長毛 | maine-coon, siberian, maine-coon-silver-tabby, norwegian-forest-silver-tabby | B2種をさらに分離。メインクーンは長い四角いマズル・大きな房耳・高い胴、ノルウェージャンは三角顔・中耳・低い幅広胴・流れる毛 |
| 茶ポイント白手袋長毛 | birman, ragdoll-seal-mitted, birman-chocolate-point | birman-chocolate-pointは小丸耳・丸いローマンノーズ・低い胴。チョコ色・白手袋・青目は維持 |
| 茶タビー短毛 | dragon-li, american-shorthair-brown-tabby, bengal-marble | bengal-marbleの横方向に流れる大きなマーブル模様、低い耳、幅広マズルを強調 |
| 茶斑点短毛 | ocicat, bengal, egyptian-mau-bronze, australian-mist | Mauは大耳・角張った顔・高い胴、Mistは薄く霞む模様・小丸耳・幅広顔 |
| 三毛短毛 | japanese-bobtail, mike-neko, american-shorthair-calico | american-shorthair-calicoは大きな頬・小耳・横広胴・非対称の大斑へ |

その他、銀斑点のegyptian-mau/bengal-silver、淡クリーム大耳のarabian-mau/abyssinian-fawn等の近い2匹組は、残り15種追加後に再照合する。共通の透明余白仕上げも未完了。コード/UI画像の変更はない。

## 透明余白の統一（ユーザー承認後）

ユーザーが機械処理による余白統一を明示承認。生成済みA75匹・B85匹の計160枚を、元生成キャンバス全体の縦横比を保って1054×1054へ縮小し、1254×1254の透明キャンバスの(100,100)へ配置。切り抜き・毛色変更・顔や描画の変更は行わない。元生成ファイルとそのSHA256を保持し、繰り返し取込でも元から一度だけ縮小する。四辺の完全透明余白100px以上・寸法・ハッシュを検証。manifest、採用記録、一覧画像は処理後に更新。未変更の既存61匹には適用していない。B残り15種と識別性追加修正9種は画像生成上限のため引き続き未完了。

# 制作の現在地

- ブランチ: codex/new-mobbies-2
- A: 初回136匹監査、再描画採用 75匹。初回計画の未生成 0匹。A内の識別性再監査は完了。B追加後の比較はsimilarity.mdを参照。
- B: 指定試作3匹を含め採用 85/100匹。残り 15匹。B本番はA完了後。
- 生成: built-in image_gen。採用画像すべて1254×1254 RGBA。ユーザー承認により元画像を1054×1054へ等比縮小し、透明キャンバス中央へ配置（四辺100px以上）。元生成ファイルは保持。
- QA: 各accepted JSONの目視記録とvalidation、progress.jsonの機械検品結果を参照。
- コード/UI画像の変更なし。初回資料groups-*.pngは再描画前の記録として固定。
- 現在の制約: 画像生成の利用上限により停止中。解除予定: 2026-10-26T21:37:00+09:00。未生成15種と、全体比較で追加修正が必要なBの9種はresume-state.jsonを参照。

## A 採用済み

aotsuki, asa, balinese, birman, bouken-ou, british-shorthair, bunshin, burmese, chokotto, collector, country-01, country-06, country-07, country-08, country-20, country-30, country-50, country-75, denchigire, genkai, halloween, hatsuyuki, havana-brown, himitsu, hinata, hisashiburi, hodohodo, hyakunin, issei-nenne, juunyan, kikan, lucky, maine-coon, mainichi, mantan, mayonaka, mushoku, nebosuke, nekonohi, nemurio, noroware, norwegian-forest, nyannyan, nyanpo, oiwai, osanpo, ouji, persian, pittari, russian-blue, sakura, samishigari, santa, shachou, shikaku, shingetsu, shinirimobby, shitsukoi, siamese-seal-point, siberian, somali, tanabata, tanjoubi, tekuteku, tomodachizure, tonkinese, toshikoshi, traveling-mobby, tsuyu, turkish-angora, uchuu, usotsuki, world-traveler, yofukashi, yukidaruma

## A 初回計画の未完了



## 次の手順

B残り15種 → 全体比較で指摘された9種の修正 → 100件照合と全236匹の比較 → 最終検品。余白統一は生成済み全件に適用済みで、新規生成にも同じ処理を適用。

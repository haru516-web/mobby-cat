from pathlib import Path
p=Path('assets/cat-mobbies/review/similarity.md');s=p.read_text(encoding='utf-8').replace('状態: 初回監査完了、試作生成中。Aの再描画と最終再監査、Bの100匹は未完了。','状態: 初回監査と指定5匹の試作比較を完了。A本番の再描画中。A最終再監査とB本番は未完了。')
s+='\n## 再開後の試作確定\n\n指定5匹が揃い、既存36匹と並べて質感・型を目視確認した。shikaku再試作を採用し、元のキャラ案に合わせたキャラメル単色短毛・低い丸耳・四角い体に変更。savannah（d）は大きな耳と黒い斑点、mike-neko（j）は短毛の白黒橙と長い尾で採用。全5匹1254×1254 RGBA透過。mike-nekoのアルファ最大値は254（ほぼ不透明）であり、生成アルファを変更せず保存した。A採用2匹、B試作3匹。ここからA本番へ進む。\n'
p.write_text(s,encoding='utf-8')
p=Path('assets/cat-mobbies/breeds2/README.md');s=p.read_text(encoding='utf-8').replace('現在の採用: ragdoll-seal-mitted（f）','現在の採用3匹: savannah（d）、ragdoll-seal-mitted（f）、mike-neko（j）').replace('残り99匹','残り97匹').replace('アルファ最小0/最大255','アルファ最小0/最大254〜255');p.write_text(s,encoding='utf-8')

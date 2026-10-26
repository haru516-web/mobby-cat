"""Update records after the user's explicit mechanical-padding approval."""
import json,re
from pathlib import Path
review=Path('assets/cat-mobbies/review')
for path in review.glob('accepted-*.json'):
    r=json.loads(path.read_text(encoding='utf-8'))
    r['qa']=re.sub(r'(?i)(?:common )?padding(?: finish)? pending\.?','',r['qa']).strip()
    path.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path=review/'resume-state.json';r=json.loads(path.read_text(encoding='utf-8'))
r['commonPadding']='User approved mechanical proportional resizing and transparent centering; applied to all 160 saved generated assets. New assets use the same import policy.'
r['resume']='Generate remaining i6, then j9; revise nine B similarity candidates; importer applies approved 100px transparent padding; rebuild all236 visual audit; final validation and push.'
path.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path=review/'final-audit.json';r=json.loads(path.read_text(encoding='utf-8'));r['paddingFinish']='complete for 75 A and 85 B generated assets: user-approved whole-canvas proportional resize, 100px minimum transparent border'
path.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path=review/'similarity.md'
with path.open('a',encoding='utf-8') as f:
    f.write('\n## 透明余白の統一（ユーザー承認後）\n\nユーザーが機械処理による余白統一を明示承認。生成済みA75匹・B85匹の計160枚を、元生成キャンバス全体の縦横比を保って1054×1054へ縮小し、1254×1254の透明キャンバスの(100,100)へ配置。切り抜き・毛色変更・顔や描画の変更は行わない。元生成ファイルとそのSHA256を保持し、繰り返し取込でも元から一度だけ縮小する。四辺の完全透明余白100px以上・寸法・ハッシュを検証。manifest、採用記録、一覧画像は処理後に更新。未変更の既存61匹には適用していない。B残り15種と識別性追加修正9種は画像生成上限のため引き続き未完了。\n')

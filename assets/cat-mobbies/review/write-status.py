"""Write current progress summary and per-similarity-group prompt records."""
import json
from pathlib import Path
root=Path('assets/cat-mobbies');review=root/'review'
records=[json.loads(p.read_text(encoding='utf-8')) for p in review.glob('accepted-*.json')]
plan=json.loads((review/'regen-plan.json').read_text(encoding='utf-8'));hold={'rea-mobby','turkish-van','sakasama','kiseki','hoshizora','yami','ragdoll','snowshoe'}
a=[r for r in records if r.get('kind')!='breed'];b=[r for r in records if r.get('kind')=='breed'];done={r['id'] for r in a}
rejected_breed_ids={r['id'] for p in review.glob('rejected-breed-*.json') for r in json.loads(p.read_text(encoding='utf-8'))}
regenerated_breeds=len(rejected_breed_ids & {r['id'] for r in b})
resume_path=review/'resume-state.json'
resume=json.loads(resume_path.read_text(encoding='utf-8')) if resume_path.exists() and len(b)<100 else None
block_note=('画像生成の利用上限により停止中。解除予定: '+resume['resetAtJapan']+'。未生成15種と、全体比較で追加修正が必要なBの9種はresume-state.jsonを参照。') if resume else ''
pending=[id for g in plan for id in g['ids'] if id not in done|hold]
for i,g in enumerate(plan,1):
 parts=['# '+g['group']+' — regeneration prompts','Built-in image_gen. Reference1: characters/bengal.png; reference2: characters/ragdoll.png; reference3: original target.']
 for r in a:
  if r['id'] in g['ids']:parts+=['## '+r['id'],r['prompt'],'Reason: '+r['regenReason'],'QA: '+r['qa']]
 if len(parts)>2:(root/'provenance'/f'prompts-regen-group-{i:02}.md').write_text('\n\n'.join(parts)+'\n',encoding='utf-8')
summary=f'''# 制作の現在地

- ブランチ: codex/new-mobbies-2
- A: 初回136匹監査、再描画採用 {len(a)}匹。初回計画の未生成 {len(pending)}匹。A内の識別性再監査は完了。B追加後の比較はsimilarity.mdを参照。
- B: 指定試作3匹を含め採用 {len(b)}/100匹。残り {100-len(b)}匹。B本番はA完了後。
- 生成: built-in image_gen。採用画像すべて1254×1254 RGBA。ユーザー承認により元画像を1054×1054へ等比縮小し、透明キャンバス中央へ配置（四辺100px以上）。元生成ファイルは保持。
- QA: 各accepted JSONの目視記録とvalidation、progress.jsonの機械検品結果を参照。
- コード/UI画像の変更なし。初回資料groups-*.pngは再描画前の記録として固定。
- 現在の制約: {block_note}

## A 採用済み

{', '.join(sorted(done))}

## A 初回計画の未完了

{', '.join(pending)}

## 次の手順

B残り15種 → 全体比較で指摘された9種の修正 → 100件照合と全236匹の比較 → 最終検品。余白統一は生成済み全件に適用済みで、新規生成にも同じ処理を適用。
'''
(review/'STATUS.md').write_text(summary,encoding='utf-8')
(root/'breeds2/README.md').write_text(f'''# breeds2 — 制作途中

実在猫種・毛色100種のうち **{len(b)}匹生成・採用済み**、残り{100-len(b)}匹。B本番はA完了後。先行3匹は指示書指定の質感確認試作。

- 採用ID: {', '.join(sorted(r['id'] for r in b))}
- 形式: 1254×1254 RGBA透過PNG。ユーザー承認の等比縮小と透明中央配置を適用、四辺100px以上の透明余白。描画や配色は変更せず、元生成ファイルを保持。
- Bの再生成採用: {regenerated_breeds}匹（不採用理由はreview/rejected-breed-*.json）。
- manifest.jsonには実際に生成・検品できた画像のみ登録。
- previews/batch-*.pngは現在の採用分だけを合成した途中の一覧。
- プロンプト: ../provenance/prompts-breeds2-*.md
- 検品: レンズ以外の生体目1つ、十字キー1つ、無地丸ボタン2つ、小物なしを目視。寸法・アルファ・SHA256・bytesと固定ID/名前を機械検証。
- 全体の重複最終検査と100件完成検品は未完了。
- {block_note}

現在の詳細進捗は ../review/STATUS.md と ../review/progress.json を参照。
''',encoding='utf-8')
print(f'A {len(a)} accepted; {len(pending)} planned pending. B {len(b)}/100.')

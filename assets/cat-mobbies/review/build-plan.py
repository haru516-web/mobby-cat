from pathlib import Path
import json
p=Path('assets/cat-mobbies/review/similarity.md').read_text(encoding='utf-8'); groups=[]
for line in p.splitlines():
 if line.startswith('|'):
  row=[s.strip() for s in line.strip('|').split('|')]
  if len(row)==4 and row[0] not in ['グループ','---']:
   groups.append({'group':row[0],'ids':row[1].split(', '),'observations':row[2],'plan':row[3]})
idx=json.loads(Path('assets/cat-mobbies/review/audit-index.json').read_text()); allids={x['id'] for x in idx}
seen={i for g in groups for i in g['ids']}
print('grouped',len(seen),'ungrouped',len(allids-seen),'unknown',seen-allids)
print('ungrouped:',', '.join(sorted(allids-seen)))
Path('assets/cat-mobbies/review/regen-plan.json').write_text(json.dumps(groups,ensure_ascii=False,indent=2),encoding='utf-8')

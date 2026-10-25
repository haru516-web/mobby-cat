"""Validate generated asset records, fixed identities and scope against branch base."""
import json,hashlib,subprocess,re
from pathlib import Path
from PIL import Image
root=Path('assets/cat-mobbies');records=[json.loads(p.read_text(encoding='utf-8')) for p in (root/'review').glob('accepted-*.json')]
ids={r['id'] for r in records};assert len(ids)==len(records)
for rel in ['manifest.json','new/manifest.json']:
 path=root/rel;now=json.loads(path.read_text(encoding='utf-8'));old=json.loads(subprocess.check_output(['git','show','00114a8:'+path.as_posix()]))
 arr=now['characters'] if isinstance(now,dict) else now;prev=old['characters'] if isinstance(old,dict) else old
 assert len(arr)==len(prev)
 for e,o in zip(arr,prev):
  for k in ['id','name','file','condition']:
   assert e.get(k)==o.get(k),(e['id'],k)
  if e['id'] not in ids:assert e==o,e['id']
  else:assert e.get('regen') is True and e.get('regenReason')
listtext=Path('docs/codex/BREEDS_100_LIST.md').read_text(encoding='utf-8');specs={}
for row in listtext.splitlines():
 cols=[c.strip() for c in row.strip('|').split('|')]
 if row.startswith('| ') and len(cols)==3 and cols[0] not in ['ID','---']:specs[cols[0]]=cols[1]
assert len(specs)==100
for e in json.loads((root/'breeds2/manifest.json').read_text(encoding='utf-8')):assert specs[e['id']]==e['name'];assert e['batch'] in 'abcdefghij' and e['kind']=='breed'
for r in records:
 p=Path(r['target']);im=Image.open(p);assert im.size==(1254,1254) and im.mode=='RGBA';lo,hi=im.getchannel('A').getextrema();assert lo==0 and hi>=250
 v=r['validation'];assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'] and p.stat().st_size==v['bytes']
changed=subprocess.check_output(['git','diff','00114a8','--name-only'],text=True).splitlines();assert all(p.startswith(('assets/cat-mobbies/','docs/codex/')) for p in changed)
a=[r for r in records if r.get('kind')!='breed'];b=[r for r in records if r.get('kind')=='breed']
report={'aAccepted':len(a),'aIds':sorted(r['id'] for r in a),'bAccepted':len(b),'bRemaining':100-len(b),'bIds':sorted(r['id'] for r in b),'scopeCheck':'passed: only cat assets and records','hashDimensionAlphaIdentityChecks':'passed','visualQA':'per accepted record; A similarity re-audit passed 2026-10-26; common padding finish pending'}
(root/'review/progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

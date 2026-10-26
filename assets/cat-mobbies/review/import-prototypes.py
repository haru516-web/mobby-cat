"""Import image_gen assets with explicitly approved proportional transparent padding."""
from pathlib import Path
import json,hashlib,shutil,math
from PIL import Image,ImageDraw,ImageFont
root=Path('assets/cat-mobbies');review=root/'review'
policy_path=review/'padding-policy.json'
policy=json.loads(policy_path.read_text(encoding='utf-8')) if policy_path.exists() else {}
newpath=root/'new/manifest.json';new=json.loads(newpath.read_text(encoding='utf-8'))
basepath=root/'manifest.json';base=json.loads(basepath.read_text(encoding='utf-8'));base_changed=False
breeds=[];regen=[];prov={};records=[]
for p in sorted(review.glob('accepted-*.json')):
 r=json.loads(p.read_text(encoding='utf-8'));dest=Path(r['target']);dest.parent.mkdir(parents=True,exist_ok=True)
 im=Image.open(r['source']);assert im.size==(1254,1254) and im.mode=='RGBA';extrema=im.getchannel('A').getextrema();assert extrema[0]==0 and extrema[1]>=250
 if policy.get('enabled'):
  size=policy['canvasSize'];inner=policy['innerSize'];offset=(size-inner)//2
  canvas=Image.new('RGBA',(size,size),(0,0,0,0))
  canvas.paste(im.resize((inner,inner),Image.Resampling.LANCZOS),(offset,offset))
  canvas.save(dest)
  r['postprocess']={'authorization':policy['authorization'],'originalSourceSha256':hashlib.sha256(Path(r['source']).read_bytes()).hexdigest(),'method':'whole-canvas proportional Lanczos resize and transparent centering','innerSize':[inner,inner],'offset':[offset,offset],'canvasSize':[size,size]}
  r['paddingQA']='Approved mechanical padding applied; minimum 100px transparent margins; source drawing retained without crop or recoloring.'
  im=canvas;extrema=im.getchannel('A').getextrema()
 else:shutil.copyfile(r['source'],dest)
 data=dest.read_bytes();sha=hashlib.sha256(data).hexdigest()
 if r.get('kind')=='breed':
  e={k:r[k] for k in ['id','name','batch','kind']};e.update(file=dest.as_posix(),width=1254,height=1254,bytes=len(data),sha256=sha,status='concept',prompt=r['prompt']);breeds.append(e)
  prov.setdefault(r['batch'],[]).append('## '+r['id']+' — '+r['name']+'\n\n'+r['prompt']+'\n\nQA: '+r['qa'])
 else:
  arr=base['characters'] if '/characters/' in r['target'] else new
  e=next(x for x in arr if x['id']==r['id']);e.update(sha256=sha,bytes=len(data),prompt=r['prompt'],regen=True,regenReason=r['regenReason'])
  if arr is base['characters']:base_changed=True;e['buttonStyle']='plain-round'
  regen.append('## '+r['id']+'\n\n'+r['prompt']+'\n\nReason: '+r['regenReason']+'\n\nQA: '+r['qa'])
 r['validation']={'width':1254,'height':1254,'mode':im.mode,'alphaExtrema':list(extrema),'bytes':len(data),'sha256':sha};p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');records.append(r)
newpath.write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if base_changed:basepath.write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'breeds2/manifest.json').write_text(json.dumps(sorted(breeds,key=lambda x:(x['batch'],x['id'])),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
header='Built-in image_gen. Reference 1: characters/bengal.png; reference 2: characters/ragdoll.png. A edits also use original target as reference 3.\n\n'
(root/'provenance/prompts-regen-prototypes.md').write_text('# A regeneration records\n\n'+header+'\n\n'.join(regen)+'\n',encoding='utf-8')
for batch,parts in prov.items():(root/'provenance'/f'prompts-breeds2-{batch}.md').write_text('# Breeds2 batch '+batch+' — in progress\n\n'+header+'\n\n'.join(parts)+'\n',encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
def sheet(entries,path,rows=4):
 canvas=Image.new('RGB',(1536,rows*552),(225,228,231));d=ImageDraw.Draw(canvas)
 for i,(name,p) in enumerate(entries):
  im=Image.open(p).convert('RGBA');im.thumbnail((492,492));x=i%3*512+(512-im.width)//2;y=i//3*552;canvas.paste(im,(x,y),im);d.text((i%3*512+12,y+510),name,font=font,fill='black')
 path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path)
prototypeids=['shikaku','tomodachizure','ragdoll-seal-mitted','savannah','mike-neko']
entries=[('TRIAL: '+r['id'],Path(r['target'])) for id in prototypeids for r in records if r['id']==id]+[(e['id'],root/e['file']) for e in base['characters']]
for page in range(math.ceil(len(entries)/12)):sheet(entries[page*12:(page+1)*12],review/f'prototype-vs-existing-36-{page+1:02}.png')
for batch in prov:
 entries=[(e['id'],Path(e['file'])) for e in breeds if e['batch']==batch];sheet(entries,root/f'breeds2/previews/batch-{batch}.png',math.ceil(len(entries)/3))
a=[r for r in records if r.get('kind')!='breed']
for page in range(math.ceil(len(a)/12)):sheet([(r['id'],Path(r['target'])) for r in a[page*12:(page+1)*12]],review/f'regenerated-{page+1:02}.png')
print(f'Imported {len(a)} A replacements and {len(breeds)} B images; 1254x1254 RGBA alpha verified.')


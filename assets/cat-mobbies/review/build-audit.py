import json, colorsys, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path('assets/cat-mobbies'); out=root/'review';out.mkdir(exist_ok=True)
a=json.loads((root/'manifest.json').read_text(encoding='utf-8'))['characters']; b=json.loads((root/'new/manifest.json').read_text(encoding='utf-8'))
items=[]
for e in a+b:
 p=Path(e['file']) if e['file'].startswith('assets/') else root/e['file']
 im=Image.open(p).convert('RGBA'); sm=im.resize((64,64)); pix=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,alpha in sm.getdata() if alpha>200]
 warm=sum(s>.2 and (h<.16 or h>.95) for h,s,v in pix)/len(pix); val=sum(v for h,s,v in pix)/len(pix)
 group='warm' if warm>.28 else 'light' if val>.68 else 'dark' if val<.35 else 'grey-color'
 items.append({'id':e['id'],'path':str(p),'group':group,'warm':round(warm,3),'value':round(val,3)})
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for group in ['warm','light','dark','grey-color']:
 selected=sorted([e for e in items if e['group']==group],key=lambda e:e['value'])
 for page in range(math.ceil(len(selected)/12)):
  part=selected[page*12:(page+1)*12]; canvas=Image.new('RGB',(1536,4*552),(225,228,231));d=ImageDraw.Draw(canvas)
  for i,e in enumerate(part):
   im=Image.open(e['path']).convert('RGBA');im.thumbnail((492,492));x=(i%3)*512+(512-im.width)//2;y=(i//3)*552
   canvas.paste(im,(x,y),im);d.text(((i%3)*512+12,y+510),e['id'],font=font,fill='black')
  canvas.save(out/f'groups-{group}-{page+1:02}.png')
(out/'audit-index.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
print({g:sum(x['group']==g for x in items) for g in set(x['group'] for x in items)})

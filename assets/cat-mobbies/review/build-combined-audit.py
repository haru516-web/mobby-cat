"""Build review sheets for all original and breeds2 assets without editing PNGs.

Colour statistics only order the visual review; they do not certify similarity.
"""
import colorsys,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

root=Path('assets/cat-mobbies')
out=root/'review'/'combined'
out.mkdir(exist_ok=True)
base=json.loads((root/'manifest.json').read_text(encoding='utf-8'))['characters']
new=json.loads((root/'new/manifest.json').read_text(encoding='utf-8'))
breeds=json.loads((root/'breeds2/manifest.json').read_text(encoding='utf-8'))
items=[]
for e in base+new+breeds:
    p=Path(e['file']) if e['file'].startswith('assets/') else root/e['file']
    im=Image.open(p).convert('RGBA')
    pixels=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,a in im.resize((64,64)).getdata() if a>200]
    warm=sum(s>.2 and (h<.16 or h>.95) for h,s,v in pixels)/len(pixels)
    value=sum(v for h,s,v in pixels)/len(pixels)
    group='warm' if warm>.28 else 'light' if value>.68 else 'dark' if value<.35 else 'grey-color'
    items.append(dict(id=e['id'],path=p.as_posix(),group=group,warm=round(warm,3),value=round(value,3)))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for group in ['warm','light','dark','grey-color']:
    selected=sorted((x for x in items if x['group']==group),key=lambda x:(x['value'],x['warm']))
    for page in range(math.ceil(len(selected)/12)):
        canvas=Image.new('RGB',(1536,2208),(225,228,231));draw=ImageDraw.Draw(canvas)
        for i,e in enumerate(selected[page*12:(page+1)*12]):
            im=Image.open(e['path']).convert('RGBA');im.thumbnail((492,492))
            x=i%3*512+(512-im.width)//2;y=i//3*552
            canvas.paste(im,(x,y),im);draw.text((i%3*512+12,y+510),e['id'],font=font,fill='black')
        canvas.save(out/f'groups-{group}-{page+1:02}.png')
(out/'audit-index.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Combined visual review sheets: {len(items)} assets; breeds2 {len(breeds)}/100')

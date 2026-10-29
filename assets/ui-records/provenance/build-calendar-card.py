"""Reproduce asset normalization, manifest entries and composited reviews from built-in generations."""
from pathlib import Path
import json, hashlib, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
UI = ROOT / 'app/assets/ui'
REC = ROOT / 'assets/ui-records'
SRC = Path('C:/Users/User/.codex/generated_images/01a186fd-044b-7c53-9d9e-8c91a7ba64b3')
FILES = ['exec-be573a7a-67a2-4c84-973d-7aa953b9f1b4.png', 'exec-28545d1d-0bb7-48fe-a2b2-ed8e7d405155.png', 'exec-4ef672a6-1196-41ce-8686-30a6000cba89.png', 'exec-385adb90-1e93-41fa-9393-62c3e46dfa3a.png']
SPECS = [('login/calendar-base.png',1000,960,(190,90,90,90)), ('login/calendar-weekbar.png',840,72,(0,36,0,36)), ('home/upcoming-card.png',720,200,(70,70,70,70)), ('home/upcoming-well.png',192,192,(56,56,56,56))]
L = Image.Resampling.LANCZOS

def nine(im, size, sl, outsl=None):
    t,r,b,l = sl
    ot,orr,ob,ol = outsl or sl
    sx=[0,l,im.width-r,im.width]; sy=[0,t,im.height-b,im.height]
    dx=[0,ol,size[0]-orr,size[0]]; dy=[0,ot,size[1]-ob,size[1]]
    out=Image.new('RGBA',size)
    for y in range(3):
        for x in range(3):
            if sx[x+1]>sx[x] and sy[y+1]>sy[y] and dx[x+1]>dx[x] and dy[y+1]>dy[y]:
                p=im.crop((sx[x],sy[y],sx[x+1],sy[y+1])).resize((dx[x+1]-dx[x],dy[y+1]-dy[y]),L)
                out.paste(p,(dx[x],dy[y]))
    return out

prompts=json.loads((REC/'provenance/calendar-card-prompts.json').read_text())
manifest=json.loads((UI/'manifest.json').read_text(encoding='utf-8-sig'))
sources=[]
for i,(path,w,h,sl) in enumerate(SPECS):
    raw=SRC/FILES[i]
    im=Image.open(raw).convert('RGBA')
    box=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
    im=im.crop(box)
    if i==0:
        # Compress only header band to end at y=190; retain blank body below it.
        cut=round(im.height*0.224)
        out=Image.new('RGBA',(w,h))
        out.paste(im.crop((0,0,im.width,cut)).resize((w,190),L),(0,0))
        out.paste(im.crop((0,cut,im.width,im.height)).resize((w,h-190),L),(0,190))
        processing='Alpha>8 bounding trim; piecewise Lanczos header/body fit: header ends at y190; original alpha preserved; no EXIF.'
    elif i==1:
        cap=im.height//2
        out=nine(im,(w,h),(0,cap,0,cap),(0,36,0,36))
        processing='Alpha>8 bounding trim; cap-preserving horizontal stretch to840x72, source semicircle caps mapped to36px; generated alpha preserved; no EXIF.'
    elif i==2:
        cap=round(im.height*0.35)
        out=nine(im,(w,h),(cap,cap,cap,cap),sl)
        processing='Alpha>8 bounding trim; corner-preserving nine-slice normalization to720x200 with70px fixed corners; generated alpha preserved; no EXIF.'
    else:
        out=im.resize((w-8,h-8),L)
        canvas=Image.new('RGBA',(w,h)); canvas.paste(out,(4,4)); out=canvas
        processing='Alpha>8 bounding trim; Lanczos fit to184x184 with4px clearance on192x192; generated alpha preserved; no EXIF.'
    dest=UI/path; dest.parent.mkdir(parents=True,exist_ok=True); out.save(dest)
    entry=dict(path=path,width=w,height=h,prompt=prompts[i],method='built-in image_gen',processing=processing,slice=dict(zip(['top','right','bottom','left'],sl)),sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,alphaMode='transparent')
    if i==1: entry['stretchAxes']=['x']
    manifest['assets']=[a for a in manifest['assets'] if a['path']!=path]+[entry]
    sources.append(dict(path=path,source=FILES[i],sourceSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),crop=list(box)))
manifest['assets'].sort(key=lambda a:a['path'])
manifest['assetCount']=len(manifest['assets'])
manifest['counts']={k:sum(a['path'].split('/')[0]==k for a in manifest['assets']) for k in sorted({a['path'].split('/')[0] for a in manifest['assets']})}
(UI/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def font(n): return ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc',n)
def place(dst,path,xy,size=None):
    im=Image.open(UI/path).convert('RGBA')
    if size: im=im.resize(size,L)
    dst.alpha_composite(im,xy)

prev=REC/'previews'; prev.mkdir(exist_ok=True)
cal=Image.new('RGBA',(1080,1040),'#e9dfd1'); place(cal,SPECS[0][0],(40,40))
d=ImageDraw.Draw(cal); d.text((540,172),'2026年 10月',font=font(40),fill='#4A3B32',anchor='mm')
place(cal,SPECS[1][0],(120,250))
for col,label in enumerate('日月火水木金土'):
    d.text((180+col*120,284),label,font=font(26),fill='#8d6246',anchor='mm')
cells=['empty','stamped','today','bonus']
for row in range(5):
    for col in range(7):
        n=row*7+col
        place(cal,'login/cell-'+cells[n%4]+'.png',(124+120*col,340+120*row),(112,112))
        if n<31: d.text((143+120*col,350+120*row),str(n+1),font=font(22),fill='#4A3B32')
cal.convert('RGB').save(prev/'calendar-card-calendar.png')

# 3x composition:290x98pt card and64pt well on the actual home background.
bg=Image.open(UI/'bg/room-home-full.png').convert('RGBA')
home=bg.resize((1179,2556),L)
x,y=48,2020
home.alpha_composite(nine(Image.open(UI/SPECS[2][0]),(870,294),SPECS[2][3]),(x,y))
home.alpha_composite(nine(Image.open(UI/SPECS[3][0]),(192,192),SPECS[3][3]),(x+30,y+51))
cat=Image.open(ROOT/'app/assets/cats/abyssinian.webp').convert('RGBA'); cat.thumbnail((180,180),L)
home.alpha_composite(cat,(x+36+(180-cat.width)//2,y+57+(180-cat.height)//2))
d=ImageDraw.Draw(home)
for j,line in enumerate(['あしたに出会えるかも','しれないにゃこモビー！？']):
    d.text((x+246,y+88+j*51),line,font=font(35),fill='#4A3B32')
d.text((x+810,y+147),'›',font=font(60),fill='#8d6246',anchor='mm')
home.convert('RGB').save(prev/'calendar-card-home.png')

# Stress sheet includes required5-row and optional6-row/stretch cases.
sheet=Image.new('RGBA',(1600,1200),'#d8cfbf')
sheet.alpha_composite(nine(Image.open(UI/SPECS[0][0]),(660,1000),SPECS[0][3]),(20,20))
for row in range(6):
    for col in range(7):
        place(sheet,'login/cell-'+cells[(row*7+col)%4]+'.png',(82+col*78,270+row*108),(74,98))
sheet.alpha_composite(nine(Image.open(UI/SPECS[2][0]),(870,294),SPECS[2][3]),(710,40))
sheet.alpha_composite(nine(Image.open(UI/SPECS[1][0]),(700,72),SPECS[1][3]),(710,410))
sheet.alpha_composite(nine(Image.open(UI/SPECS[3][0]),(280,280),SPECS[3][3]),(720,550))
sheet.convert('RGB').save(prev/'calendar-card-stretch.png')
validation=[]
for path,w,h,sl in SPECS:
    p=UI/path; im=Image.open(p)
    assert im.size==(w,h) and im.mode=='RGBA'
    assert im.getchannel('A').getextrema()==(0,255)
    assert sl[0]+sl[2]<h and sl[1]+sl[3]<w
    validation.append(dict(path=path,size=list(im.size),alphaExtrema=list(im.getchannel('A').getextrema()),slice=dict(zip(['top','right','bottom','left'],sl)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
for name in cells:
    path='app/assets/ui/login/cell-'+name+'.png'
    original=subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)
    assert original==(ROOT/path).read_bytes(),path
(REC/'provenance/calendar-card-validation.json').write_text(json.dumps(dict(sources=sources,assets=validation,existingCellsUnchanged=True,previewCardPt=[290,98],previewWellPt=[64,64]),indent=2)+'\n')
print('Validated4 RGBA assets;4 existing cells unchanged;3 previews generated.')

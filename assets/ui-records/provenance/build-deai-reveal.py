"""Reproduce size/alpha normalization, manifest metadata and review composites.
All artwork and badge lettering originate from built-in image_gen; Pillow only
resizes, normalizes opacity, and composites existing images for review.
"""
from pathlib import Path
import hashlib, json
from collections import Counter
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
RECORDS = ROOT / 'assets/ui-records'
UI = ROOT / 'app/assets/ui'
JOBS = json.loads((RECORDS/'provenance/deai-reveal-jobs.json').read_text(encoding='utf-8'))
L = Image.Resampling.LANCZOS

def load(path):
    return Image.open(path).convert('RGBA')

def fit(im, size):
    im = ImageOps.contain(im, size, L)
    out = Image.new('RGBA', size)
    out.alpha_composite(im, ((size[0]-im.width)//2, (size[1]-im.height)//2))
    return out

manifest_path = UI/'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
validation = []
for job in JOBS:
    im = load(job['source'])
    size = (job['width'], job['height'])
    if job['key'] == 'dim':
        im = im.resize(size, L)
        # Full-screen scrim must cover every pixel with 70-80% opacity.
        im.putalpha(im.getchannel('A').point(lambda a: 179 + round(a*25/255)))
        processing = 'Resize generated full-bleed scrim to 1179x2556 with Lanczos; normalize generated alpha to 179..204 (70.2..80%); preserve generated RGB; strip metadata.'
    else:
        bounds = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        im = im.crop(bounds)
        if job['key'] in ('normal','rare','legend','world'):
            # Identical occupied canvas and padding for the four fixed-size labels.
            im = im.resize((232,72), L)
            out = Image.new('RGBA', size)
            out.alpha_composite(im, (4,4))
            im = out
            processing = 'Trim alpha>24 bounds; normalize rounded badge artwork to 232x72 within a 240x80 transparent canvas with 4px padding; Lanczos; generated lettering and alpha retained; no slice; strip metadata.'
        else:
            pad = 12 if job['key']=='mystery' else 24
            im = fit(im, (size[0]-pad*2,size[1]-pad*2))
            out = Image.new('RGBA', size)
            out.alpha_composite(im, (pad,pad))
            im = out
            processing = f'Trim alpha>24 bounds; proportionate Lanczos fit with {pad}px minimum clearance; generated alpha retained; strip metadata.'
    dest = UI/job['path']
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, optimize=True)
    entry = dict(path=job['path'], width=size[0], height=size[1], prompt=job['prompt'], method='built-in image_gen', processing=processing, sha256=hashlib.sha256(dest.read_bytes()).hexdigest(), bytes=dest.stat().st_size, alphaMode='semi-transparent' if job['key']=='dim' else 'transparent')
    if job['key'] == 'dim':
        entry['slice'] = dict(top=0, right=0, bottom=0, left=0)
        entry['stretchAxes'] = ['x', 'y']
    manifest['assets'] = [a for a in manifest['assets'] if a['path']!=job['path']]+[entry]
    alpha = im.getchannel('A').getextrema()
    assert im.size == size and im.mode == 'RGBA'
    assert (179 <= alpha[0] <= alpha[1] <= 204) if job['key']=='dim' else alpha[0]==0
    validation.append(dict(path=job['path'], size=list(size), alphaExtrema=list(alpha), sha256=entry['sha256'], bytes=entry['bytes'], sourceSha256=hashlib.sha256(Path(job['source']).read_bytes()).hexdigest()))
manifest['assets'].sort(key=lambda a:a['path'])
manifest['assetCount'] = len(manifest['assets'])
manifest['counts'] = dict(sorted(Counter(a['path'].split('/')[0] for a in manifest['assets']).items()))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(RECORDS/'provenance/deai-reveal-validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')

if len(JOBS) == 8:
    previews = RECORDS/'previews'
    previews.mkdir(exist_ok=True)
    font = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',18)
    def paste(canvas, im, box):
        im = fit(im, (box[2],box[3]))
        canvas.alpha_composite(im, (box[0],box[1]))
    # Actual 66x22 point labels at 1x and enlarged 3x for inspection.
    labels = Image.new('RGBA',(780,300),'#EADCCB')
    draw = ImageDraw.Draw(labels)
    draw.text((18,10),'66 x 22 pt / 1x',font=font,fill='#4A3B32')
    card = load(UI/'panel/card-white.png')
    for i,k in enumerate(('normal','rare','legend','world')):
        badge = load(UI/f'badge/label-{k}.png')
        paste(labels,card,(15+i*190,44,180,230))
        labels.alpha_composite(badge.resize((66,22),L),(72+i*190,64))
        paste(labels,badge,(28+i*190,144,156,52))
    labels.convert('RGB').save(previews/'deai-reveal-badges.png')
    bg = load(UI/'bg/room-deai-full.png')
    scene = bg.resize((1179,2556),L)
    cats = [load(ROOT/'app/assets/cats/abyssinian.webp'),load(ROOT/'app/assets/cats/american-shorthair.webp')]
    mystery = load(UI/'deai/mystery-cat.png')
    for i in range(6):
        x,y = 42+(i%3)*374,650+(i//3)*590
        paste(scene,card,(x,y,346,525))
        paste(scene,cats[i] if i<2 else mystery,(x+18,y+105,310,330))
        paste(scene,load(UI/f'badge/label-{("normal","rare","legend","world","normal","rare")[i]}.png'),(x+53,y+35,240,80))
    scene.resize((590,1278),L).convert('RGB').save(previews/'deai-reveal-candidates.png')
    panels=[]
    for state in range(3):
        panel=bg.copy()
        panel.alpha_composite(load(UI/'deai/reveal-dim.png'))
        if state==0:
            paste(panel,mystery,(245,1000,689,689))
        elif state==1:
            paste(panel,load(UI/'deai/reveal-burst.png'),(45,800,1089,1089))
            paste(panel,cats[0],(245,1000,689,689))
        else:
            paste(panel,load(UI/'deai/reveal-rays.png'),(0,750,1179,1179))
            paste(panel,cats[0],(245,1000,689,689))
        panels.append(panel.resize((393,852),L))
    strip=Image.new('RGBA',(1179,900),'#FFF8F0')
    draw=ImageDraw.Draw(strip)
    for i,panel in enumerate(panels):
        strip.alpha_composite(panel,(i*393,48))
        draw.text((i*393+16,12),('未開封 / 暗幕','光の輪 / 正体が出る瞬間','光の筋 / ひらいた後')[i],font=font,fill='#4A3B32')
    strip.convert('RGB').save(previews/'deai-reveal-sequence.png')
print(json.dumps(validation,indent=2))

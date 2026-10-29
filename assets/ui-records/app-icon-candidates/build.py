"""Rebuild four background-only candidates from the shared generated foreground."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
import hashlib, json

ROOT = Path(__file__).resolve().parent
N = 1024
fg = Image.open(ROOT / 'foreground.png').convert('RGBA')
# Remove only strongly saturated red/yellow contamination near transparent edges.
pixels = np.array(fg)
alpha = pixels[:,:,3]
edge = np.array(fg.getchannel('A').filter(ImageFilter.MinFilter(15))) < 240
red = (pixels[:,:,0]>180)&(pixels[:,:,1]<100)&(pixels[:,:,2]<100)
yellow = (pixels[:,:,0]>170)&(pixels[:,:,1]>150)&(pixels[:,:,2]<100)
pixels[:,:,3][edge & (red|yellow)] = 0
fg = Image.fromarray(pixels)
fg = fg.crop(fg.getbbox())
fg.thumbnail((820, 778), Image.Resampling.LANCZOS)
x, y = (N-fg.width)//2, (N-fg.height)//2
Y, X = np.mgrid[:N, :N]
def gradient(t, a, b):
    a, b = np.array(a), np.array(b)
    return Image.fromarray(np.uint8(np.clip(a+(b-a)*t[..., None],0,255))).convert('RGBA')

shadow = Image.new('RGBA',(N,N))
ImageDraw.Draw(shadow).ellipse((300,y+fg.height-22,724,y+fg.height+20),fill=(74,59,50,35))
shadow = shadow.filter(ImageFilter.GaussianBlur(17))
records = []
for key in 'abcd':
    if key == 'a':
        bg = gradient(Y/1023,(246,160,60),(240,138,93))
    elif key == 'b':
        t = np.minimum(1,np.sqrt(((X-512)/724)**2+((Y-470)/724)**2))
        bg = gradient(t,(250,177,85),(242,139,32))
    else:
        bg = Image.new('RGBA',(N,N),(242,139,32,255))
        overlay = Image.new('RGBA',(N,N))
        d = ImageDraw.Draw(overlay)
        if key == 'c':
            d.ellipse((128,128,896,896), fill=(255,248,240,89))
        else:
            for cx,cy,s in [(145,170,23),(855,160,28),(115,500,25),(900,460,24),(155,830,28),(850,845,25),(500,80,18),(510,950,18)]:
                color=(210,113,28,65)
                d.ellipse((cx-s,cy,cx+s,cy+s*1.5),fill=color)
                for dx,dy in [(-1,-.4),(-.35,-.95),(.4,-.95),(1,-.4)]:
                    px,py=cx+dx*s,cy+dy*s
                    d.ellipse((px-s*.32,py-s*.43,px+s*.32,py+s*.43),fill=color)
        bg = Image.alpha_composite(bg,overlay)
    bg = Image.alpha_composite(bg,shadow)
    bg.alpha_composite(fg,(x,y))
    path = ROOT / f'icon-{key}.png'
    bg.convert('RGB').save(path)
    records.append({'path':path.name,'size':[1024,1024],'mode':'RGB','sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

# Each row preserves the actual pixel sizes, including the 1024px source.
sheet = Image.new('RGB',(1700,4*1100),(245,242,237))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for row,key in enumerate('abcd'):
    top=row*1100
    draw.text((24,top+12),f'{key.upper()}     1024px',font=font,fill=(74,59,50))
    im=Image.open(ROOT/f'icon-{key}.png')
    sheet.paste(im,(24,top+52))
    for size,px,py in [(180,1080,52),(120,1300,52),(60,1460,52),(180,1080,320)]:
        small=im.resize((size,size),Image.Resampling.LANCZOS)
        if py==320:
            mask=Image.new('L',(size*4,size*4))
            ImageDraw.Draw(mask).rounded_rectangle((0,0,size*4-1,size*4-1),radius=40*4,fill=255)
            sheet.paste(small,(px,top+py),mask.resize((size,size),Image.Resampling.LANCZOS))
        else:
            sheet.paste(small,(px,top+py))
        draw.text((px,top+py+size+8),f'{size}px'+(' rounded' if py==320 else ''),font=font,fill=(74,59,50))
sheet.save(ROOT/'contact-sheet.png')
(ROOT/'audit.json').write_text(json.dumps({'foreground_box':[x,y,x+fg.width,y+fg.height],'height_ratio':fg.height/1024,'files':records},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'foreground_box':[x,y,x+fg.width,y+fg.height],'files':records},indent=2))

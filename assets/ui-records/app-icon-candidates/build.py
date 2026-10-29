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
        # Fourteen broad alternating sectors, softened into cream at the center.
        sector = (np.floor((np.arctan2(Y-512,X-512)+np.pi)*14/(2*np.pi)).astype(int)%2)
        colors = np.array([(242,139,32),(246,160,60)])
        base = colors[sector].astype(float)
        radius = np.sqrt((X-512)**2+(Y-512)**2)
        light = .97*np.exp(-(radius/465)**4)
        bg = Image.fromarray(np.uint8(base*(1-light[...,None])+np.array([255,248,240])*light[...,None])).convert('RGBA')
    elif key == 'b':
        bg = gradient(Y/1023,(240,138,93),(242,139,32))
        mask = Image.new('L',(N,N))
        md = ImageDraw.Draw(mask)
        # 716px wide, 870px tall, semicircular top.
        md.ellipse((154,77,870,793),fill=255)
        md.rectangle((154,435,870,947),fill=255)
        window = gradient(Y/1023,(255,239,197),(255,248,240))
        bg.paste(window,(0,0),mask)
        border = Image.new('L',(N,N))
        bd = ImageDraw.Draw(border)
        bd.arc((154,77,870,793),180,360,fill=255,width=4)
        bd.line([(154,435),(154,947),(870,947),(870,435)],fill=255,width=4)
        bg.paste((246,183,119,255),(0,0,N,N),border)
    elif key == 'c':
        bg = gradient(Y/1023,(255,217,190),(240,138,93))
        d = ImageDraw.Draw(bg)
        # Upper half of a 666px sun; horizon is 40% above bottom.
        d.pieslice((67,281,733,947),180,360,fill=(255,248,240,255))
        # A broad, quiet foreground plane establishes the horizon.
        ground = gradient(Y/1023,(250,176,125),(240,138,93))
        bg.paste(ground.crop((0,614,N,N)),(0,614))
    else:
        bg = gradient(Y/1023,(246,160,60),(240,138,93))
        for angle in (12,-12,0):
            card = Image.new('RGBA',(N,N))
            cd = ImageDraw.Draw(card)
            cd.rounded_rectangle((207,142,817,938),radius=46,fill=(255,248,240,255),outline=(74,59,50,255),width=3)
            card = card.rotate(angle,Image.Resampling.BICUBIC,center=(512,760))
            bg = Image.alpha_composite(bg,card)
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

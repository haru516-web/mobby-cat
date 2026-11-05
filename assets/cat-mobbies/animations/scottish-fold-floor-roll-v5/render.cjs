// Continuous single-surface puppet animation. No crossfade or optical flow.
const sharp=require('C:/Users/harui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('path');
const fs=require('fs');
const root=__dirname,W=640,H=512,N=144;
function g(x,y,cx,cy,rx,ry){return Math.exp(-((x-cx)**2/rx**2+(y-cy)**2/ry**2)*2);}
(async()=>{
const src=await sharp(path.join(root,'base-pose.png')).resize(576,384).ensureAlpha().extend({left:32,right:32,top:64,bottom:64,background:{r:0,g:0,b:0,alpha:0}}).raw().toBuffer();
// Premultiply colors so hidden RGB cannot produce halos at transparent edges.
const rgba=new Float32Array(src.length);
for(let p=0;p<src.length;p+=4){const a=src[p+3]/255;rgba[p]=src[p]*a;rgba[p+1]=src[p+1]*a;rgba[p+2]=src[p+2]*a;rgba[p+3]=src[p+3];}
const weights=new Float32Array(W*H*7);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
let p=(y*W+x)*7;
weights[p]=g(x,y,345,200,65,62); // far front paw
weights[p+1]=g(x,y,250,320,80,85); // near front paw
weights[p+2]=g(x,y,450,210,70,75); // far hind paw
weights[p+3]=g(x,y,450,350,75,70); // near hind paw
weights[p+4]=g(x,y,547,288,70,115); // tail
weights[p+5]=g(x,y,200,220,155,160); // head
weights[p+6]=g(x,y,360,322,150,125); // breathing
}
for(let f=0;f<N;f++){
const t=f/N*2*Math.PI,s=Math.sin(t),paw=Math.sin(t-.28),hind=Math.sin(t-.55),tail=Math.sin(t-.85),head=Math.sin(t-.18);
const out=Buffer.alloc(src.length);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
const wp=(y*W+x)*7;
// Torso rocks in depth around its lower back, rather than rotating the whole portrait.
let dx=.052*s*(y-414)+3*s;
let dy=.085*s*(y-414);
dx+=weights[wp]*(-9*paw)+weights[wp+1]*(11*paw)+weights[wp+2]*(-7*hind)+weights[wp+3]*(7*hind)+weights[wp+4]*(10*tail)+weights[wp+5]*(-3*head)+weights[wp+6]*((x-360)*.014*Math.sin(2*t));
dy+=weights[wp]*(-9*paw)+weights[wp+1]*(6*paw)+weights[wp+2]*(-8*hind)+weights[wp+3]*(7*hind)+weights[wp+4]*(-12*tail)+weights[wp+5]*(3*head)+weights[wp+6]*(-2*Math.sin(2*t));
const sx=x-dx,sy=y-dy,ix=Math.floor(sx),iy=Math.floor(sy);
if(ix<0||ix>=W-1||iy<0||iy>=H-1)continue;
const fx=sx-ix,fy=sy-iy,aa=(1-fx)*(1-fy),bb=fx*(1-fy),cc=(1-fx)*fy,dd=fx*fy;
const p=(iy*W+ix)*4,q=p+4,r=p+W*4,u=r+4,o=(y*W+x)*4;
const alpha=rgba[p+3]*aa+rgba[q+3]*bb+rgba[r+3]*cc+rgba[u+3]*dd;
if(alpha<.5)continue;
out[o+3]=Math.round(alpha);
for(let c=0;c<3;c++)out[o+c]=Math.max(0,Math.min(255,Math.round((rgba[p+c]*aa+rgba[q+c]*bb+rgba[r+c]*cc+rgba[u+c]*dd)*255/alpha)));
}
await sharp(out,{raw:{width:W,height:H,channels:4}}).png().toFile(path.join(root,'frames',String(f).padStart(3,'0')+'.png'));
if(f%36===0)console.log('frame',f,'/',N);
}
// Six overview poses sampled from the continuous 144-frame cycle.
const overview=[0,24,48,72,96,120];
await sharp({create:{width:W*3,height:H*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overview.map((f,i)=>({input:path.join(root,'frames',String(f).padStart(3,'0')+'.png'),left:i%3*W,top:Math.floor(i/3)*H}))).png().toFile(path.join(root,'spritesheet-6-keyposes.png'));
const all=Array.from({length:N},(_,f)=>({input:path.join(root,'frames',String(f).padStart(3,'0')+'.png'),left:f%12*W,top:Math.floor(f/12)*H}));
await sharp({create:{width:W*12,height:H*12,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(all).png().toFile(path.join(root,'spritesheet-144.png'));
console.log('Done');
})();

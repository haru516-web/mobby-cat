const sharp=require('C:/Users/harui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('path');
const root=__dirname;
(async()=>{
const {width,height}=await sharp(path.join(root,'spritesheet.png')).metadata();
const sequence=[0,1,2,3,4,5,6,7,6,5,4,3,2,1];
const frames=[];
for(let i=0;i<8;i++){
const col=i%4,row=Math.floor(i/4),left=Math.round(col*width/4),top=Math.round(row*height/2),w=Math.round((col+1)*width/4)-left,h=Math.round((row+1)*height/2)-top;
const frame=await sharp(path.join(root,'spritesheet.png')).extract({left,top,width:w,height:h}).resize(512,512).ensureAlpha().raw().toBuffer();
// Determine support baseline from substantial opaque rows, ignoring isolated wisps.
let ymin=512,ymax=0,xmin=512,xmax=0;
for(let y=0;y<512;y++){let n=0;for(let x=0;x<512;x++)if(frame[(y*512+x)*4+3]>128)n++;if(n>15){ymin=Math.min(ymin,y);ymax=y;}}
for(let x=0;x<512;x++){let n=0;for(let y=0;y<512;y++)if(frame[(y*512+x)*4+3]>128)n++;if(n>15){xmin=Math.min(xmin,x);xmax=x;}}
const dx=Math.round(256-(xmin+xmax)/2),dy=440-ymax;
const out=Buffer.alloc(512*512*4);
for(let y=0;y<512;y++)for(let x=0;x<512;x++){const tx=x+dx,ty=y+dy;if(tx<0||tx>=512||ty<0||ty>=512)continue;frame.copy(out,(ty*512+tx)*4,(y*512+x)*4,(y*512+x)*4+4);}
const png=await sharp(out,{raw:{width:512,height:512,channels:4}}).png().toBuffer();
frames.push(png);await sharp(png).toFile(path.join(root,'frames',`pose-${i+1}.png`));
}
for(let i=0;i<sequence.length;i++)await sharp(frames[sequence[i]]).toFile(path.join(root,'frames',String(i).padStart(3,'0')+'.png'));
await sharp({create:{width:2048,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*512}))).png().toFile(path.join(root,'spritesheet-aligned.png'));
console.log('8 drawn poses, 14 playback frames; crop and placement only, no deformation or frame blending.');
})();

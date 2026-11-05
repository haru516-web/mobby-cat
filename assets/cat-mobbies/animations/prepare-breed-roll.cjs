const sharp=require('C:/Users/harui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('path'),fs=require('fs');
const [, , source, outDir]=process.argv;
if(!source||!outDir)throw Error('usage: node prepare-breed-roll.cjs source.png output-dir');
const W=512,H=512,cols=4,rows=2;
(async()=>{
fs.mkdirSync(path.join(outDir,'frames'),{recursive:true});
const meta=await sharp(source).metadata();
const cells=[];
for(let i=0;i<8;i++){
 const c=i%cols,r=Math.floor(i/cols),left=Math.round(c*meta.width/cols),top=Math.round(r*meta.height/rows),width=Math.round((c+1)*meta.width/cols)-left,height=Math.round((r+1)*meta.height/rows)-top;
 // Clip the AI sheet's thin neighboring-frame spill at cell boundaries.
 const inset=18;
 let b=await sharp(source).extract({left:left+inset,top:top+inset,width:width-2*inset,height:height-2*inset}).resize(460,460,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
 let minx=460,maxx=0,maxy=0,counts=new Uint16Array(460),colsN=new Uint16Array(460);
 for(let y=0;y<460;y++)for(let x=0;x<460;x++)if(b[(y*460+x)*4+3]>128){counts[y]++;colsN[x]++;}
 let miny=460;
 for(let y=0;y<460;y++)if(counts[y]>8){miny=Math.min(miny,y);maxy=y;}
 for(let x=0;x<460;x++)if(colsN[x]>8){minx=Math.min(minx,x);maxx=x;}
 let dx=Math.round(256-(minx+maxx)/2),dy=440-maxy;
 const out=Buffer.alloc(W*H*4);
 for(let y=0;y<460;y++)for(let x=0;x<460;x++){
   const tx=x+dx,ty=y+dy;if(tx<0||tx>=W||ty<0||ty>=H)continue;
   const si=(y*460+x)*4,di=(ty*W+tx)*4;b.copy(out,di,si,si+4);
 }
 const png=await sharp(out,{raw:{width:W,height:H,channels:4}}).png().toBuffer();cells.push(png);
 await sharp(png).toFile(path.join(outDir,'frames',`pose-${i+1}.png`));
}
const sheet=await sharp({create:{width:W*cols,height:H*rows,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells.map((input,i)=>({input,left:i%cols*W,top:Math.floor(i/cols)*H}))).png().toBuffer();
await sharp(sheet).toFile(path.join(outDir,'spritesheet-aligned.png'));
const seq=[0,1,2,3,4,5,6,7,6,5,4,3,2,1];
for(let i=0;i<seq.length;i++)await sharp(cells[seq[i]]).toFile(path.join(outDir,'frames',String(i).padStart(3,'0')+'.png'));
console.log(JSON.stringify({name:path.basename(outDir),source:meta,width:2048,height:1024,poses:8,playbackFrames:seq.length}));
})();

import '../app/tests/pure-loader.mjs';
const {CATS}=await import('../app/src/data/catalog.ts');
const {isRealCat}=await import('../app/src/core/recipes.ts');
const {guaranteedCats}=await import('../app/src/core/conditions.ts');
const {buildDay,isRareEncounter}=await import('../app/src/core/encounter.ts');
const normals=CATS.filter(isRealCat),rares=CATS.filter(c=>!isRealCat(c)&&c.kind!=='world'&&c.kind!=='travel'&&isRareEncounter(c.id));
const profiles=[{name:'はじめたばかり',normal:1,rare:0,favorites:0,pets:0,home:false,birthday:false,streak:[1,2]}, {name:'少し慣れた',normal:10,rare:0,favorites:1,pets:10,home:false,birthday:true,streak:[1,3,7]}, {name:'収集中',normal:30,rare:3,favorites:3,pets:60,home:true,birthday:true,streak:[1,3,7,14]}, {name:'長く遊んでいる',normal:60,rare:6,favorites:6,pets:150,home:true,birthday:true,streak:[1,3,7,14,30]}];
const counts=Object.fromEntries(normals.map(c=>[c.id,0]));
for(const profile of profiles){
 let seed=20261031;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const pick=xs=>xs[Math.floor(r()*xs.length)];
 const owned=Object.fromEntries([...normals.slice(0,profile.normal),...rares.slice(0,profile.rare)].map(c=>[c.id,{count:1}]));
 const ctx={owned,appearCounts:{}};let total=0,normalTotal=0,zero=0,rareTotal=0,dropped=0,same=0;let last='';
 for(let i=0;i<12000;i++){
  const date=new Date(2026,0,1+i),day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const gap=pick([1,1,1,1,1,1,1,3,7]);
  const s={steps:pick([0,500,1500,3500,6000,9000,13000]),battery:[Math.floor(r()*101)],charging:r()<0.5,streak:gap>=3?1:pick(profile.streak),openHours:[pick([6,8,11,14,17,18,21,23])],weather:pick(['sunny','sunny','sunny','sunny','cloudy','cloudy','cloudy','rain','rain','snow']),gapDays:gap,catalogUpdated:false,birthday:profile.birthday?{m:7,d:1}:null,favorites:normals.slice(0,profile.favorites).map(c=>c.id),homeConfigured:profile.home,totals:{steps:0,photos:0,pets:profile.pets,openDays:profile.normal,cats:profile.normal+profile.rare}};
  if(process.argv.includes('--multi')){s.battery.push(Math.floor(r()*101),Math.floor(r()*101));s.openHours.push(pick([6,8,11,14,17,18,21,23]));}
  if(process.argv.includes('--no-sensors'))Object.assign(s,{steps:null,battery:[],charging:false,weather:null});
  const gs=guaranteedCats(day,s,ctx),out=buildDay(day,s,ctx);
  total+=gs.length;zero+=gs.length===0;const ns=gs.filter(c=>!isRareEncounter(c.id));normalTotal+=ns.length;for(const c of ns)if(c.id in counts)counts[c.id]++;
  const rs=gs.filter(c=>isRareEncounter(c.id));rareTotal+=rs.length;dropped+=rs.filter(c=>!out.candidates.includes(c.id)).length;
  const key=ns.map(c=>c.id).sort().join('|');same+=i>0&&key===last;last=key;
 }
 console.log(JSON.stringify({profile:profile.name,days:12000,mean:total/12000,normalMean:normalTotal/12000,zeroPercent:zero/120,rareDropPercent:rareTotal?dropped/rareTotal*100:0,identicalAdjacentEligiblePercent:same/11999*100}));
}
console.log(JSON.stringify({neverEligible:Object.entries(counts).filter(([,n])=>n===0).map(([id])=>id)}));

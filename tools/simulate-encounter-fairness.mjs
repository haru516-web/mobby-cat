import '../app/tests/pure-loader.mjs';
const { CATS } = await import('../app/src/data/catalog.ts');

const { guaranteedCats } = await import('../app/src/core/conditions.ts');
const { buildDay, isRareEncounter } = await import('../app/src/core/encounter.ts');

let seed=20261031;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=(xs)=>xs[Math.floor(random()*xs.length)];
let total=0,zero=0,rare=0,dropped=0,oldDropped=0;
const profiles={};
for(let i=0;i<12000;i++){
 const date=new Date(2026,0,1+i),day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 const signals={steps:pick([0,500,1500,3500,6000,9000,13000]),battery:[Math.floor(random()*101)],charging:random()<0.5,streak:pick([1,2,3,7,14,30]),openHours:[pick([6,8,11,14,17,18,21,23])],weather:pick(['sunny','sunny','sunny','sunny','cloudy','cloudy','cloudy','rain','rain','snow']),gapDays:1,catalogUpdated:false,birthday:null};
 if(process.argv.includes('--no-sensors')) Object.assign(signals,{steps:null,battery:[],charging:false,weather:null});
 const owned=Object.fromEntries(CATS.slice(0,pick([1,10,30,60])).map(c=>[c.id,{count:1}]));
 const ctx={owned,appearCounts:{}};
 const eligible=guaranteedCats(day,signals,ctx),result=buildDay(day,signals,ctx);
 total+=eligible.length;zero+=eligible.length===0;
 const rs=eligible.filter(c=>isRareEncounter(c.id));rare+=rs.length;dropped+=rs.filter(c=>!result.candidates.includes(c.id)).length;
 oldDropped+=rs.length*Math.max(0,1-6/eligible.length);
 const p=profiles[signals.steps==null?'歩数不明':signals.steps===0?'歩数0':'歩数あり']??={days:0,total:0,zero:0};p.days++;p.total+=eligible.length;p.zero+=eligible.length===0;
}
const result={days:12000,seed:20261031,mean:total/12000,zeroPercent:zero/120,rareEligible:rare,rareDropPercent:rare?100*dropped/rare:0,uniformSixExpectedRareDropPercent:rare?100*oldDropped/rare:0,profiles};
console.log(JSON.stringify(result,null,2));

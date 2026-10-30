import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {CATS}=await import('../src/data/catalog.ts');
const {recipeOf,isRealCat,NORMAL_ATOM_BY_ID,evalAtoms}=await import('../src/core/recipes.ts');
const {guaranteedCats}=await import('../src/core/conditions.ts');
const normals=CATS.filter(isRealCat);
test('every normal cat has a unique fixed 3-4 group recipe with a changing daily condition',()=>{
 const keys=new Set();
 for(const c of normals){const atoms=recipeOf(c).atoms;assert.ok(atoms.length>=3&&atoms.length<=4);assert.equal(new Set(atoms.map(a=>a.group)).size,atoms.length);const key=atoms.map(a=>a.id).sort().join('|');assert.ok(!keys.has(key),c.id);keys.add(key);assert.ok(atoms.some(a=>['time','weather','steps','battery','moon','week','season'].includes(a.group)));}
 assert.equal(keys.size,169);
});
test('rare and limited recipes are unchanged from 8f1e5d4',()=>{
 const data=CATS.filter(c=>!isRealCat(c)).map(c=>[c.id,recipeOf(c)?.atoms.map(a=>a.id)??null,recipeOf(c)?.rarity??null]);
 assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),'16e01f11323d6fc1d6ee5935e9643532660fcab970bf793de5ffd62340b819da');
});
const e={steps:null,battery:[],charging:false,streak:1,openHours:[],weather:null,kinds:1,m:1,d:1,dow:4,holiday:true,moonAge:1,fullMoon:false,newMoon:false};
test('missing progression never grants its conditions; thresholds include the exact boundary',()=>{
 for(const id of ['favorites1','normal5','rare1','owned3','pets5','home-set','birthday-set','gap3'])assert.equal(NORMAL_ATOM_BY_ID[id].test(e),false,id);
 for(const [id,field,boundary] of [['favorites3','favorites',3],['normal15','normalKinds',15],['rare3','rareKinds',3],['pets30','pets',30],['gap3','gapDays',3]]){
  assert.equal(NORMAL_ATOM_BY_ID[id].test({...e,[field]:boundary-1}),false);assert.equal(NORMAL_ATOM_BY_ID[id].test({...e,[field]:boundary}),true);
 }
});
test('extra observations do not open every time and battery band for normals',()=>{
 assert.equal(NORMAL_ATOM_BY_ID.morning.test({...e,openHours:[21,6]}),false);
 assert.equal(NORMAL_ATOM_BY_ID.night.test({...e,openHours:[21,6]}),true);
 assert.equal(NORMAL_ATOM_BY_ID['battery-high'].test({...e,battery:[30,90]}),false);
 assert.equal(NORMAL_ATOM_BY_ID.charging.test({...e,charging:true}),true);
 assert.equal(evalAtoms([NORMAL_ATOM_BY_ID.favorites1,NORMAL_ATOM_BY_ID.sunny,NORMAL_ATOM_BY_ID.morning],{...e,favorites:1,openHours:[6],weather:'rain'}),false);
});
test('ownership thresholds count distinct species rather than duplicate cats',()=>{
 const s={steps:5000,battery:[90],charging:true,streak:7,openHours:[12],weather:'sunny',gapDays:1,catalogUpdated:false,birthday:null,favorites:[],totals:{steps:0,photos:0,pets:0,openDays:1,cats:100}};
 const a=guaranteedCats('2026-10-31',s,{owned:{[normals[0].id]:{count:100}},appearCounts:{}});
 const b=guaranteedCats('2026-10-31',s,{owned:{[normals[0].id]:{count:1}},appearCounts:{}});
 const normalOnly = (x) => normals.some(c=>c.id===x.id);
 assert.deepEqual(a.filter(normalOnly),b.filter(normalOnly));
});

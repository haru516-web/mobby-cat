import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { CATS } = await import('../src/data/catalog.ts');
const { buildDay, selectCandidates, nextEncounterMisses, isRareEncounter, encounterComposition, hasRarePresence } = await import('../src/core/encounter.ts');
const { guaranteedCats } = await import('../src/core/conditions.ts');
const { checkSaved } = await import('../src/core/saveShape.ts');
const g = ids => ids.map(id=>({id,reason:'test'}));
const normal=CATS.filter(c=>!isRareEncounter(c.id)).slice(0,10).map(c=>c.id);
const rare=CATS.filter(c=>isRareEncounter(c.id)).slice(0,8).map(c=>c.id);
const ctx={owned:{},appearCounts:{}};
test('eligible rare cats survive overflow beyond six',()=>{
 for(const n of [1,6,8]){
  const picked=selectCandidates(g([...normal,...rare.slice(0,n)]),ctx,()=>0.4).map(x=>x.id);
  assert.ok(rare.slice(0,n).every(id=>picked.includes(id)));
  assert.equal(picked.length,Math.max(6,n));assert.equal(new Set(picked).size,picked.length);
 }
});
test('one normal slot prefers unowned and falls back if all owned',()=>{
 const owned=Object.fromEntries(normal.slice(0,9).map(id=>[id,{count:1}]));
 assert.ok(selectCandidates(g(normal),{...ctx,owned},()=>0).some(x=>x.id===normal[9]));
 owned[normal[9]]={count:1};assert.equal(selectCandidates(g(normal),{...ctx,owned},()=>0).length,6);
});
test('miss weights help eligible cats only and selection is pure',()=>{
 const owned=Object.fromEntries(normal.map(id=>[id,{count:1}]));
 const c={...ctx,owned,encounterMisses:{[normal[9]]:20,[rare[0]]:20}},source=JSON.stringify(c);
 const weighted=selectCandidates(g(normal),c,()=>0.7).map(x=>x.id);
 const plain=selectCandidates(g(normal),{...c,encounterMisses:{}},()=>0.7).map(x=>x.id);
 assert.ok(weighted.includes(normal[9]));assert.ok(!plain.includes(normal[9]));assert.ok(!weighted.includes(rare[0]));assert.equal(JSON.stringify(c),source);
 assert.deepEqual(nextEncounterMisses({a:2,b:3,c:20},['a','b','c'],['b']),{a:3,c:20});
});
test('days are deterministic, eligible only, and empty when no conditions match',()=>{
 const signals={steps:6000,battery:[30,90],charging:true,streak:7,openHours:[6,14,18],weather:'sunny',gapDays:1,catalogUpdated:false,birthday:null};
 const day=buildDay('2026-10-31',signals,ctx);
 assert.equal(day.baseCount,3);assert.deepEqual(day,buildDay('2026-10-31',signals,ctx));
 const eligible=guaranteedCats('2026-10-31',signals,ctx).map(x=>x.id);
 assert.ok(day.candidates.every(id=>eligible.includes(id)));assert.ok(eligible.filter(isRareEncounter).every(id=>day.candidates.includes(id)));
 const empty=buildDay('2026-10-31',{...signals,steps:null,battery:[],charging:false,streak:0,openHours:[],weather:null},ctx);
 assert.deepEqual(empty.candidates,[]);
});
test('old records survive and new fairness metadata round trips',()=>{
 const record={candidates:[normal[0]],reasons:{[normal[0]]:'昔の理由'},baseCount:3,matatabiUsed:0,extraPicks:[]};
 assert.deepEqual(checkSaved({owned:{},days:{day:record}}).saved.days.day,record);
 const saved=checkSaved({owned:{},days:{day:{...record,eligible:[normal[0],rare[0]]}},encounterMisses:{[normal[0]]:4}});
 assert.equal(saved.repaired,false);assert.equal(saved.saved.encounterMisses[normal[0]],4);assert.deepEqual(saved.saved.days.day.eligible,[normal[0],rare[0]]);
 assert.equal(checkSaved({owned:{},encounterMisses:{cat:-1}}).repaired,true);
});
test('composition uses counts with existing rarity labels',()=>{
 assert.equal(encounterComposition([]),'なし');assert.equal(encounterComposition([normal[0],normal[1],rare[0]]),'ノーマル2/3・レア1/3');
});

test('presence covers excluded or unopened rares and stops once all are opened', () => {
 assert.equal(hasRarePresence([...normal, rare[0]], normal), true);
 assert.equal(hasRarePresence([rare[0]], [rare[0]]), false);
 assert.equal(hasRarePresence(normal, []), false);
 const world = CATS.filter(c => c.kind === 'world' || c.kind === 'travel').map(c => c.id);
 assert.ok(world.length > 0);
 assert.ok(world.every(isRareEncounter));
 assert.ok(world.every(id => selectCandidates(g([...normal, id]), ctx, () => 0.3).some(c => c.id === id)));
});

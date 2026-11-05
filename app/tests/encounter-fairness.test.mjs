import './pure-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { CATS } = await import('../src/data/catalog.ts');
const { buildDay, selectCandidates, nextEncounterMisses, isRareEncounter, encounterComposition, hasRarePresence } = await import('../src/core/encounter.ts');
const { guaranteedCats, reachedStepLines } = await import('../src/core/conditions.ts');
const { checkSaved } = await import('../src/core/saveShape.ts');
const g = ids => ids.map(id=>({id,reason:'test'}));
const normal=CATS.filter(c=>!isRareEncounter(c.id)).slice(0,10).map(c=>c.id);
const rare=CATS.filter(c=>isRareEncounter(c.id)).slice(0,8).map(c=>c.id);
const ctx={owned:{},appearCounts:{}};
test('every eligible cat becomes a candidate, with no cap and no lottery',()=>{
 for(const n of [0,1,6,8]){
  const input=[...normal,...rare.slice(0,n)];
  const picked=selectCandidates(g(input),ctx,()=>0.4).map(x=>x.id);
  assert.equal(picked.length,input.length);assert.equal(new Set(picked).size,picked.length);
  assert.ok(input.every(id=>picked.includes(id)));
 }
 const owned=Object.fromEntries(normal.map(id=>[id,{count:1}])),c={...ctx,owned,encounterMisses:{[normal[9]]:20}};
 assert.equal(selectCandidates(g(normal),c,()=>0.7).length,normal.length);
 assert.deepEqual(selectCandidates(g(normal),c,()=>0.7),selectCandidates(g(normal),c,()=>0.7));
 assert.deepEqual(nextEncounterMisses({a:2,b:3,c:20},['a','b','c'],['a','b','c']),{});
});
test('step milestones stay cumulative except zorome, which requires opening at exactly 2,222 steps',()=>{
 assert.deepEqual(reachedStepLines(4000).map(([,id])=>id),['hodohodo','lucky','chokotto','nyanpo']);
 assert.deepEqual(reachedStepLines(1000).map(([,id])=>id),['hodohodo','lucky','chokotto','nyanpo']);
 assert.deepEqual(reachedStepLines(null),[]);
 assert.deepEqual(reachedStepLines(4000,[{steps:2222,battery:40}]).map(([,id])=>id),['hodohodo','lucky','chokotto','nyanpo','zorome']);
 assert.deepEqual(reachedStepLines(null,[{steps:2222,battery:22}]).map(([,id])=>id),['zorome']);
});
test('zorome is not unlocked by a 2,222-step daily total without a matching launch',()=>{
 const base={steps:4000,battery:[],charging:true,streak:1,openHours:[8],weather:'snow',gapDays:0,catalogUpdated:false,birthday:null};
 const day='2026-01-01';
 assert.ok(!guaranteedCats(day,base,ctx).some(({id})=>id==='zorome'));
 assert.ok(guaranteedCats(day,{...base,launches:[{steps:2222,battery:22}]},ctx).some(({id})=>id==='zorome'));
});
test('kiseki requires 2,222 steps and 22% battery in the same launch sample',()=>{
 const base={steps:4000,battery:[22],charging:false,streak:3,openHours:[17],weather:'snow',gapDays:0,catalogUpdated:false,birthday:null};
 const day='2026-11-05';
 assert.ok(!guaranteedCats(day,{...base,launches:[]},ctx).some(({id})=>id==='kiseki'));
 assert.ok(!guaranteedCats(day,{...base,launches:[{steps:2222,battery:21}]},ctx).some(({id})=>id==='kiseki'));
 assert.ok(guaranteedCats(day,{...base,launches:[{steps:2222,battery:22}]},ctx).some(({id})=>id==='kiseki'));
});
test('days are deterministic, include every eligible cat, and guarantee one on empty days',()=>{
 const signals={steps:6000,battery:[30,90],charging:true,streak:7,openHours:[6,14,18],weather:'sunny',gapDays:1,catalogUpdated:false,birthday:null};
 const day=buildDay('2026-10-31',signals,ctx);
 assert.equal(day.baseCount,day.candidates.length);assert.deepEqual(day,buildDay('2026-10-31',signals,ctx));
 const eligible=guaranteedCats('2026-10-31',signals,ctx).map(x=>x.id);
 assert.ok(day.candidates.every(id=>eligible.includes(id)));assert.deepEqual([...day.candidates].sort(),[...eligible].sort());
 const empty=buildDay('2026-10-31',{...signals,steps:null,battery:[],charging:false,streak:0,openHours:[],weather:null},ctx);
  assert.equal(empty.candidates.length,1);
  assert.deepEqual(empty.candidates,guaranteedCats('2026-10-31',{...signals,steps:null,battery:[],charging:false,streak:0,openHours:[],weather:null},ctx).map(x=>x.id));
});
test('old records survive and new fairness metadata round trips',()=>{
 const record={candidates:[normal[0]],reasons:{[normal[0]]:'昔の理由'},baseCount:3,matatabiUsed:0,extraPicks:[]};
 assert.deepEqual(checkSaved({owned:{},days:{day:record}}).saved.days.day,record);
 const saved=checkSaved({owned:{},days:{day:{...record,eligible:[normal[0],rare[0]]}},encounterMisses:{[normal[0]]:4}});
 assert.equal(saved.repaired,false);assert.equal(saved.saved.encounterMisses[normal[0]],4);assert.deepEqual(saved.saved.days.day.eligible,[normal[0],rare[0]]);
 assert.equal(checkSaved({owned:{},encounterMisses:{cat:-1}}).repaired,true);
 const obs=checkSaved({owned:{},obs:{'2026-11-05':{battery:[22],charging:false,hours:[23],launches:[{steps:2222,battery:22}]}}}).saved.obs;
 assert.deepEqual(obs['2026-11-05'].launches,[{steps:2222,battery:22}]);
 const oldObs=checkSaved({owned:{},obs:{'2026-11-05':{battery:[22],charging:false,hours:[23]}}}).saved.obs;
 assert.deepEqual(oldObs['2026-11-05'].launches,[]);
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

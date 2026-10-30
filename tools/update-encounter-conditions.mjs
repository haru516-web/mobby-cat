import '../app/tests/pure-loader.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const { CATS }=await import('../app/src/data/catalog.ts');
const { recipeOf,isRealCat }=await import('../app/src/core/recipes.ts');
const before=JSON.parse(readFileSync(new URL('../docs/audit/encounter-recipes-before.json',import.meta.url)));
let changed=0;
const doc=new URL('../docs/cat-conditions.md',import.meta.url);
let text=readFileSync(doc,'utf8');
for(const cat of CATS.filter(isRealCat)){
 const atoms=recipeOf(cat).atoms;
 if(JSON.stringify(before[cat.id])!==JSON.stringify(atoms.map(a=>a.id)))changed++;
 const line=text.split(/\r?\n/).find(l=>l.startsWith('| '+cat.id+' |'));
 if(line){const cols=line.split('|');cols[3]=' ノーマル ';cols[4]=' '+atoms.map(a=>a.hard?'**'+a.label+'**':a.label).join(' / ')+' ';text=text.replace(line,cols.join('|'));}
}
writeFileSync(doc,text);
console.log({realCats:CATS.filter(isRealCat).length,changed});

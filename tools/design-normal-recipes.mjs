// 条件表を設計するときだけ実行する。アプリ実行中に条件を抽選しない。
import '../app/tests/pure-loader.mjs';
import {writeFileSync} from 'node:fs';
const {CATS}=await import('../app/src/data/catalog.ts');
const times=['morning','noon','evening','night'];
const battery=['battery-half','battery-ready','battery-high','charging','battery-middle'];
const weather=['sunny','cloudy','rain'];
const moon=['moon-growing','moon-waning'];
const steps=['steps100','steps1000','steps3000','steps5000','steps-rest','steps-walk','steps-active'];
const week=['weekday','weekend'];
const season=['spring','summer','autumn','winter'];
const themes=[
 ['散歩', [steps,weather,times]],
 ['月と暮らす', [moon,times,battery]],
 ['季節の散歩', [season,steps,battery]],
 ['お気に入りの仲間', [['favorites1','favorites3','favorites6'],weather,times]],
 ['ノーマルの仲間', [['normal5','normal15','normal30'],moon,times]],
 ['珍しい仲間', [['rare1','rare3'],battery,times]],
 ['なでる暮らし', [['pets5','pets30','pets100'],battery,times]],
 ['部屋の模様替え', [['home-set'],weather,battery]],
 ['誕生日の登録', [['birthday-set'],season,times]],
 ['起動の習慣', [['streak-first','streak-week','streak7'],battery,week]],
 ['久しぶり', [['gap3'],times,battery]],
 ['空と電池', [weather,moon,battery]],
 ['一日のリズム', [times,moon,week]],
 ['仲間との暮らし', [['owned3','owned10','owned20'],steps,times]],
];
const hash=s=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
const fourthByTheme={ 'お気に入りの仲間': moon, 'ノーマルの仲間': weather, '珍しい仲間': week, 'なでる暮らし': weather, '部屋の模様替え': moon, '誕生日の登録': battery, '仲間との暮らし': moon };
const used=new Set();
let out='// ノーマル猫の固定条件表。各行は異なる3〜4条件。設計用スクリプト: tools/design-normal-recipes.mjs\nexport const NORMAL_RECIPES: Record<string, string[]> = {\n';
let index=0;
for(const c of CATS.filter(c=>c.kind==='breed'&&!['rea-mobby','uyu-mobby'].includes(c.id)).sort((a,b)=>a.id.localeCompare(b.id))){
 const [theme,pools]=themes[index++%themes.length];
 const allPools=fourthByTheme[theme] ? [...pools, fourthByTheme[theme]] : pools;
 const options=allPools.reduce((rows,pool)=>rows.flatMap(row=>pool.map(id=>[...row,id])),[[]]).sort((a,b)=>hash(c.id+':'+a.join(':'))-hash(c.id+':'+b.join(':')));
 const ids=options.find(xs=>!used.has([...xs].sort().join('|')));if(!ids)throw Error('exhausted '+theme);used.add([...ids].sort().join('|'));
 out+=`  '${c.id}': [${ids.map(id=>`'${id}'`).join(', ')}], // ${theme}\n`;
}
out+='};\n';writeFileSync(new URL('../app/src/core/normalRecipes.ts',import.meta.url),out);

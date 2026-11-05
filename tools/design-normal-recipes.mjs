// 全ノーマルの固定レシピに、天気・時間帯とその猫ごとの条件を割り当てる。
// アプリ実行中に条件を抽選しない。ID順・固定表で決める。
import '../app/tests/pure-loader.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const { CATS } = await import('../app/src/data/catalog.ts');
const { NORMAL_RECIPES } = await import('../app/src/core/normalRecipes.ts');
const { NORMAL_ATOM_BY_ID, isRealCat, recipeOf } = await import('../app/src/core/recipes.ts');

const weather = ['sunny', 'cloudy', 'rain', 'snow'];
const times = ['time-00-06', 'time-06-12', 'time-12-18', 'time-18-24'];
const replaceableGroups = new Set(['steps', 'time', 'battery', 'week', 'season', 'moon']);
const source = readFileSync(new URL('../app/src/core/normalRecipes.ts', import.meta.url), 'utf8');
const comments = new Map([...source.matchAll(/^\s*'([^']+)':\s*\[[^\]]*\],\s*\/\/\s*(.*)$/gm)].map((match) => [match[1], match[2]]));
const cats = CATS.filter(isRealCat).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const cellCounts = new Map();
const usedRecipes = new Set();

let output = '// ノーマル猫の固定条件表。天気・時間帯に、猫ごとの条件を組み合わせる。\nexport const NORMAL_RECIPES: Record<string, string[]> = {\n';
for (const [index, cat] of cats.entries()) {
  const recipe = recipeOf(cat);
  if (!recipe) throw new Error(`Recipe missing: ${cat.id}`);
  const atoms = [...recipe.atoms];
  const replaceWith = (group) => {
    const existing = atoms.find((atom) => atom.group === group);
    if (existing) {
      atoms.splice(atoms.indexOf(existing), 1);
      return;
    }
    const remove = atoms
      .filter((atom) => replaceableGroups.has(atom.group) && atom.group !== 'weather' && atom.group !== 'time')
      .sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : 1))[0];
    if (!remove) throw new Error(`No general condition to replace with ${group}: ${cat.id}`);
    atoms.splice(atoms.indexOf(remove), 1);
  };
  replaceWith('weather');
  replaceWith('time');
  if (atoms.length > 1) {
    const remove = atoms.sort((a, b) => b.p - a.p || (a.id < b.id ? -1 : 1))[0];
    atoms.splice(atoms.indexOf(remove), 1);
  }
  const preferredPersonal = atoms[0];
  if (!preferredPersonal) throw new Error(`Personal condition missing: ${cat.id}`);
  const preferredCell = index % (weather.length * times.length);
  const cells = weather.flatMap((weatherId) => times.map((timeId) => ({ weatherId, timeId })))
    .sort((a, b) => (cellCounts.get(`${a.weatherId}|${a.timeId}`) ?? 0) - (cellCounts.get(`${b.weatherId}|${b.timeId}`) ?? 0)
      || (weather.indexOf(a.weatherId) * times.length + times.indexOf(a.timeId) - preferredCell + weather.length * times.length) % (weather.length * times.length)
      - (weather.indexOf(b.weatherId) * times.length + times.indexOf(b.timeId) - preferredCell + weather.length * times.length) % (weather.length * times.length));
  const alternatives = Object.values(NORMAL_ATOM_BY_ID)
    .filter((atom) => atom.group !== 'weather' && atom.group !== 'time')
    .sort((a, b) => Number(b.id === preferredPersonal.id) - Number(a.id === preferredPersonal.id)
      || Number(b.group === preferredPersonal.group) - Number(a.group === preferredPersonal.group)
      || Math.abs(a.p - preferredPersonal.p) - Math.abs(b.p - preferredPersonal.p)
      || (a.id < b.id ? -1 : 1));
  let selected;
  for (const personal of alternatives) {
    const cell = cells.find(({ weatherId, timeId }) => !usedRecipes.has(`${personal.id}|${weatherId}|${timeId}`));
    if (cell) {
      selected = { personal, ...cell };
      break;
    }
  }
  if (!selected) throw new Error(`Could not make a unique recipe: ${cat.id}`);
  const { personal, weatherId, timeId } = selected;
  const ids = [personal.id, weatherId, timeId];
  usedRecipes.add(ids.join('|'));
  const cellKey = `${weatherId}|${timeId}`;
  cellCounts.set(cellKey, (cellCounts.get(cellKey) ?? 0) + 1);
  output += `  '${cat.id}': [${ids.map((id) => `'${id}'`).join(', ')}], // ${comments.get(cat.id) ?? '出会いの条件'}\n`;
}
output += '};\n';
writeFileSync(new URL('../app/src/core/normalRecipes.ts', import.meta.url), output);

import '../app/tests/pure-loader.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const docUrl = new URL('../docs/cat-conditions.md', import.meta.url);
const previous = readFileSync(docUrl, 'utf8');
const { CATS } = await import('../app/src/data/catalog.ts');
const { isRealCat, recipeOf, shownRarity } = await import('../app/src/core/recipes.ts');

const signatures = new Map();
for (const line of previous.split(/\r?\n/)) {
  if (!line.startsWith('|')) continue;
  const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
  if (cells.length === 5 && cells[0] !== 'ID') signatures.set(cells[0], cells[4]);
}

const rarityName = (cat) => shownRarity(cat) >= 4 ? 'でんせつ' : shownRarity(cat) >= 3 ? 'レア' : 'ノーマル';
const row = (cat, includeSignature = false) => {
  const recipe = recipeOf(cat);
  if (!recipe) return null;
  const conditions = recipe.atoms.map((atom) => atom.hard ? `**${atom.label}**` : atom.label).join(' / ');
  return `| ${cat.id} | ${cat.name} | ${rarityName(cat)} | ${conditions} | ${includeSignature ? signatures.get(cat.id) ?? '' : ''} |`;
};
const table = (cats, includeSignature = false) => [
  '| ID | 名前 | レア度 | 簡単な条件（太字は難しい条件） | 個性の条件 |',
  '|---|---|---|---|---|',
  ...cats.map((cat) => row(cat, includeSignature)).filter(Boolean),
].join('\n');

const realCats = CATS.filter(isRealCat);
const conditionCats = CATS.filter((cat) => cat.kind === 'condition');
const seriesCats = CATS.filter((cat) => !isRealCat(cat) && cat.kind !== 'condition' && cat.kind !== 'world' && cat.kind !== 'travel');
const worldStart = previous.indexOf('## 世界の猫・旅猫');
if (worldStart < 0) throw new Error('World cat section not found in docs/cat-conditions.md');
const worldSection = previous.slice(worldStart).trimEnd();

const content = `# 全にゃこモビーの出会いの条件

条件をすべて満たした猫は、その日の候補に必ず出ます。候補の数を抽選でしぼることはありません。日付で決まる軽い条件を持つノーマルを毎日1匹用意し、候補が空の日もなくします。

実在の猫169匹は、天気・最初に記録した時間帯・猫ごとの条件を組み合わせた固定3条件です。時間帯と電池は、その出会いの1日で最初に記録した値を使います。条件の詳細とシミュレーションは [ノーマル条件の見直し](normal-conditions-redesign.md) を参照してください。表示上、実在の猫はすべてノーマルです。

## 実在の猫（${realCats.length}体）

${table(realCats)}

## 個性のある猫（条件猫）（${conditionCats.length}体）

個性の条件に加えて、下表の簡単な条件もすべて満たすと候補に出ます。

${table(conditionCats, true)}

## シリーズの猫・ふつうの個性猫（${seriesCats.length}体）

${table(seriesCats)}

${worldSection}
`;
writeFileSync(docUrl, content);

// app/assets/cat-act/<猫id>-<動作>.webp の中身から app/src/data/catAct.ts（猫ごとの動きの表）を作り直す。素材を足したら実行する。
// 使い方: node tools/build-cat-act.mjs   （そのあと node tools/build-cat-feet.mjs で影の位置の表も作り直す）
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '../app');
const KINDS = ['sleep', 'peekaboo', 'fall', 'angry', 'cover', 'hiss'];
const table = new Map();
for (const f of fs.readdirSync(path.join(app, 'assets/cat-act')).sort()) {
  const m = f.match(/^(.+)-(sleep|peekaboo|fall|angry|cover|hiss)\.webp$/);
  if (!m) continue;
  if (!table.has(m[1])) table.set(m[1], {});
  table.get(m[1])[m[2]] = f;
}
const lines = [...table.entries()].map(([id, k]) =>
  `  '${id}': { ${KINDS.filter((x) => k[x]).map((x) => `${x}: require('../../assets/cat-act/${k[x]}')`).join(', ')} },`);
const src = `// ホームの猫の動きのスプライトシート（4列×2行・8コマ。assets/cat-act/<猫id>-<動作>.webp）。
// 動作は、寝る（鼻ちょうちん）・いないいないばあ・ひっくり返る・怒る・肉球で画面を覆う・右向きに威嚇する。ここにある猫だけ、ごろごろに加えてその動きも出る。
// この表は assets/cat-act の中身から作る（tools/build-cat-act.mjs。素材を足したら作り直す）。
export type ActKind = ${KINDS.map((k) => `'${k}'`).join(' | ')};
export const CAT_ACT: Record<string, Partial<Record<ActKind, number>>> = {
${lines.join('\n')}
};
`;
fs.writeFileSync(path.join(app, 'src/data/catAct.ts'), src);
console.log(`${table.size} cats`);

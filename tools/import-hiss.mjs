// 「右向き威嚇」アニメ（output/animation-all-mobbies/<id>/hiss-right/spritesheet.png）を、
// ホームの動き用に 768×384 の WebP にして app/assets/cat-act/<id>-hiss.webp へ出す。
// 元のPNG（2048×1024、1枚3MB前後）はアプリに入れない。ブランチ codex/nyako-mobby-summer-night-assets のコミットから git show で直接読む。
// 使い方: node tools/import-hiss.mjs [コミット or ref] [--only=id1,id2]   （既定は origin/codex/nyako-mobby-summer-night-assets）
// そのあと node tools/build-cat-act.mjs と node tools/build-cat-feet.mjs を実行する。ffmpeg が必要。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const src = args.find((arg) => !arg.startsWith('--only=')) ?? 'origin/codex/nyako-mobby-summer-night-assets';
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;
const dir = 'output/animation-all-mobbies';
const out = path.join(root, 'app/assets/cat-act');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hiss-'));

// A few upstream sheets contain a pale background or a low-alpha matte around the cat.
// Clear only border-connected background pixels, independently inside each 512px frame.
const CLEANUP = {
  tsuyu: { min: 235, spread: 35 },
  mantan: { min: 235, spread: 35 },
  shikaku: { min: 225, spread: 45 },
  'british-black': { min: 225, spread: 45 },
  'kuro-neko': { alphaBelow: 230 },
  'european-burmese': { alphaBelow: 230 },
  'australian-mist': { alphaBelow: 230 },
  'country-04': { alphaBelow: 230 },
};
const CLEAR_MATTE_IDS = new Set([
  'chausie', 'peterbald', 'maine-coon-red-tabby', 'colorpoint-shorthair', 'ocicat-silver', 'skookum', 'sabi-neko',
  'country-30', 'scottish-fold', 'burmese', 'genkai', 'british-golden-shaded', 'siamese-blue-point', 'uruu',
  'neva-masquerade', 'country-01', 'birman-blue-point', 'savannah', 'british-longhair', 'mangetsu', 'tanjoubi',
  'american-curl', 'country-05', 'denchigire', 'american-curl-blue-white', 'american-shorthair-calico',
  'asian-black-smoke', 'british-lilac', 'chartreux', 'kurilian-bobtail', 'japanese-bobtail', 'shachou',
  'selkirk-rex', 'samishigari', 'lykoi', 'highlander', 'oriental-longhair', 'german-rex', 'hatsuhinode',
  'aotsuki', 'european-shorthair', 'hyakunin', 'british-bicolor', 'yukidaruma', 'maine-coon',
  'scottish-straight', 'shirokuro', 'country-10', 'napoleon',
]);

function removeConnectedBackground(png, id) {
  const rule = CLEANUP[id] ?? (CLEAR_MATTE_IDS.has(id) ? { alphaBelow: 230 } : null);
  if (!rule) return png;
  const W = 2048, CELL = 512, N = CELL * CELL;
  const rgba = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-frames:v', '1', '-vf', 'format=rgba', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {
    input: png, maxBuffer: 1 << 28,
  });
  if (rgba.length !== W * 1024 * 4) throw new Error(`${id}: unexpected PNG dimensions`);

  for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 4; fx++) {
    const x0 = fx * CELL, y0 = fy * CELL;
    const seen = new Uint8Array(N), queue = new Int32Array(N);
    let head = 0, tail = 0;
    const offset = (x, y) => ((y0 + y) * W + x0 + x) * 4;
    const candidate = (x, y) => {
      const i = offset(x, y), r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
      if (a <= 8) return false;
      if (rule.alphaBelow != null) return a < rule.alphaBelow;
      const min = Math.min(r, g, b), max = Math.max(r, g, b);
      return min >= rule.min && max - min <= rule.spread;
    };
    const seed = (x, y) => {
      const index = y * CELL + x;
      if (seen[index]) return;
      const i = offset(x, y);
      if (rgba[i + 3] <= 8 || candidate(x, y)) { seen[index] = 1; queue[tail++] = index; }
    };

    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const i = offset(x, y);
      if (x === 0 || y === 0 || x === CELL - 1 || y === CELL - 1 || rgba[i + 3] <= 8) seed(x, y);
    }
    while (head < tail) {
      const index = queue[head++], x = index % CELL, y = (index - x) / CELL;
      if (x > 0) seed(x - 1, y);
      if (x < CELL - 1) seed(x + 1, y);
      if (y > 0) seed(x, y - 1);
      if (y < CELL - 1) seed(x, y + 1);
    }
    for (let index = 0; index < N; index++) if (seen[index]) {
      const i = (y0 + Math.floor(index / CELL)) * W * 4 + (x0 + index % CELL) * 4;
      rgba[i + 3] = 0;
    }
  }

  return execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '2048x1024', '-i', 'pipe:0', '-frames:v', '1', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1'], {
    input: rgba, maxBuffer: 1 << 28,
  });
}

const ids = execFileSync('git', ['ls-tree', '--name-only', src, `${dir}/`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(Boolean).map((p) => path.posix.basename(p)).filter((n) => !n.includes('.'));

let n = 0;
for (const id of ids) {
  if (only && !only.has(id)) continue;
  const png = path.join(tmp, `${id}.png`);
  try {
    fs.writeFileSync(png, execFileSync('git', ['show', `${src}:${dir}/${id}/hiss-right/spritesheet.png`], { cwd: root, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch { continue; } // 未収録の猫
  const sourcePng = fs.readFileSync(png);
  const cleanPng = removeConnectedBackground(sourcePng, id);
  if (cleanPng !== sourcePng) fs.writeFileSync(png, cleanPng);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=768:384:flags=lanczos', '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', path.join(out, `${id}-hiss.webp`)]);
  fs.unlinkSync(png);
  n += 1;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${n}/${ids.length}`);

// 「肉球で画面を覆う」アニメ（assets/cat-mobbies/animations/paw-cover-biped-all-v1/<id>/spritesheet.png）を、
// ホームの動き用に 768×384 の WebP にして app/assets/cat-act/<id>-cover.webp へ出す。
// 元のPNG（2048×1024、1枚4MB超）はアプリに入れない。ブランチ codex/rea-mobby-paw-cover のコミットから git show で直接読む。
// 使い方: node tools/import-paw-cover.mjs [コミット or フォルダ]   （既定は origin/codex/rea-mobby-paw-cover）
// ffmpeg が必要。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = process.argv[2] ?? 'origin/codex/rea-mobby-paw-cover';
const dir = 'assets/cat-mobbies/animations/paw-cover-biped-all-v1';
const out = path.join(root, 'app/assets/cat-act');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-cover-'));

const ids = execFileSync('git', ['ls-tree', '--name-only', src, `${dir}/`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(Boolean).map((p) => path.posix.basename(p)).filter((n) => !n.includes('.'));

let n = 0;
for (const id of ids) {
  const png = path.join(tmp, `${id}.png`);
  try {
    fs.writeFileSync(png, execFileSync('git', ['show', `${src}:${dir}/${id}/spritesheet.png`], { cwd: root, maxBuffer: 1 << 28 }));
  } catch { console.warn('skip (no sheet):', id); continue; }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=768:384:flags=lanczos', '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', path.join(out, `${id}-cover.webp`)]);
  fs.unlinkSync(png);
  n += 1;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${n}/${ids.length}`);
